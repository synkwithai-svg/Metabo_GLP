// app/api/auth/family/refresh/route.js

import { NextRequest, NextResponse } from "next/server";
import { verifyToken, generateAccessToken } from "@/lib/token";
import { db } from "@/lib/db";

export async function POST(req) {
    try {
        // ------------------------------
        // 1️⃣ Verify Authorization header
        // ------------------------------
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json(
                { success: false, message: "Authorization header missing" },
                { status: 401 }
            );
        }

        const token = authHeader.split(" ")[1];

        // ------------------------------
        // 2️⃣ Verify JWT
        // ------------------------------
        const payload = await verifyToken(token);

        if (!payload) {
            return NextResponse.json(
                { success: false, message: "Invalid or expired token" },
                { status: 401 }
            );
        }

        // -----------------------------------------
        // 3️⃣ Ensure it's a FAMILY refresh token
        // -----------------------------------------
        if (payload.type !== "FAMILY_REFRESH") {
            return NextResponse.json(
                { success: false, message: "Invalid token type" },
                { status: 400 }
            );
        }

        const userId = payload.userId;
        const deviceId = payload.deviceId || null;
        const familyId = payload.familyId;

        // ------------------------------
        // 4️⃣ Check DB for stored token
        // ------------------------------
        const storedToken = await db.token.findUnique({
            where: { token },
        });

        if (!storedToken) {
            return NextResponse.json(
                { success: false, message: "Refresh token not found" },
                { status: 401 }
            );
        }

        // ----------------------------------------------
        // 5️⃣ FAMILY refresh tokens do NOT expire
        //     - If expiresAt is null → always valid
        //     - If expiresAt exists → only then check expiry
        // ----------------------------------------------
        if (storedToken.expiresAt && new Date() > storedToken.expiresAt) {
            // Remove all family refresh tokens for safety
            await db.token.deleteMany({
                where: { userId, type: "FAMILY_REFRESH_TOKEN" }
            });

            return NextResponse.json(
                { success: false, message: "Refresh token expired. Login again." },
                { status: 401 }
            );
        }

        // --------------------------------------------------
        // 6️⃣ Delete previous FAMILY_ACCESS tokens for device
        // --------------------------------------------------
        await db.token.deleteMany({
            where: {
                userId,
                type: "FAMILY_ACCESS_TOKEN"
            },
        });

        // -----------------------------------
        // 7️⃣ Generate new FAMILY access token
        // -----------------------------------
        const newAccessToken = await generateAccessToken(
            userId,
            deviceId,
            familyId
        );

        return NextResponse.json(
            {
                success: true,
                message: "Family session refreshed",
                data: {
                    accessToken: newAccessToken,
                    familyId,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Family refresh token error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
