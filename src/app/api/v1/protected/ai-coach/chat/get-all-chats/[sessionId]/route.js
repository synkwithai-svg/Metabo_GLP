// import { NextResponse } from "next/server";
// import { db } from "@/lib/db";

// export async function GET(req, { params }) {
//     try {
//         const userId = req.headers.get("x-user-id");
//         if (!userId)
//             return NextResponse.json(
//                 { success: false, message: "Missing user ID" },
//                 { status: 400 }
//             );

//         const { sessionId } = params;
//         const session = await db.chatSession.findFirst({
//             where: { id: sessionId, userId },
//             include: { messages: { orderBy: { createdAt: "asc" } } },
//         });

//         if (!session)
//             return NextResponse.json(
//                 { success: false, message: "Session not found" },
//                 { status: 404 }
//             );

//         return NextResponse.json({ success: true, session });
//     } catch (err) {
//         console.error(err);
//         return NextResponse.json(
//             { success: false, message: err.message },
//             { status: 500 }
//         );
//     }
// }

// app/api/v1/protected/ai-coach/chat/sessions/[sessionId]/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
    req,
    { params }
) {
    try {
        const userId = req.headers.get("x-user-id");
        if (!userId) {
            return NextResponse.json(
                { success: false, message: "Missing user ID" },
                { status: 400 }
            );
        }

        // AWAIT params in Next.js 15+
        const { sessionId } = await params;

        if (!sessionId) {
            return NextResponse.json(
                { success: false, message: "Missing session ID" },
                { status: 400 }
            );
        }

        const session = await db.chatSession.findUnique({
            where: {
                id: sessionId,
                userId,
            },
            include: {
                messages: {
                    orderBy: { createdAt: "asc" },
                },
            },
        });

        if (!session) {
            return NextResponse.json(
                { success: false, message: "Session not found" },
                { status: 404 }
            );
        }

        // Group messages into req/res pairs
        const messagePairs = [];
        for (let i = 0; i < session.messages.length; i++) {
            const msg = session.messages[i];

            if (msg.isUser) {
                // This is a user message (req)
                const nextMsg = session.messages[i + 1];
                const pair = {
                    req: msg.content,
                };

                // Check if there's a corresponding assistant response
                if (nextMsg && !nextMsg.isUser) {
                    pair.res = nextMsg.content;
                    i++; // Skip the next message since we've already processed it
                }

                messagePairs.push(pair);
            }
        }

        return NextResponse.json({
            success: true,
            session: {
                id: session.id,
                title: session.title,
                tokensUsed: session.tokensUsed,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
                messages: messagePairs,
            },
        });
    } catch (err) {
        console.error("GET SESSION ERROR:", err);
        return NextResponse.json(
            { success: false, message: err.message },
            { status: 500 }
        );
    }
}