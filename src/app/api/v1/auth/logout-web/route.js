import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/token";
import { db } from "@/lib/db";

export async function POST() {
    try {
        const cookieStore = await cookies();

        const refreshToken = cookieStore.get("refreshToken")?.value;

        if (refreshToken) {
            const payload = await verifyToken(refreshToken);

            if (payload?.userId) {
                await db.token.deleteMany({
                    where: {
                        userId: payload.userId,
                        token: refreshToken,
                        type: "REFRESH_TOKEN",
                    },
                });
            }
        }

        // 2️⃣ Delete cookies
        cookieStore.delete("accessToken");
        cookieStore.delete("refreshToken");

        return NextResponse.json(
            { success: true, message: "Logged out successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Logout error:", error);

        return NextResponse.json(
            { success: false, message: "Logout failed" },
            { status: 500 }
        );
    }
}
