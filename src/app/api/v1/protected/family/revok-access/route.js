import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(req) {
    try {
        const body = await req.json();
        const { familyId } = body;

        if (!familyId) {
            return NextResponse.json(
                { success: false, message: "familyId is required" },
                { status: 400 }
            );
        }

        // Find the family
        const family = await db.family.findUnique({
            where: { id: familyId },
        });

        if (!family) {
            return NextResponse.json(
                { success: false, message: "Family not found" },
                { status: 404 }
            );
        }

        // Delete the family
        await db.family.delete({
            where: { id: familyId },
        });

        return NextResponse.json({
            success: true,
            message: "Family access removed successfully",
        });
    } catch (error) {
        console.error("DELETE /remove-family error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
