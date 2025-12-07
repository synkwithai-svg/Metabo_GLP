import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
    try {
        const body = await req.json();
        const { name, dob, token, relationship } = body;

        if (!name) {
            return NextResponse.json(
                { success: false, message: "Name is required" },
                { status: 400 }
            );
        }

        if (!dob) {
            return NextResponse.json(
                { success: false, message: "Date of birth is required" },
                { status: 400 }
            );
        }

        if (!token) {
            return NextResponse.json(
                { success: false, message: "Invitation token is required" },
                { status: 400 }
            );
        }

        // Find invitation
        const invitation = await db.invitation.findUnique({
            where: { token },
            include: { permissions: true },
        });

        if (!invitation) {
            return NextResponse.json(
                { success: false, message: "Invalid token" },
                { status: 404 }
            );
        }

        if (invitation.consumed) {
            return NextResponse.json(
                { success: false, message: "Token has already been used" },
                { status: 400 }
            );
        }

        if (invitation.expiresAt && invitation.expiresAt < new Date()) {
            return NextResponse.json(
                { success: false, message: "Token has expired" },
                { status: 400 }
            );
        }

        // Create the family with invitedById as userId
        const family = await db.family.create({
            data: {
                name,
                dob: new Date(dob),
                userId: invitation.invitedById,
                relationship,
                permissions: {
                    connect: invitation.permissions.map((p) => ({ id: p.id })),
                },
            },
            include: {
                permissions: true,
            },
        });

        // Delete the permissions from the invitation
        await db.invitation.update({
            where: { id: invitation.id },
            data: {
                permissions: {
                    set: [], // disconnect all permissions
                },
                consumed: true,
                consumedBy: invitation.invitedById,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Family created successfully and permissions assigned",
            family,
        });
    } catch (error) {
        console.error("POST /family/create-with-invitation error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
