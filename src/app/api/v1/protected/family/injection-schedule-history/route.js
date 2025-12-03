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

        // Build where condition for treatment
        const treatmentWhere = {};
        if (userId && deviceId) treatmentWhere.AND = [{ userId }, { deviceId }];
        else if (userId) treatmentWhere.userId = userId;
        else if (deviceId) treatmentWhere.deviceId = deviceId;

        // Fetch treatment
        const treatment = await db.treatment.findFirst({
            where: treatmentWhere,
            include: {
                user: true,
                device: true,
                onboarding: true,
                injectionShot: {
                    include: { medication: true },
                },
            },
        });

        if (!treatment) {
            return NextResponse.json(
                { success: false, message: "Treatment not found" },
                { status: 404 }
            );
        }

        // Fetch last injection log
        const lastInjection = await db.injectionLog.findFirst({
            where: {
                OR: [
                    { userId: treatment.userId ?? undefined },
                    { deviceId: treatment.deviceId ?? undefined },
                ],
            },
            orderBy: { date: "desc" },
            include: { medication: true },
        });

        // Fetch next injection from DB
        const nextInjectionShot = await db.nextInjectionShot.findFirst({
            where: {
                OR: [
                    { userId: treatment.userId ?? undefined },
                    { deviceId: treatment.deviceId ?? undefined },
                ],
            },
            orderBy: { Date: "asc" }, // fetch the nearest upcoming injection
            include: { medication: true },
        });

        return NextResponse.json(
            {
                success: true,
                message: "Treatment details fetched successfully",
                data: {
                    nextShot: nextInjectionShot
                        ? {
                            nextShotDate: nextInjectionShot.Date,
                            dose: nextInjectionShot.dose,
                            injection_device: nextInjectionShot.injection_device,
                            Injectionsite: nextInjectionShot.Injectionsite ?? null,
                            medication: nextInjectionShot.medication ?? null,
                            nextInjectionShotId: nextInjectionShot.id,
                        }
                        : null,
                    lastDose: lastInjection,
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