import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function POST(req) {
    const invitedById = req.headers.get("x-user-id");
    if (!invitedById) {
        return NextResponse.json(
            { success: false, message: "Unauthorized: Missing user ID" },
            { status: 401 }
        );
    }

    try {
        const body = await req.json();
        const { permissions = [], expiresAt = null } = body;

        if (!Array.isArray(permissions) || permissions.length === 0) {
            return NextResponse.json(
                { success: false, message: "Permissions array is required" },
                { status: 400 }
            );
        }

        // Generate a unique token
        const token = randomBytes(16).toString("hex");

        // Create invitation
        const invitation = await db.invitation.create({
            data: {
                token,
                invitedById,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                permissions: {
                    connect: permissions.map((id) => ({ id })),
                },
            },
            include: {
                permissions: true,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Invitation created successfully",
            invitation,
        });
    } catch (error) {
        console.error("POST /invitation error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
