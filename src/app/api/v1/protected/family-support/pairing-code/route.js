import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import generateDigitCode from "@/utils/generate-code";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get("token");

        if (!token) {
            return NextResponse.json(
                { success: false, message: "Token is required" },
                { status: 400 }
            );
        }

        // Find invitation
        const invitation = await db.invitation.findUnique({
            where: { token },
        });

        if (!invitation) {
            return NextResponse.json(
                { success: false, message: "Invalid token" },
                { status: 404 }
            );
        }

        if (!invitation.consumed) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Invitation must be consumed before generating a pairing code",
                },
                { status: 400 }
            );
        }

        // Find the family created by this invitation (userId = invitedById)
        const family = await db.family.findFirst({
            where: { userId: invitation.invitedById },
        });

        if (!family) {
            return NextResponse.json(
                { success: false, message: "Family not found for this invitation" },
                { status: 404 }
            );
        }

        // Find existing pairing code for this family + user
        const existingPairingCode = await db.pairingCode.findFirst({
            where: { familyId: family.id, userId: invitation.invitedById },
        });

        if (existingPairingCode && existingPairingCode.expiresAt > new Date()) {
            // The previous code has not expired yet
            return NextResponse.json(
                {
                    success: false,
                    message: "Previous pairing code has not expired yet",
                },
                { status: 400 }
            );
        }

        // Generate a new 4-digit pairing code
        const newCode = generateDigitCode();
        const newExpiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

        if (existingPairingCode) {
            // Update expired pairing code
            await db.pairingCode.update({
                where: { id: existingPairingCode.id },
                data: {
                    code: newCode,
                    expiresAt: newExpiresAt,
                    used: false,
                },
            });
        } else {
            // Create new pairing code
            await db.pairingCode.create({
                data: {
                    code: newCode,
                    expiresAt: newExpiresAt,
                    familyId: family.id,
                    userId: invitation.invitedById,
                },
            });
        }

        return NextResponse.json({
            success: true,
            message: "Pairing code generated successfully",
            code: newCode,
        });
    } catch (error) {
        console.error("GET /generate-pairing-code error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
