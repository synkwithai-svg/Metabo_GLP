import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req) {
    const userId = req.headers.get("x-user-id");

    if (!userId) {
        return NextResponse.json(
            { success: false, message: "Unauthorized: Missing user ID" },
            { status: 401 }
        );
    }

    try {
        const body = await req.json();

        // Validate: must be an array
        if (!Array.isArray(body)) {
            return NextResponse.json(
                { success: false, message: "Expected an array of medications" },
                { status: 400 }
            );
        }

        // Attach userId to each item
        const data = body.map((item) => ({
            ...item,
            userId,
        }));

        // Use createMany for bulk insert
        const result = await db.medication.createMany({
            data,
            skipDuplicates: true, // avoids duplicate name+user conflicts
        });

        return NextResponse.json({
            success: true,
            inserted: result.count,
        });
    } catch (error) {
        console.error("Create medications error:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Internal server error",
            },
            { status: 500 }
        );
    }
}
