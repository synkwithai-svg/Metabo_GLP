import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createChatCompletion } from "@/lib/getOpenAIKey";
import { getMetaboSystemPrompt } from "@/lib/metaboSystemPrompt";

export async function POST(req) {
    try {
        const userId = req.headers.get("x-user-id");
        if (!userId) {
            return NextResponse.json(
                { success: false, message: "Missing user ID" },
                { status: 400 }
            );
        }

        const { message, sessionId, deviceId } = await req.json();
        if (!message) {
            return NextResponse.json(
                { success: false, message: "Message is required" },
                { status: 400 }
            );
        }

        /* 1️⃣ Subscription */
        const activeSubscription = await db.subscription.findFirst({
            where: {
                userId,
                isActive: true,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            orderBy: { createdAt: "desc" },
        });

        /* 2️⃣ Session */
        const chatSession =
            sessionId
                ? await db.chatSession.findFirst({ where: { id: sessionId, userId } })
                : await db.chatSession.create({
                    data: {
                        userId,
                        subscriptionId: activeSubscription?.id || null,
                    },
                });

        if (!chatSession) {
            return NextResponse.json(
                { success: false, message: "Invalid session" },
                { status: 404 }
            );
        }

        /* 3️⃣ Save USER message */
        await db.chatMessage.create({
            data: {
                sessionId: chatSession.id,
                isUser: true,
                content: message,
            },
        });

        /* 4️⃣ Load history (NO DUPLICATION) */
        const history = await db.chatMessage.findMany({
            where: { sessionId: chatSession.id },
            orderBy: { createdAt: "asc" },
        });

        const userData = await db.user.findUnique({
            where: { id: userId },
            include: { coachConfig: true },
        });

        const openAIMessages = [
            {
                role: "system",
                content: getMetaboSystemPrompt(userData),
            },
            ...history.map((m) => ({
                role: m.isUser ? "user" : "assistant",
                content: m.content,
            })),
        ];

        /* 5️⃣ OpenAI */
        const completion = await createChatCompletion({
            messages: openAIMessages,
        });

        const aiMessage = completion.choices[0]?.message?.content ?? "";
        const tokensUsed = completion.usage?.total_tokens ?? 0;

        /* 6️⃣ Save AI message */
        await db.chatMessage.create({
            data: {
                sessionId: chatSession.id,
                isUser: false,
                content: aiMessage,
                tokenCount: tokensUsed,
            },
        });

        /* 7️⃣ Update session timestamp & tokens */
        await db.chatSession.update({
            where: { id: chatSession.id },
            data: {
                tokensUsed: { increment: tokensUsed },
                updatedAt: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            sessionId: chatSession.id,
            message: aiMessage,
            tokensUsed,
        });
    } catch (err) {
        console.error("AI Coach Error:", err);
        return NextResponse.json(
            { success: false, message: err.message || "AI error" },
            { status: 500 }
        );
    }
}
