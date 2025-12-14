import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPushNotification } from "@/lib/services/sendPushNotification";

export async function POST(req) {
    try {
        const body = await req.json();
        const { name, dob, token, relationship } = body;

        if (!name || !dob || !token) {
            return NextResponse.json(
                { success: false, message: "Missing required fields" },
                { status: 400 }
            );
        }

        // 1️⃣ Validate invitation
        const invitation = await db.invitation.findUnique({
            where: { token },
            include: { permissions: true },
        });

        if (!invitation || invitation.consumed) {
            return NextResponse.json(
                { success: false, message: "Invalid or used token" },
                { status: 400 }
            );
        }

        if (invitation.expiresAt && invitation.expiresAt < new Date()) {
            return NextResponse.json(
                { success: false, message: "Token expired" },
                { status: 400 }
            );
        }

        // 2️⃣ Create family
        const family = await db.family.create({
            data: {
                name,
                dob: new Date(dob),
                relationship,
                userId: invitation.invitedById,
                permissions: {
                    connect: invitation.permissions.map(p => ({ id: p.id })),
                },
            },
        });

        // 3️⃣ Consume invitation
        await db.invitation.update({
            where: { id: invitation.id },
            data: {
                consumed: true,
                consumedBy: invitation.invitedById,
                permissions: { set: [] },
            },
        });

        // 4️⃣ Fetch user FCM tokens
        const user = await db.user.findUnique({
            where: { id: invitation.invitedById },
            include: {
                fcmTokens: true,
            },
        });

        const fcmTokens = user?.fcmTokens.map(t => t.fcmToken) ?? [];

        // 5️⃣ Create notification in DB
        const notification = await db.notification.create({
            data: {
                type: "FAMILY_CREATED",
                title: "New Family Member Added 👨‍👩‍👧",
                body: `${name} has been added to your family`,
                data: {
                    familyId: family.id,
                },
                recipientId: invitation.invitedById,
                senderFamilyId: family.id,
                deliveredTo: {
                    connect: user?.fcmTokens.map(t => ({ id: t.id })) ?? [],
                },
            },
        });

        // 6️⃣ Send FCM push
        if (fcmTokens.length > 0) {
            await sendPushNotification(fcmTokens, {
                title: notification.title,
                body: notification.body,
                data: {
                    notificationId: notification.id,
                    familyId: family.id,
                    type: "FAMILY_CREATED",
                },
            });

            // 7️⃣ Mark notification as sent
            await db.notification.update({
                where: { id: notification.id },
                data: { sentAt: new Date() },
            });
        }

        return NextResponse.json({
            success: true,
            message: "Family created, notification saved & sent",
            family,
            notification,
        });

    } catch (error) {
        console.error("Create family error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
