import { NextRequest, NextResponse } from "next/server"
import { signInAnonymously } from "firebase/auth"
import { auth } from "@/lib/services/firebase"
import { db } from "@/lib/db"
import { generateAccessToken, generateRefreshToken } from "@/lib/token"

export async function POST(req) {
  try {
    const body = await req.json()
    const { deviceId, platform } = body

    // Validate input
    if (!deviceId || !platform) {
      return NextResponse.json(
        {
          success: false,
          message: "deviceId and platform are required",
          data: null,
        },
        { status: 400 },
      )
    }

    // Check if device already exists
    const existingDevice = await db.device.findUnique({
      where: { id: deviceId },
    })

    if (existingDevice) {
      return NextResponse.json(
        {
          success: false,
          message: "Device ID already exists. Device IDs must be unique.",
          data: null,
        },
        { status: 400 },
      )
    }

    // Create anonymous user in Firebase
    const userCredential = await signInAnonymously(auth)
    const firebaseUser = userCredential.user

    // Create user in database
    const user = await db.user.create({
      data: {
        id: firebaseUser.uid,
        isAnonymous: true,
      },
    })

    // Create device record linked to user
    const device = await db.device.create({
      data: {
        id: deviceId,
        userId: user.id,
        platform: platform,
        isOnboarded: false,
      },
    })

    // Generate tokens
    const accessToken = await generateAccessToken(user.id, deviceId)
    const refreshToken = await generateRefreshToken(user.id, deviceId)

    return NextResponse.json(
      {
        success: true,
        message: "Anonymous user created successfully",
        data: {
          userId: user.id,
          deviceId: device.id,
          platform: device.platform,
          accessToken,
          refreshToken,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating anonymous user:", error)

    // Handle Firebase specific errors
    if (error instanceof Error) {
      if (error.message.includes("auth/operation-not-allowed")) {
        return NextResponse.json(
          {
            success: false,
            message: "Anonymous authentication is not enabled ",
            data: null,
          },
          { status: 500 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          message: error.message,
          data: null,
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        data: null,
      },
      { status: 500 },
    )
  }
}









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