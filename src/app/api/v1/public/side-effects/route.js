import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
    try {

        const sideEffects = await db.sideEffect.findMany({});

        return NextResponse.json({
            success: true,
            message: "Side effects fetched successfully",
            sideEffects,
        });
    } catch (error) {
        console.error("Side effects API Error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error", error: { name: error.name, message: error.message } },
            { status: 500 }
        );
    }
}
