import { NextRequest, NextResponse } from "next/server";
import { verifyToken, generateAccessToken } from "@/lib/token";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(req) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json(
                { success: false, message: "Authorization header missing" },
                { status: 401 }
            );
        }

        const token = authHeader.split(" ")[1];

        // 1️⃣ Verify JWT
        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.json(
                { success: false, message: "Invalid or expired token" },
                { status: 401 }
            );
        }

        // 2️⃣ Ensure it is a refresh token
        if (payload.type !== "REFRESH") {
            return NextResponse.json(
                { success: false, message: "Access token cannot be used here" },
                { status: 400 }
            );
        }

        const userId = payload.userId;
        const deviceId = payload.deviceId;

        // 3️⃣ Check if token exists in DB
        const storedToken = await db.token.findUnique({
            where: { token },
        });

        if (!storedToken) {
            return NextResponse.json(
                { success: false, message: "Token not found. Please login again." },
                { status: 401 }
            );
        }

        // 4️⃣ Check if refresh token is expired
        if (storedToken.expiresAt && new Date() > storedToken.expiresAt) {
            await db.token.deleteMany({ where: { userId } });

            return NextResponse.json(
                { success: false, message: "Token expired. Please login again." },
                { status: 401 }
            );
        }

        // 5️⃣ Delete previous access tokens for this user & device
        await db.token.deleteMany({
            where: {
                userId,
                type: "ACCESS_TOKEN",
            },
        });

        // 6️⃣ Generate new access token
        const newAccessToken = await generateAccessToken(userId, deviceId);

        // 7️⃣ Set access token as HTTP-only cookie
        const cookieStore = cookies();
        cookieStore.set({
            name: "accessToken",
            value: newAccessToken,
            httpOnly: true,
            path: "/",
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24, // 1 day
        });

        return NextResponse.json(
            {
                success: true,
                message: "New token generated",
                data: { accessToken: newAccessToken },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Refresh token error:", error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Internal server error",
            },
            { status: 500 }
        );
    }
}
