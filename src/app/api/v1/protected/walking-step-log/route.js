import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
    try {
        const body = await req.json();
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid");
        const { NumberOfSteps } = body;

        if (!userId) {
            return NextResponse.json({ success: false, message: "userId is required" }, { status: 400 });
        }

        if (NumberOfSteps == null || NumberOfSteps < 0) {
            return NextResponse.json({ success: false, message: "NumberOfSteps must be a non-negative number" }, { status: 400 });
        }

        const user = await db.user.findUnique({ where: { id: userId } });
        if (!user) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

        let device = null;
        if (deviceId) {
            device = await db.device.findUnique({ where: { id: deviceId } });
            if (!device) return NextResponse.json({ success: false, message: "Device not found" }, { status: 404 });

            if (device.userId !== userId) {
                return NextResponse.json({ success: false, message: "Device does not belong to this user" }, { status: 403 });
            }
        }

        // Create log using default date (now)
        const walkingStepLog = await db.walkingStepsLog.create({
            data: {
                userId,
                deviceId: deviceId || null,
                NumberOfSteps,
            },
        });

        return NextResponse.json({ success: true, walkingStepLog }, { status: 201 });

    } catch (error) {
        console.error("Error creating walking step log:", error);
        return NextResponse.json(
            { success: false, message: "Error creating walking step log", error: error.message },
            { status: 500 }
        );
    }
}
