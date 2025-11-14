import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/services/firebaseAdmin";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/token";

/**
 * Body expected:
 * {
 *   email: string,
 *   password: string
 * }
 */
export async function POST(req) {
  try {
    // 1️⃣ Check Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Authorization token missing" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];

    // 2️⃣ Verify token
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { userId, deviceId } = decoded;

    // 3️⃣ Fetch user & device from Prisma
    const user = await db.user.findUnique({ where: { id: userId } });
    const device = await db.device.findUnique({ where: { id: deviceId } });

    if (!user || !device) {
      return NextResponse.json(
        { success: false, message: "User or device not found" },
        { status: 404 }
      );
    }

    if (!user.isAnonymous) {
      return NextResponse.json(
        { success: false, message: "User already registered. Please login." },
        { status: 400 }
      );
    }

    // 4️⃣ Parse email/password from body
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    // 5️⃣ Upgrade anonymous Firebase user using Admin SDK
    try {
      await admin.auth().getUser(userId);
      await admin.auth().updateUser(userId, { email, password });
    } catch (err) {
      return NextResponse.json(
        { success: false, message: "User not found or update failed" },
        { status: 404 }
      );
    }

    // 6️⃣ Update Prisma user
    await db.user.update({
      where: { id: userId },
      data: {
        email,
        isAnonymous: false,
      },
    });

    // ✅ Return success message only
    return NextResponse.json(
      {
        success: true,
        message: "User Upgraded successfully.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error upgrading anonymous user:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
