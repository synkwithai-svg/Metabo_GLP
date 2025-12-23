// import { NextResponse } from "next/server";
// import { db } from "@/lib/db";

// export async function GET(req) {
//     try {
//         const userId = req.headers.get("x-user-id");
//         if (!userId)
//             return NextResponse.json(
//                 { success: false, message: "Missing user ID" },
//                 { status: 400 }
//             );

//         const sessions = await db.chatSession.findMany({
//             where: { userId },
//             orderBy: { updatedAt: "desc" },
//             include: { messages: { take: 1, orderBy: { createdAt: "desc" } } },
//         });

//         return NextResponse.json({ success: true, sessions });
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

export async function GET(req) {
    try {
        const userId = req.headers.get("x-user-id");
        if (!userId) {
            return NextResponse.json(
                { success: false, message: "Missing user ID" },
                { status: 400 }
            );
        }

        const sessions = await db.chatSession.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" },
            include: {
                messages: {
                    take: 2, // 👈 get last user + last AI
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        const formattedSessions = sessions.map((session) => {
            const userMessage = session.messages.find((m) => m.isUser);
            const aiMessage = session.messages.find((m) => !m.isUser);

            return {
                sessionId: session.id,
                title: session.title,
                tokensUsed: session.tokensUsed,
                updatedAt: session.updatedAt,

                req: userMessage?.content || null,
                res: aiMessage?.content || null,
            };
        });

        return NextResponse.json({
            success: true,
            sessions: formattedSessions,
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { success: false, message: err.message },
            { status: 500 }
        );
    }
}
