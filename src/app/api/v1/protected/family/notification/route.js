import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notificationTypes } from "@/lib/enums";
import { sendPushNotification } from "@/lib/services/sendPushNotification";

export async function POST(req) {
    try {
        const body = await req.json();
        const userId = req.headers.get("x-user-id");

        if (!userId) {
            return NextResponse.json(
                { success: false, message: "x-user-id header is required" },
                { status: 400 }
            );
        }

        const { refill } = body;

        if (!refill) {
            return NextResponse.json(
                { success: false, message: "Refill boolean must be true" },
                { status: 400 }
            );
        }

        // Fetch user + FCM tokens
        const user = await db.user.findUnique({
            where: { id: userId },
            include: { fcmTokens: true },
        });

        if (!user || user.fcmTokens.length === 0) {
            return NextResponse.json(
                { success: false, message: "No FCM tokens found for user" },
                { status: 404 }
            );
        }

        // Backend-generated message
        const message = "Your injection supply is low. Please refill it today.";

        // Create notification record
        const notification = await db.notification.create({
            data: {
                type: notificationTypes.INJECTION_REFILL,
                title: "Injection Refill Reminder",
                body: message,
                recipientId: userId,
                sentAt: new Date(),
                deliveredTo: {
                    connect: user.fcmTokens.map((t) => ({ id: t.id })),
                },
            },
        });

        // Send push notification
        await sendPushNotification(
            user.fcmTokens.map((t) => t.fcmToken),
            {
                title: "Injection Refill Reminder",
                body: message,
                data: {
                    notificationId: notification.id,
                    type: notificationTypes.INJECTION_REFILL,
                },
            }
        );

        return NextResponse.json({
            success: true,
            message: "Injection refill notification sent",
            notification,
        });
    } catch (error) {
        console.error("INJECTION REFILL NOTIFICATION ERROR:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
