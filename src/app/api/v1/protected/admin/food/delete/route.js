import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(req) {
    const userId = req.headers.get("x-user-id"); // set by middleware
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id"); // food id

    if (!userId) {
        return NextResponse.json(
            { success: false, message: "Unauthorized: Missing user ID" },
            { status: 401 }
        );
    }

    if (!id) {
        return NextResponse.json(
            { success: false, message: "Food ID is required" },
            { status: 400 }
        );
    }

    try {
        const existingFood = await db.food.findUnique({
            where: { id },
        });

        if (!existingFood || existingFood.userId !== userId) {
            return NextResponse.json(
                { success: false, message: "Food not found or unauthorized" },
                { status: 404 }
            );
        }

        await db.food.delete({
            where: { id },
        });

        return NextResponse.json({
            success: true,
            message: "Food deleted successfully",
        });
    } catch (error) {
        console.error("Delete food error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
