import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
    try {
        const body = await req.json();
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-device-id") || null;

        if (!userId) {
            return NextResponse.json(
                { success: false, message: "User ID header is required" },
                { status: 400 }
            );
        }

        const { fcmToken } = body;

        if (!fcmToken) {
            return NextResponse.json(
                { success: false, message: "FCM token is required" },
                { status: 400 }
            );
        }

        // Check if the token already exists
        const existingToken = await db.fcmToken.findUnique({
            where: { fcmToken },
        });

        let tokenRecord;

        if (existingToken) {
            // Update existing token's device or user if needed
            tokenRecord = await db.fcmToken.update({
                where: { fcmToken },
                data: {
                    userId,
                    deviceId,
                },
            });
        } else {
            // Create a new FCM token
            tokenRecord = await db.fcmToken.create({
                data: {
                    fcmToken,
                    userId,
                    deviceId,
                },
            });
        }

        return NextResponse.json({
            success: true,
            message: "FCM token saved",
            fcmToken: tokenRecord.fcmToken,
            id: tokenRecord.id,
        });
    } catch (error) {
        console.error("Error saving FCM token:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
