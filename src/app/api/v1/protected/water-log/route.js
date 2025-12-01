import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
    try {
        const body = await req.json();
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid") || null;
        const { targets } = body;

        if (!userId) {
            return NextResponse.json({ message: "User ID header is required" }, { status: 400 });
        }

        if (!targets || !Array.isArray(targets)) {
            return NextResponse.json({ message: "Provide targets array" }, { status: 400 });
        }

        // Find the latest water log for the user
        let waterLog = await db.waterLog.findFirst({
            where: { userId },
            orderBy: { date: "desc" },
        });

        if (!waterLog) {
            // Create new log with default date (now)
            waterLog = await db.waterLog.create({
                data: { userId, deviceId, targets },
            });
        } else {
            // Update latest log's targets
            waterLog = await db.waterLog.update({
                where: { id: waterLog.id },
                data: { targets },
            });
        }

        return NextResponse.json({
            success: true,
            message: "Targets updated",
            waterLog,
        });

    } catch (error) {
        console.error("Targets API Error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error", error: { name: error.name, message: error.message } },
            { status: 500 }
        );
    }
}
