import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // Fetch all medications
        const medications = await db.medication.findMany({
            orderBy: { createdAt: "desc" }, 
        });

        return NextResponse.json({
            success: true,
            medications,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
