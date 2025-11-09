// import { type NextRequest, NextResponse } from "next/server";
// import { createUserWithEmailAndPassword } from "firebase/auth";
// import { auth } from "@/lib/services/firebase";
// import { db } from "@/lib/db";
// import { RegisterSchema } from "@/lib/schemas/auth.schema";
// import type { AuthResponse } from "@/lib/types/auth.types";
// import { z } from "zod";

// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json();

//     const validationResult = RegisterSchema.safeParse(body);
//     if (!validationResult.success) {
//       const firstErrorMessage =
//         validationResult.error.issues[0]?.message ?? "Invalid input";
//       return NextResponse.json<AuthResponse>(
//         {
//           success: false,
//           message: "Validation failed",
//           error: firstErrorMessage,
//         },
//         { status: 400 }
//       );
//     }

//     const { email, password, deviceId } = validationResult.data;

//     // Make deviceId mandatory
//     if (!deviceId) {
//       return NextResponse.json<AuthResponse>(
//         {
//           success: false,
//           message: "Device ID is required",
//           error: "You must provide a valid device ID",
//         },
//         { status: 400 }
//       );
//     }

//     // Check if device exists
//     const device = await db.device.findUnique({
//       where: { id: deviceId },
//     });
//     if (!device) {
//       return NextResponse.json<AuthResponse>(
//         {
//           success: false,
//           message: "Invalid device ID",
//           error: "Device not found",
//         },
//         { status: 404 }
//       );
//     }

//     // Create user in Firebase
//     const userCredential = await createUserWithEmailAndPassword(auth, email, password);
//     const { uid } = userCredential.user;

//     const now = new Date();
//     // Create user in Prisma
//     await db.user.create({
//       data: {
//         id: uid,
//         email,
//         isOnboarded: false,
//         role: "USER",
//         createdAt: now,
//         updatedAt: now,
//       },
//     });

//     // Link device to this user
//     await db.device.update({
//       where: { id: deviceId },
//       data: { userId: uid },
//     });

//     return NextResponse.json<AuthResponse>(
//       {
//         success: true,
//         message: "User registered successfully",
//         data: {
//           id: uid,
//           email,
//           isOnboarded: false,
//           role: "USER",
//           deviceId,
//         },
//       },
//       { status: 201 }
//     );
//   } catch (error: any) {
//     console.error("Registration error:", error);

//     let message = "Registration failed";
//     let statusCode = 500;

//     if (error.code === "auth/email-already-in-use") {
//       message = "Email already registered";
//       statusCode = 409;
//     } else if (error.code === "auth/weak-password") {
//       message = "Password is too weak";
//       statusCode = 400;
//     } else if (error.code === "auth/invalid-email") {
//       message = "Invalid email address";
//       statusCode = 400;
//     } else if (error instanceof z.ZodError) {
//       message = "Validation error";
//       statusCode = 400;
//     }

//     return NextResponse.json<AuthResponse>(
//       {
//         success: false,
//         message,
//         error: error.message,
//       },
//       { status: statusCode }
//     );
//   }
// }

import { type NextRequest, NextResponse } from "next/server";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/services/firebase";
import { db } from "@/lib/db";
import { RegisterSchema } from "@/lib/schemas/auth.schema";
import type { AuthResponse } from "@/lib/types/auth.types";
import { z } from "zod";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validationResult = RegisterSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code, // always exists
      }));

      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message: "Validation failed",
          error: errors, // matches AuthResponse type
        },
        { status: 400 }
      );
    }

    const { email, password, deviceId } = validationResult.data;

    // Make deviceId mandatory
    if (!deviceId) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message: "Device ID is required",
          error: "You must provide a valid device ID",
        },
        { status: 400 }
      );
    }

    // Check if device exists
    const device = await db.device.findUnique({
      where: { id: deviceId },
    });
    if (!device) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message: "Invalid device ID",
          error: "Device not found",
        },
        { status: 404 }
      );
    }

    // Create user in Firebase
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const { uid } = userCredential.user;

    const now = new Date();
    // Create user in Prisma
    await db.user.create({
      data: {
        id: uid,
        email,
        isOnboarded: false,
        role: "USER",
        createdAt: now,
        updatedAt: now,
      },
    });

    // Link device to this user
    await db.device.update({
      where: { id: deviceId },
      data: { userId: uid },
    });

    return NextResponse.json<AuthResponse>(
      {
        success: true,
        message: "User registered successfully",
        data: {
          id: uid,
          email,
          isOnboarded: false,
          role: "USER",
          deviceId,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);

    let message = "Registration failed";
    let statusCode = 500;

    if (error.code === "auth/email-already-in-use") {
      message = "Email already registered";
      statusCode = 409;
    } else if (error.code === "auth/weak-password") {
      message = "Password is too weak";
      statusCode = 400;
    } else if (error.code === "auth/invalid-email") {
      message = "Invalid email address";
      statusCode = 400;
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
