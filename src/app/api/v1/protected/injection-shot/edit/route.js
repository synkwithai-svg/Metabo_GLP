import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req) {
    try {
        const body = await req.json();
        
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid");

        const {
            current_dose,
            injection_device,
            often_shots,
            Injectionsite,
            currentStock,
            isFirstDose,
        } = body;

        if (!userId && !deviceId) {
            return NextResponse.json(
                { success: false, message: "Either userId or deviceId is required" },
                { status: 400 }
            );
        }

        // Find latest injectionShot for this user/device
        const injectionShot = await db.injectionShot.findFirst({
            where: {
                OR: [
                    userId ? { userId } : undefined,
                    deviceId ? { deviceId } : undefined,
                ].filter(Boolean),
            },
            orderBy: { CreatedAt: "desc" },
        });

        if (!injectionShot) {
            return NextResponse.json(
                { success: false, message: "InjectionShot not found" },
                { status: 404 }
            );
        }

        // Update fields
        const updatedInjectionShot = await db.injectionShot.update({
            where: { id: injectionShot.id },
            data: {
                current_dose: current_dose ?? injectionShot.current_dose,
                injection_device: injection_device ?? injectionShot.injection_device,
                often_shots: often_shots ?? injectionShot.often_shots,
                Injectionsite: Injectionsite ?? injectionShot.Injectionsite,
                currentStock: currentStock ?? injectionShot.currentStock,
                isFirstDose: isFirstDose ?? injectionShot.isFirstDose,
            },
        });

        return NextResponse.json(
            {
                success: true,
                message: "InjectionShot updated successfully",
                data: updatedInjectionShot,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error updating injection shot:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Error while updating injection shot",
                error: error.message,
            },
            { status: 500 }
        );
    }
}
