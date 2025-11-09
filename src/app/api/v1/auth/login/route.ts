import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/services/firebase";
import { db } from "@/lib/db";
import { storeAccessToken } from "@/lib/services/tokenService";
import { LoginSchema } from "@/lib/schemas/auth.schema";
import type { LoginResponse, AuthResponse } from "@/lib/types/auth.types";
import { z } from "zod";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validationResult = LoginSchema.safeParse(body);
    if (!validationResult.success) {
      const firstErrorMessage =
        validationResult.error.issues[0]?.message ?? "Invalid input";

      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message: "Validation failed",
          error: firstErrorMessage,
        },
        { status: 400 }
      );
    }

    const {
      email,
      password,
      deviceId: providedDeviceId,
    } = validationResult.data;

    // Sign in user with Firebase
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const { uid } = userCredential.user;

    // Get user from Prisma
    const user = await db.user.findUnique({
      where: { id: uid },
      include: { devices: true },
    });

    if (!user) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message: "User data not found",
        },
        { status: 404 }
      );
    }

    let deviceIdToReturn: string | undefined;

    if (providedDeviceId) {
      const device = await db.device.findUnique({
        where: { id: providedDeviceId },
      });

      if (device) {
        if (device.userId === uid) {
          // Device belongs to this user, keep it
          deviceIdToReturn = providedDeviceId;
        } else {
          // Device belongs to someone else, delete it
          await db.device.delete({ where: { id: providedDeviceId } });
          // fallback to first associated device if exists
          deviceIdToReturn = user.devices[0]?.id;
        }
      } else {
        // Provided deviceId does not exist in DB, fallback to first associated device
        deviceIdToReturn = user.devices[0]?.id;
      }
    } else {
      // No deviceId provided, use first associated device
      deviceIdToReturn = user.devices[0]?.id;
    }

    // Store access token
    const userAgent = req.headers.get("user-agent") || undefined;
    const ipAddress =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      undefined;

    const tokenData = await storeAccessToken(
      uid,
      email,
      userAgent,
      ipAddress,
      user.role
    );

    // Set access token cookie
    const cookieStore = await cookies();
    cookieStore.set("accessToken", tokenData.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400,
      path: "/",
    });

    // Prepare response
    const response: LoginResponse & { deviceId?: string } = {
      id: uid,
      email: user.email ?? "",
      isOnboarded: user.isOnboarded,
      role: user.role,
    };

    if (deviceIdToReturn) response.deviceId = deviceIdToReturn;

    return NextResponse.json<AuthResponse<typeof response>>(
      {
        success: true,
        message: "Login successful",
        data: response,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Login error:", error);

    let message = "Login failed";
    let statusCode = 500;

    if (error.code === "auth/user-not-found") {
      message = "User not found";
      statusCode = 404;
    } else if (error.code === "auth/invalid-email") {
      message = "Invalid email address";
      statusCode = 400;
    } else if (error.code === "auth/wrong-password") {
      message = "Incorrect password";
      statusCode = 401;
    } else if (error.code === "auth/user-disabled") {
      message = "User account is disabled";
      statusCode = 403;
    } else if (error instanceof z.ZodError) {
      message = "Validation error";
      statusCode = 400;
    }

    return NextResponse.json<AuthResponse>(
      {
        success: false,
        message,
        error: error.message,
      },
      { status: statusCode }
    );
  }
}
