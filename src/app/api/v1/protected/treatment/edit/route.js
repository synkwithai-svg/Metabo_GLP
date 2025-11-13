import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req) {
    try {
        const body = await req.json();

        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid");

        const { treatmentNotes } = body;

        if (!treatmentNotes || !Array.isArray(treatmentNotes)) {
            return NextResponse.json(
                { success: false, message: "treatmentNotes must be an array" },
                { status: 400 }
            );
        }

        if (!userId && !deviceId) {
            return NextResponse.json(
                { success: false, message: "Either userId or deviceId is required" },
                { status: 400 }
            );
        }

        // Find latest treatment for this user/device
        const treatment = await db.treatment.findFirst({
            where: {
                OR: [
                    userId ? { userId } : undefined,
                    deviceId ? { deviceId } : undefined,
                ].filter(Boolean),
            },
            orderBy: { createdAt: "desc" },
        });

        if (!treatment) {
            return NextResponse.json(
                { success: false, message: "Treatment not found" },
                { status: 404 }
            );
        }

        // Update treatmentNotes
        const updatedTreatment = await db.treatment.update({
            where: { id: treatment.id },
            data: {
                treatmentNotes,
            },
        });

        return NextResponse.json(
            {
                success: true,
                message: "Treatment notes updated successfully",
                data: updatedTreatment,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error updating treatment notes:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Error while updating treatment notes",
                error: error.message,
            },
            { status: 500 }
        );
    }
}
