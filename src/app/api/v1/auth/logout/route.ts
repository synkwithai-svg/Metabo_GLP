import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { extractTokenFromHeader } from "@/lib/utils/jwt";
import type { AuthResponse } from "@/lib/types/auth.types";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      // Find the token in DB to get the associated userId
      const accessToken = await db.accessToken.findUnique({
        where: { token },
      });

      if (accessToken) {
        const userId = accessToken.userId;

        // Delete all access tokens for this user
        await db.accessToken.deleteMany({
          where: { userId },
        });
      }
    }

    // Clear the cookie
    const cookieStore = await cookies();
    cookieStore.set("accessToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return NextResponse.json<AuthResponse>({
      success: true,
      message: "Logout successful, all sessions cleared",
    });
  } catch (error: any) {
    console.error("Logout error:", error);

    return NextResponse.json<AuthResponse>(
      {
        success: false,
        message: "Logout failed",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
