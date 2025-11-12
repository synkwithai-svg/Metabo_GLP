import { NextRequest, NextResponse } from "next/server";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/services/firebase";
import { db } from "@/lib/db";
import { generateAccessToken, generateRefreshToken } from "@/lib/token";
import { z } from "zod";

// Validation schema
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req) {
  try {
    // 1️⃣ Parse body
    const body = await req.json();

    const validationResult = LoginSchema.safeParse(body);
    if (!validationResult.success) {
      const firstErrorMessage =
        validationResult.error.issues[0]?.message ?? "Invalid input";

      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          error: firstErrorMessage,
        },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // 2️⃣ Sign in user with Firebase
    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("Firebase login error:", err);

      let message = "Login failed";
      let statusCode = 500;

      const code = err.code?.toString() || "";

      if (code === "auth/user-not-found") {
        message = "User not found";
        statusCode = 404;
      } else if (code === "auth/invalid-email") {
        message = "Invalid email address";
        statusCode = 400;
      } else if (code === "auth/wrong-password") {
        message = "Incorrect password";
        statusCode = 401;
      } else if (code === "auth/user-disabled") {
        message = "User account is disabled";
        statusCode = 403;
      }

      return NextResponse.json(
        {
          success: false,
          message,
        },
        { status: statusCode }
      );
    }

    const { uid } = userCredential.user;

    // 3️⃣ Fetch user from Prisma with associated devices
    const user = await db.user.findUnique({
      where: { id: uid },
      include: { devices: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User data not found" },
        { status: 404 }
      );
    }

    // 4️⃣ Determine deviceId to use for token
    let deviceIdToUse;
    if (user.devices.length > 0) {
      deviceIdToUse = user.devices[0].id;
    }

    // 5️⃣ Generate tokens using userId & deviceId
    const accessToken = await generateAccessToken(uid, deviceIdToUse);
    const refreshToken = await generateRefreshToken(uid, deviceIdToUse);

    // 6️⃣ Return tokens and user info in response
    return NextResponse.json(
      {
        success: true,
        message: "Login successful",
        data: {
          accessToken,
          refreshToken,
          user: {
            isAnonymous: user.isAnonymous,
            isOnboarded: user.isOnboarded,
            role: user.role,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

