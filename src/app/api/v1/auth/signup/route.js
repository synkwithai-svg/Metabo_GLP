import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/services/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db } from "@/lib/db";

/**
 * Body expected:
 * {
 *   email: string,
 *   password: string,
 *   deviceId?: string
 * }
 */
export async function POST(req) {
    try {
        const body = await req.json();
        const { email, password, deviceId } = body;

        if (!email || !password) {
            return NextResponse.json(
                { success: false, message: "Email and password are required" },
                { status: 400 }
            );
        }
        // console.log("before  firebase")

        // 1️⃣ Register user in Firebase
        let firebaseUser;
        try {
            // console.log("inside  firebase")

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // console.log("after  firebase")
            firebaseUser = userCredential.user;
        } catch (err) {
            console.error("Registration error:", err);

            // Map Firebase error codes to readable messages
            let message = "Registration failed";
            if (err.code) {
                switch (err.code) {
                    case "auth/email-already-in-use":
                        message = "This email is already in use.";
                        break;
                    case "auth/invalid-email":
                        message = "The email address is invalid.";
                        break;
                    case "auth/weak-password":
                        message = "Password is too weak. Use at least 6 characters.";
                        break;
                    default:
                        message = err.message || "Registration failed";
                }
            }

            return NextResponse.json({ success: false, message }, { status: 400 });
        }

        // 2️⃣ Save user in Prisma
        const prismaData = {
            id: firebaseUser.uid,
            email,
            isAnonymous: false,
        };

        if (deviceId) prismaData["deviceId"] = deviceId;

        const user = await db.user.create({ data: prismaData });

        return NextResponse.json(
            { success: true, message: "User registered successfully", user },
            { status: 201 }
        );
    } catch (error) {
        console.error("Server error in registration:", error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Internal server error",
            },
            { status: 500 }
        );
    }
}
