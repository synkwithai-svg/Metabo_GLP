import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
    try {
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid");

        if (!userId && !deviceId) {
            return NextResponse.json(
                { success: false, message: "Either userId or deviceId is required" },
                { status: 400 }
            );
        }

        // Build where condition
        const where = {};
        if (userId && deviceId) where.AND = [{ userId }, { deviceId }];
        else if (userId) where.userId = userId;
        else if (deviceId) where.deviceId = deviceId;

        // Fetch treatment
        const treatment = await db.treatment.findFirst({
            where,
            include: {
                user: true,
                device: true,
                lastInjection: true,
                onboarding: true,
            },
        });

        if (!treatment) {
            return NextResponse.json(
                { success: false, message: "Treatment not found" },
                { status: 404 }
            );
        }

        // Fetch latest injectionShot for this treatment/user/device
        const injectionShot = await db.injectionShot.findFirst({
            where: {
                OR: [
                    { onboardingId: treatment.onboardingId ?? undefined },
                    { userId: treatment.userId ?? undefined },
                    { deviceId: treatment.deviceId ?? undefined },
                ],
            },
            orderBy: { CreatedAt: "desc" },
            include: {
                medication: true, // ✅ Include medication details
            },
        });

        if (!injectionShot) {
            return NextResponse.json(
                { success: true, message: "No injection shot found", data: { treatment } },
                { status: 200 }
            );
        }

        let nextShotDate = null;
        let lastDose = null;

        if (injectionShot.isFirstDose) {
            // First dose → next = CreatedAt + often_shots
            nextShotDate = new Date(injectionShot.CreatedAt);
            nextShotDate.setDate(nextShotDate.getDate() + injectionShot.often_shots);
            lastDose = null;
        } else {
            // Not first dose → lastInjectionLog + often_shots
            if (treatment.lastInjection) {
                lastDose = treatment.lastInjection;
                nextShotDate = new Date(treatment.lastInjection.date);
                nextShotDate.setDate(nextShotDate.getDate() + injectionShot.often_shots);
            } else {
                nextShotDate = null;
            }
        }

        return NextResponse.json(
            {
                success: true,
                message: "Treatment details fetched",
                data: {
                    nextShot: {
                        nextShotDate,
                        often_shots: injectionShot.often_shots,
                        injection_device: injectionShot.injection_device,
                        current_dose: injectionShot.current_dose,
                        injectionShotId: injectionShot.id,
                        Injectionsite: injectionShot.Injectionsite ?? null,
                        medication: injectionShot.medication ?? null, // ✅ Medication details
                    },
                    lastDose,
                    currentStock: injectionShot.currentStock,
                    treatment,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching treatment details:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Error while fetching treatment details",
                error: error.message,
            },
            { status: 500 }
        );
    }
}

