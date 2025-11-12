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
        { status: 409 },
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
