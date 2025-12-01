import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
    try {
        const body = await req.json();
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid") || null;
        const { sideEffects } = body;

        if (!userId) {
            return NextResponse.json({ message: "User ID header is required" }, { status: 400 });
        }

        if (!sideEffects || !Array.isArray(sideEffects)) {
            return NextResponse.json({ message: "Provide sideEffects array" }, { status: 400 });
        }

        const connectSideEffects = sideEffects.map((id) => ({ id }));

        // Find latest side effect log for the user
        let sideEffectLog = await db.sideEffectLog.findFirst({
            where: { userId },
            orderBy: { date: "desc" },
            include: { sideEffects: true },
        });

        if (!sideEffectLog) {
            // Create new log with default date (now)
            sideEffectLog = await db.sideEffectLog.create({
                data: {
                    userId,
                    deviceId,
                    sideEffects: { connect: connectSideEffects },
                },
                include: { sideEffects: true },
            });
        } else {
            // Update latest log's side effects
            sideEffectLog = await db.sideEffectLog.update({
                where: { id: sideEffectLog.id },
                data: {
                    sideEffects: { set: connectSideEffects },
                },
                include: { sideEffects: true },
            });
        }

        return NextResponse.json({
            success: true,
            message: "Side effects updated",
            sideEffectLog,
        });
    } catch (error) {
        console.error("Side effects API Error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error", error: { name: error.name, message: error.message } },
            { status: 500 }
        );
    }
}
