import { db } from "@/lib/db";
import { NextResponse, NextRequest } from "next/server";

export async function POST(req) {
    // Get the userId from headers (set by middleware)
    const userId = req.headers.get("x-user-id");

    if (!userId) {
        return NextResponse.json(
            { success: false, message: "Unauthorized: Missing user ID" },
            { status: 401 }
        );
    }

    try {
        const body = await req.json();

        // Include userId in the data
        const medication = await db.medication.create({
            data: {
                ...body,
                userId, // attach the logged-in user's ID
            },
        });

        return NextResponse.json({ success: true, medication });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            {
                success: false,
                message: "Internal server error",
            },
            { status: 500 }
        );
    }
}
