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
                onboarding: true,
                lastInjection: {
                    include: {
                        medication: true,
                    },
                },
                injectionShot: {
                    include: {
                        medication: true,
                    },
                },
            },
        });

        if (!treatment) {
            return NextResponse.json(
                { success: false, message: "Treatment not found" },
                { status: 404 }
            );
        }

        // 🩸 If treatment.lastInjection is null, fetch manually
        let lastInjection = treatment.lastInjection;

        if (!lastInjection) {
            lastInjection = await db.injectionLog.findFirst({
                where: {
                    OR: [
                        { userId: treatment.userId ?? undefined },
                        { deviceId: treatment.deviceId ?? undefined },
                    ],
                },
                orderBy: { date: "desc" },
                include: {
                    medication: true,
                },
            });
        }

        // Fetch latest injection shot for next dose calculation
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
                medication: true,
            },
        });

        if (!injectionShot) {
            return NextResponse.json(
                {
                    success: true,
                    message: "No injection shot found",
                    data: { treatment, lastInjection },
                },
                { status: 200 }
            );
        }

        // Calculate next shot date
        let nextShotDate = null;

        if (injectionShot.isFirstDose) {
            nextShotDate = new Date(injectionShot.CreatedAt);
            nextShotDate.setDate(nextShotDate.getDate() + injectionShot.often_shots);
        } else if (lastInjection) {
            nextShotDate = new Date(lastInjection.date);
            nextShotDate.setDate(nextShotDate.getDate() + injectionShot.often_shots);
        }

        return NextResponse.json(
            {
                success: true,
                message: "Treatment details fetched successfully",
                data: {
                    nextShot: {
                        nextShotDate,
                        often_shots: injectionShot.often_shots,
                        injection_device: injectionShot.injection_device,
                        current_dose: injectionShot.current_dose,
                        injectionShotId: injectionShot.id,
                        Injectionsite: injectionShot.Injectionsite ?? null,
                        medication: injectionShot.medication ?? null,
                    },
                    lastDose: lastInjection,
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
