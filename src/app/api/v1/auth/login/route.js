import { NextRequest, NextResponse } from "next/server";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/services/firebase";
import { firebaseAdmin } from "@/lib/services/firebaseAdmin";
import { db } from "@/lib/db";
import { generateAccessToken, generateRefreshToken } from "@/lib/token";
import { z } from "zod";

// Validation schema for email/password login or Google login
const LoginSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  googleIdToken: z.string().optional(),
});

export async function POST(req) {
  try {
    const body = await req.json();

    // Validate request body
    const validationResult = LoginSchema.safeParse(body);
    if (!validationResult.success) {
      const firstErrorMessage =
        validationResult.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json(
        { success: false, message: "Validation failed", error: firstErrorMessage },
        { status: 400 }
      );
    }

    const { email, password, googleIdToken } = validationResult.data;
    let uid = null;
    let provider = null;
    let user;

    // 1️⃣ Google login flow
    if (googleIdToken) {
      try {
        const decodedToken = await firebaseAdmin.auth().verifyIdToken(googleIdToken);
        uid = decodedToken.uid;
        provider = "google";
        const googleEmail = decodedToken.email;

        if (!googleEmail) {
          return NextResponse.json(
            { success: false, message: "Google token missing email" },
            { status: 400 }
          );
        }

        // Check if user exists in DB by email
        user = await db.user.findUnique({
          where: { email: googleEmail },
          include: { devices: true },
        });

        if (user) {
          // Update provider info if not set
          if (!user.provider) {
            user = await db.user.update({
              where: { id: user.id },
              data: { provider: "google", providerUid: uid },
            });
          }
        } else {
          // Create new user for first-time Google login
          user = await db.user.create({
            data: {
              id: uid,
              email: googleEmail,
              isAnonymous: false,
              role: "USER",
              provider: "google",
              providerUid: uid,
            },
          });
        }
      } catch (err) {
        console.error("Google login error:", err);
        return NextResponse.json(
          { success: false, message: "Invalid Google token" },
          { status: 401 }
        );
      }
    }
    // 2️⃣ Email/password login flow
    else if (email && password) {
      try {
        // First check if user exists in Firebase Auth
        let userExists = false;
        try {
          await firebaseAdmin.auth().getUserByEmail(email);
          userExists = true;
        } catch (checkError) {
          const checkCode = checkError.code?.toString() || "";
          if (checkCode === "auth/user-not-found") {
            return NextResponse.json(
              { success: false, message: "User not registered. Please sign up first." },
              { status: 404 }
            );
          }
          // If other error, continue to login attempt
        }

        // Attempt login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        uid = userCredential.user.uid;
        provider = "email";

        // Check if user exists in DB
        user = await db.user.findUnique({
          where: { id: uid },
          include: { devices: true },
        });

        if (!user) {
          // Create user in DB if first-time email/password login
          user = await db.user.create({
            data: {
              id: uid,
              email: email,
              isAnonymous: false,
              role: "USER",
              provider: "email",
              providerUid: uid,
            },
          });
        }
      } catch (err) {
        console.error("Email login error:", err);

        let message = "Login failed";
        let statusCode = 500;
        const code = err.code?.toString() || "";

        // More specific error messages
        if (code === "auth/invalid-email") {
          message = "Invalid email address format";
          statusCode = 400;
        } else if (code === "auth/wrong-password") {
          message = "Incorrect password. Please try again.";
          statusCode = 401;
        } else if (code === "auth/invalid-credential") {
          message = "Incorrect password. Please try again.";
          statusCode = 401;
        } else if (code === "auth/user-disabled") {
          message = "Your account has been disabled. Please contact support.";
          statusCode = 403;
        } else if (code === "auth/too-many-requests") {
          message = "Too many failed login attempts. Please try again later.";
          statusCode = 429;
        } else if (code === "auth/network-request-failed") {
          message = "Network error. Please check your connection and try again.";
          statusCode = 503;
        }

        return NextResponse.json({ success: false, message }, { status: statusCode });
      }
    } else {
      return NextResponse.json(
        { success: false, message: "Email/password or Google ID token required" },
        { status: 400 }
      );
    }

    // 3️⃣ Determine deviceId (optional)
    const deviceIdToUse = user.devices?.[0]?.id ?? null;

    // 4️⃣ Generate tokens
    const accessToken = await generateAccessToken(uid, deviceIdToUse);
    const refreshToken = await generateRefreshToken(uid, deviceIdToUse);

    // 5️⃣ Return response
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
            provider: user.provider,
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