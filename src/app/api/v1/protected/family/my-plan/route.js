import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
    try {
        const userId = req.headers.get("x-user-id");

        if (!userId) {
            return NextResponse.json(
                { message: "User ID header is required" },
                { status: 400 }
            );
        }


        const userPlan = await db.userPlan.findUnique({
            where: { userId },
            include: {
                nextInjectionShot: true,
            },
        });

        if (!userPlan) {
            return NextResponse.json(
                { message: "User plan not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "User daily plan retrieved",
            userPlan,
        });
    } catch (error) {
        console.error("Get Plan Error:", error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}