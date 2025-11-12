import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateAccessToken, generateRefreshToken } from "@/lib/token";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const deviceId = searchParams.get("deviceId");

        if (!deviceId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "deviceId is required",
                    data: null,
                },
                { status: 400 }
            );
        }

        // ✅ Check if device exists
        const device = await db.device.findUnique({
            where: { id: deviceId },
            include: { user: true },
        });

        if (!device) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Device not found",
                    data: null,
                },
                { status: 404 }
            );
        }

        const user = device.user;

        // ✅ If user is anonymous → return tokens
        if (user?.isAnonymous) {
            const accessToken = await generateAccessToken(user.id, device.id);
            const refreshToken = await generateRefreshToken(user.id, device.id);

            return NextResponse.json(
                {
                    success: true,
                    message: "Anonymous User found",
                    data: {
                        userId: user.id,
                        deviceId: device.id,
                        platform: device.platform,
                        isAnonymous: true,
                        accessToken,
                        refreshToken,
                    },
                },
                { status: 200 }
            );
        }

        // ✅ If user is NOT anonymous
        return NextResponse.json(
            {
                success: true,
                message: " Please login to continue.",
                data: {
                    userId: user.id,
                    isAnonymous: false,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching device info:", error);

        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Internal server error",
                data: null,
            },
            { status: 500 }
        );
    }
}
