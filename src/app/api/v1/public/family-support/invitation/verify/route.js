import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const body = await req.json();
        const { token } = body;

        if (!token) {
            return NextResponse.json(
                { success: false, message: "Token is required" },
                { status: 400 }
            );
        }

        const invitation = await db.invitation.findUnique({
            where: { token },
            include: {
                permissions: true,
            },
        });

        if (!invitation) {
            return NextResponse.json(
                { success: false, message: "Invalid token" },
                { status: 404 }
            );
        }

        // Check if token is consumed
        if (invitation.consumed) {
            return NextResponse.json(
                { success: false, message: "Token has already been used" },
                { status: 400 }
            );
        }

        // Check if token is expired
        if (invitation.expiresAt && invitation.expiresAt < new Date()) {
            return NextResponse.json(
                { success: false, message: "Token has expired" },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Token is valid",

        });

    } catch (error) {
        console.error("POST /invitation/verify error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
