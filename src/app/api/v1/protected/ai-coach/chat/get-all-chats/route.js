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
                    orderBy: { createdAt: "desc" },
                    take: 10, // safety
                },
            },
        });

        const formatted = sessions.map((s) => {
            const lastUser = s.messages.find((m) => m.isUser);
            const lastAI = s.messages.find((m) => !m.isUser);

            return {
                sessionId: s.id,
                title: s.title,
                tokensUsed: s.tokensUsed,
                updatedAt: s.updatedAt,
                req: lastUser?.content ?? null,
                res: lastAI?.content ?? null,
            };
        });

        return NextResponse.json({ success: true, sessions: formatted });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { success: false, message: err.message },
            { status: 500 }
        );
    }
}
