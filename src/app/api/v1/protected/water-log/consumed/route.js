import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Convert OZ ↔ ML
const ozToMl = (oz) => oz * 29.5735;
const mlToOz = (ml) => ml / 29.5735;

export async function POST(req) {
    try {
        const body = await req.json();
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid") || null;
        const { consumedOZ, consumedML } = body;

        if (!userId) {
            return NextResponse.json({ message: "User ID header is required" }, { status: 400 });
        }

        if (!consumedOZ && !consumedML) {
            return NextResponse.json({ message: "Provide consumedOZ or consumedML" }, { status: 400 });
        }

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const endOfToday = new Date();
        endOfToday.setUTCHours(23, 59, 59, 999);

        // Check if water log exists for today
        let waterLog = await db.waterLog.findFirst({
            where: {
                userId,
                date: {
                    gte: today,
                    lte: endOfToday,
                },
            },
        });

        // Create water log if not exists
        if (!waterLog) {
            waterLog = await db.waterLog.create({
                data: {
                    userId,
                    deviceId,
                    totalConsumed: 0,
                    targets: [],
                },
            });
        }

        // Create consumed water entry
        const consumedInMl = consumedML ?? (consumedOZ ? ozToMl(consumedOZ) : 0);
        const consumedInOz = consumedOZ ?? (consumedML ? mlToOz(consumedML) : null);

        await db.consumedWater.create({
            data: {
                consumedAt: new Date(),
                consumedML: consumedInMl,
                consumedOZ: consumedInOz,
                waterLogId: waterLog.id,
            },
        });

        // Recalculate totalConsumed
        const total = await db.consumedWater.aggregate({
            _sum: { consumedML: true },
            where: { waterLogId: waterLog.id },
        });

        const finalTotal = total._sum.consumedML ?? 0;

        await db.waterLog.update({
            where: { id: waterLog.id },
            data: { totalConsumed: finalTotal },
        });

        return NextResponse.json({
            success: true,
            message: "Consumed water logged",
            consumedML: consumedInMl,
            consumedOZ: consumedInOz,
            totalConsumed: finalTotal,
        });

    } catch (error) {
        console.error("Consumed API Error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error", error: { name: error.name, message: error.message } },
            { status: 500 }
        );
    }
}





export async function GET(req) {
    try {
        const userId = req.headers.get("x-user-id");

        if (!userId) {
            return NextResponse.json({ message: "User ID header is required" }, { status: 400 });
        }

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const endOfToday = new Date();
        endOfToday.setUTCHours(23, 59, 59, 999);

        // Fetch today's water log
        const waterLog = await db.waterLog.findFirst({
            where: {
                userId,
                date: {
                    gte: today,
                    lte: endOfToday,
                },
            },
            include: {
                consumedWaters: true, // ✅ FIXED
            },
        });

        if (!waterLog) {
            return NextResponse.json({
                success: true,
                message: "No water consumed today",
                totalConsumedML: 0,
                totalConsumedOZ: 0,
                consumedHistory: [],
            });
        }

        const totalML = waterLog.totalConsumed || 0;
        const totalOZ = mlToOz(totalML);

        return NextResponse.json({
            success: true,
            message: "Water consumption for today",
            totalConsumedML: totalML,
            totalConsumedOZ: totalOZ,
            consumedHistory: waterLog.consumedWaters, // ✅ FIXED
        });

    } catch (error) {
        console.error("GET Daily Consumed API Error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error", error: { name: error.name, message: error.message } },
            { status: 500 }
        );
    }
}