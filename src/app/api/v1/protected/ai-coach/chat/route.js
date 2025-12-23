import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createChatCompletion } from "@/lib/getOpenAIKey";
import { getMetaboSystemPrompt } from "@/lib/metaboSystemPrompt";

export async function POST(req) {
    try {
        // 1. AUTH
        const userId = req.headers.get("x-user-id");
        if (!userId) {
            return NextResponse.json(
                { success: false, message: "Missing user ID" },
                { status: 400 }
            );
        }

        const body = await req.json();
        const { message, sessionId, deviceId } = body;

        if (!message) {
            return NextResponse.json(
                { success: false, message: "Message is required" },
                { status: 400 }
            );
        }

        // 2. ACTIVE SUBSCRIPTION
        const activeSubscription = await db.subscription.findFirst({
            where: {
                userId,
                isActive: true,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            orderBy: { createdAt: "desc" },
        });

        // 3. TOKEN LIMIT CHECK (APP LEVEL)
        const tokenCountRecord = await db.tokenCount.findFirst({
            where: {
                userId,
                subscriptionId: activeSubscription?.id || null,
                deviceId: deviceId || null,
            },
        });

        if (
            tokenCountRecord &&
            tokenCountRecord.limit !== null &&
            tokenCountRecord.count >= tokenCountRecord.limit
        ) {
            return NextResponse.json(
                { success: false, message: "Token limit exceeded" },
                { status: 403 }
            );
        }

        // 4. CHAT SESSION
        const chatSession = sessionId
            ? await db.chatSession.findUnique({ where: { id: sessionId } })
            : await db.chatSession.create({
                data: {
                    userId,
                    subscriptionId: activeSubscription?.id || null,
                },
            });

        if (!chatSession) {
            return NextResponse.json(
                { success: false, message: "Invalid session ID" },
                { status: 404 }
            );
        }

        // 5. SAVE USER MESSAGE
        await db.chatMessage.create({
            data: {
                sessionId: chatSession.id,
                isUser: true,
                content: message,
            },
        });

        // 6. LOAD USER CONTEXT
        const userData = await db.user.findUnique({
            where: { id: userId },
            include: {
                meals: { include: { foods: true } },
                userFoods: true,
                quickAdds: true,
                foodLogs: { include: { items: true } },
                waterLogs: { include: { consumedWaters: true } },
                weightlogs: true,
                sideEffects: true,
                sideEffectLogs: true,
                walkingStepsLogs: true,
                dashboards: true,
                heights: true,
                photos: true,
                medications: true,
                injectionLogs: true,
                nextInjectionShots: true,
                treatments: true,
                injectionShots: true,
                coachConfig: true,
            },
        });

        // 7. LOAD HISTORY
        const previousMessages = await db.chatMessage.findMany({
            where: { sessionId: chatSession.id },
            orderBy: { createdAt: "asc" },
        });

        const messages = [
            {
                role: "system",
                content: getMetaboSystemPrompt(userData),
            },
            ...previousMessages.map((m) => ({
                role: m.isUser ? "user" : "assistant",
                content: m.content,
            })),
            { role: "user", content: message },
        ];

        // 8. OPENAI (SAFE)
        const completion = await createChatCompletion({ messages });

        const aiMessage = completion.choices[0].message?.content || "";
        const tokensUsed = completion.usage?.total_tokens || 0;

        // 9. SAVE AI MESSAGE
        await db.chatMessage.create({
            data: {
                sessionId: chatSession.id,
                isUser: false,
                content: aiMessage,
                tokenCount: tokensUsed,
            },
        });

        // 10. UPDATE TOKEN COUNT
        if (tokenCountRecord) {
            await db.tokenCount.update({
                where: { id: tokenCountRecord.id },
                data: { count: { increment: tokensUsed } },
            });
        } else {
            await db.tokenCount.create({
                data: {
                    userId,
                    subscriptionId: activeSubscription?.id || null,
                    deviceId: deviceId || null,
                    count: tokensUsed,
                },
            });
        }

        return NextResponse.json({
            success: true,
            sessionId: chatSession.id,
            message: aiMessage,
            tokensUsed,
        });
    } catch (err) {
        console.error("AI Coach Error:", err);

        return NextResponse.json(
            {
                success: false,
                message:
                    err?.message ||
                    "AI service temporarily unavailable",
            },
            { status: 500 }
        );
    }
}
