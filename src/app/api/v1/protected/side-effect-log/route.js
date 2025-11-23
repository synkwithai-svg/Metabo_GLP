import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
    try {
        const body = await req.json();
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid") || null;

        if (!userId) {
            return NextResponse.json({ message: "User ID header is required" }, { status: 400 });
        }

        const { date, sideEffects } = body;

        if (!date) {
            return NextResponse.json({ message: "Date is required" }, { status: 400 });
        }

        if (!sideEffects || !Array.isArray(sideEffects)) {
            return NextResponse.json({ message: "Provide sideEffects array" }, { status: 400 });
        }

        const logDate = new Date(date);

        // Find or create side effect log
        let sideEffectLog = await db.sideEffectLog.findFirst({
            where: { userId, date: logDate },
            include: { sideEffects: true },
        });

        const connectSideEffects = sideEffects.map((id) => ({ id }));

        if (!sideEffectLog) {
            sideEffectLog = await db.sideEffectLog.create({
                data: {
                    userId,
                    deviceId,
                    date: logDate,
                    sideEffects: { connect: connectSideEffects },
                },
                include: { sideEffects: true },
            });
        } else {
            sideEffectLog = await db.sideEffectLog.update({
                where: { id: sideEffectLog.id },
                data: {
                    sideEffects: {
                        set: connectSideEffects,
                    },
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
