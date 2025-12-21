import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/token";
import { db } from "@/lib/db";
import { cookies } from 'next/headers'

export async function GET(req) {
    try {
        const cookieStore = await cookies();
        const accessTokenCookie = cookieStore.get("accessToken");

        if (!accessTokenCookie?.value) {
            return NextResponse.json(
                { success: false, message: "Not authenticated" },
                { status: 401 }
            );
        }

        // Verify JWT token
        let decoded;
        try {
            decoded = await verifyToken(accessTokenCookie.value);
        } catch (err) {
            return NextResponse.json(
                { success: false, message: "Invalid or expired token" },
                { status: 401 }
            );
        }

        // Use userId from your token
        const userId = decoded.userId;

        // Fetch user from DB
        const user = await db.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isAnonymous: true,
                isOnboarded: true,
                provider: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, message: "User not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: { user },
        });
    } catch (error) {
        console.error("Auth/me error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
