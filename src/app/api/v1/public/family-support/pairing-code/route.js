import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateAccessToken, generateRefreshToken } from "@/lib/token";

import { notificationTypes } from "@/lib/enums";
import { sendPushNotification } from "@/lib/services/sendPushNotification";

export async function POST(req) {
    try {
        const body = await req.json();
        const { code } = body;

        if (!code) {
            return NextResponse.json(
                { success: false, message: "Pairing code is required" },
                { status: 400 }
            );
        }

        // Find pairing code
        const pairing = await db.pairingCode.findFirst({
            where: { code },
            include: { family: true },
        });

        if (!pairing) {
            return NextResponse.json(
                { success: false, message: "Invalid pairing code" },
                { status: 404 }
            );
        }

        if (pairing.used) {
            return NextResponse.json(
                { success: false, message: "Pairing code has already been used" },
                { status: 400 }
            );
        }

        if (pairing.expiresAt < new Date()) {
            return NextResponse.json(
                { success: false, message: "Pairing code has expired" },
                { status: 400 }
            );
        }

        const familyId = pairing.familyId;
        const invitedById = pairing.userId;

        // Get inviter deviceId
        const device = await db.device.findFirst({
            where: { userId: invitedById },
            orderBy: { createdAt: "desc" },
            select: { id: true },
        });
        const deviceId = device?.id || null;

        // Mark family as accepted
        await db.family.update({
            where: { id: familyId },
            data: { accepted: true },
        });

        // Generate tokens
        const accessToken = await generateAccessToken(invitedById, deviceId, familyId);
        const refreshToken = await generateRefreshToken(invitedById, deviceId, familyId);

        // --------------------------------------------------
        // 🔔 SILENT PUSH NOTIFICATION TO INVITER
        // --------------------------------------------------

        // Find recipient user + tokens
        const inviter = await db.user.findUnique({
            where: { id: invitedById },
            include: { fcmTokens: true },
        });

        if (inviter && inviter.fcmTokens.length > 0) {

            // Create notification record
            const notification = await db.notification.create({
                data: {
                    type: notificationTypes.FAMILY_PAIRING_ACCEPTED,
                    title: "Family Pairing Successful",
                    body: "Your family pairing request has been accepted.",
                    recipientId: invitedById,
                    senderFamilyId: familyId,
                    deliveredTo: {
                        connect: inviter.fcmTokens.map((tk) => ({ id: tk.id })),
                    },
                },
            });

            const fcmTokens = inviter.fcmTokens.map((t) => t.fcmToken);

            // Send *silent* push
            await sendPushNotification(fcmTokens, {
                title: "Family Pairing Successful",
                body: "Your family pairing request has been accepted.",
                data: {
                    type: notificationTypes.FAMILY_PAIRING_ACCEPTED,
                    notificationId: notification.id,
                    familyId,
                },
            });
        }

        return NextResponse.json({
            success: true,
            message: "Pairing verified successfully",
            data: {
                accessToken,
                refreshToken,
                familyId,
            },
        });

    } catch (error) {
        console.error("POST /verify-pairing-code error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
