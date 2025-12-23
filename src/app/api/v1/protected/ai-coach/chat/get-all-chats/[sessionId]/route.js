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

        const { sessionId } = params;

        const session = await db.chatSession.findFirst({
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

        // 🔁 Normalize messages into req / res
        const messages = session.messages.map((msg) => ({
            id: msg.id,
            type: msg.isUser ? "req" : "res",
            content: msg.content,
            tokenCount: msg.tokenCount,
            createdAt: msg.createdAt,
        }));

        return NextResponse.json({
            success: true,
            session: {
                id: session.id,
                title: session.title,
                tokensUsed: session.tokensUsed,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
                messages,
            },
        });
    } catch (err) {
        console.error("GET SESSION ERROR:", err);
        return NextResponse.json(
            { success: false, message: err.message || "Internal server error" },
            { status: 500 }
        );
    }
}
