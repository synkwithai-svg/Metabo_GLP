import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // Fetch all medications
        const data = await db.medication.findMany({
            orderBy: { createdAt: "desc" }, 
        });

        return NextResponse.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
