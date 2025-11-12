import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(req) {
    const userId = req.headers.get("x-user-id"); // Set by middleware
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id"); // Get medication id from query

    if (!userId) {
        return NextResponse.json(
            { success: false, message: "Unauthorized: Missing user ID" },
            { status: 401 }
        );
    }

    if (!id) {
        return NextResponse.json(
            { success: false, message: "Medication ID is required" },
            { status: 400 }
        );
    }

    try {
        const existingMedication = await db.medication.findUnique({
            where: { id },
        });

        if (!existingMedication || existingMedication.userId !== userId) {
            return NextResponse.json(
                { success: false, message: "Medication not found or unauthorized" },
                { status: 404 }
            );
        }

        await db.medication.delete({
            where: { id },
        });

        return NextResponse.json({ success: true, message: "Medication deleted" });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
