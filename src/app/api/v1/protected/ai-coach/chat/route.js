import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOpenAIClient } from "@/lib/getOpenAIKey";
import { getMetaboSystemPrompt } from "@/lib/metaboSystemPrompt";

export async function POST(req) {
    try {
        // 1. AUTH / USER VALIDATION
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

        // 2. GET ACTIVE SUBSCRIPTION
        const activeSubscription = await db.subscription.findFirst({
            where: {
                userId,
                isActive: true,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            orderBy: { createdAt: "desc" },
        });

        // 3. TOKEN LIMIT CHECK
        let tokenCountRecord = await db.tokenCount.findFirst({
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
                {
                    success: false,
                    message: "Token limit exceeded for this subscription",
                },
                { status: 403 }
            );
        }

        // 4. GET OR CREATE CHAT SESSION
        let chatSession = sessionId
            ? await db.chatSession.findUnique({ where: { id: sessionId } })
            : await db.chatSession.create({
                data: { userId, subscriptionId: activeSubscription?.id || null },
            });

        if (!chatSession) {
            return NextResponse.json(
                { success: false, message: "Invalid session ID" },
                { status: 404 }
            );
        }

        // 5. SAVE USER MESSAGE
        await db.chatMessage.create({
            data: { sessionId: chatSession.id, isUser: true, content: message },
        });

        // 6. LOAD USER DATA FOR CONTEXT
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

        // 7. LOAD PREVIOUS MESSAGES
        const previousMessages = await db.chatMessage.findMany({
            where: { sessionId: chatSession.id },
            orderBy: { createdAt: "asc" },
        });

        const conversationHistory = previousMessages.map((msg) => ({
            role: msg.isUser ? "user" : "assistant",
            content: msg.content,
        }));

        // 8. SYSTEM PROMPT (imported)
        const systemPrompt = getMetaboSystemPrompt(userData);

        // 9. OPENAI CALL
        const openai = await getOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                ...conversationHistory,
                { role: "user", content: message },
            ],
        });

        const aiMessage = completion.choices[0].message?.content || "";
        const tokensUsed = completion.usage?.total_tokens || 0;

        // 10. SAVE AI MESSAGE
        await db.chatMessage.create({
            data: {
                sessionId: chatSession.id,
                isUser: false,
                content: aiMessage,
                tokenCount: tokensUsed,
            },
        });

        // 11. UPDATE TOKEN COUNT
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

        // 12. RESPONSE
        return NextResponse.json({
            success: true,
            sessionId: chatSession.id,
            message: aiMessage,
            tokensUsed,
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { success: false, message: err.message || "Server error" },
            { status: 500 }
        );
    }
}
