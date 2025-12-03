import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
    try {
        const permissions = await db.permission.findMany({});

        return NextResponse.json({
            success: true,
            message: "Permissions Fetched Successfully",
            permissions,
        });
    } catch (error) {
        console.error("GET /permissions error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
