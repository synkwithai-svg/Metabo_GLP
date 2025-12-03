import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateAccessToken, generateRefreshToken } from "@/lib/token";

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

        // Find the pairing code
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

        const device = await db.device.findFirst({
            where: { userId: invitedById },
            orderBy: { createdAt: "desc" },
            select: { id: true },
        });
        const deviceId = device?.id || null;


        // Update the family as accepted
        await db.family.update({
            where: { id: familyId },
            data: { accepted: true },
        });

        // // Delete all invitations of the user (invitedById)
        // await db.invitation.deleteMany({
        //     where: { invitedById },
        // });

        // // Delete the pairing code
        // await db.pairingCode.delete({
        //     where: { id: pairing.id },
        // });

        // ------------------------------
        // GENERATE FAMILY TOKENS
        // ------------------------------
        const accessToken = await generateAccessToken(invitedById, deviceId, familyId);
        const refreshToken = await generateRefreshToken(invitedById, deviceId, familyId);

        return NextResponse.json({
            success: true,
            message: "Pairing verified successfully",
            data: {
                accessToken,
                refreshToken,
                familyId
            }
        });

    } catch (error) {
        console.error("POST /verify-pairing-code error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
