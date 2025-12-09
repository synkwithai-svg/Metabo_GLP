import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import dayjs from "dayjs";
import calculateMedicationLevel from "@/lib/calculate-mediation-level";

export async function GET(req) {
    try {
        const userId = req.headers.get("x-user-id");
        if (!userId) {
            return NextResponse.json(
                { error: "User ID header is required" },
                { status: 400 }
            );
        }

        const url = new URL(req.url);
        const dateParam = url.searchParams.get("date");
        const queryDate = dateParam ? dayjs(dateParam) : dayjs();

        const startOfDay = queryDate.startOf("day").toDate();
        const endOfDay = queryDate.endOf("day").toDate();

        const [
            foodLogs,
            waterLog,
            lastInjection,
            sideEffectLog,
            weightLog,
            onboarding,
            nextInjectionShot,
            dashboard,
            walkingStepsLogs,
            allInjections,
        ] = await Promise.all([
            db.FoodLogItem.findMany({
                where: {
                    log: {
                        userId,
                        loggedAt: { gte: startOfDay, lte: endOfDay },
                    },
                },
                select: {
                    macros: {
                        select: {
                            calories: true,
                            protein: true,
                            carbs: true,
                            fat: true,
                            fiber: true,
                            energy: true,
                        },
                    },
                },
            }),

            db.WaterLog.findFirst({
                where: { userId, date: { gte: startOfDay, lte: endOfDay } },
                select: { consumedWaters: { select: { consumedML: true } } },
            }),

            db.InjectionLog.findFirst({
                where: { userId, date: { gte: startOfDay, lte: endOfDay } },
                orderBy: { date: "desc" },
                include: { medication: true, device: true },
            }),

            db.SideEffectLog.findMany({
                where: { userId, date: { gte: startOfDay, lte: endOfDay } },
                include: { sideEffects: true },
            }),

            db.weightlog.findFirst({
                where: { userId, date: { gte: startOfDay, lte: endOfDay } },
                orderBy: { date: "desc" },
                select: {
                    current_weight_kg: true,
                    current_weight_lb: true,
                },
            }),

            db.onboarding.findFirst({
                where: { userId },
                select: {
                    current_weight_kg: true,
                    current_weight_lb: true,
                    weight_goal_kg: true,
                    weight_goal_lb: true,
                },
            }),

            db.NextInjectionShot.findFirst({
                where: { userId },
                orderBy: { Date: "asc" },
                include: { medication: true, device: true },
            }),

            db.dashboard.findFirst({
                where: { userId, createdAt: { gte: startOfDay, lte: endOfDay } },
                orderBy: { createdAt: "desc" },
            }),

            db.WalkingStepsLog.findMany({
                where: { userId, date: { gte: startOfDay, lte: endOfDay } },
                select: { NumberOfSteps: true },
            }),

            // NEW: Fetch all injections for PK calculations
            db.InjectionLog.findMany({
                where: { userId },
                orderBy: { date: "asc" },
                include: { medication: true },
            }),
        ]);

        // TOTAL MACROS
        const totalMacros = foodLogs.reduce(
            (acc, item) => {
                item.macros.forEach((macro) => {
                    acc.calories += macro.calories ?? 0;
                    acc.protein += macro.protein ?? 0;
                    acc.carbs += macro.carbs ?? 0;
                    acc.fat += macro.fat ?? 0;
                    acc.fiber += macro.fiber ?? 0;
                    acc.energy += macro.energy ?? 0;
                });
                return acc;
            },
            { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, energy: 0 }
        );

        // WATER
        const totalWaterConsumed =
            waterLog?.consumedWaters.reduce(
                (acc, c) => acc + (c.consumedML ?? 0),
                0
            ) ?? 0;

        // STEPS
        const totalSteps = walkingStepsLogs.reduce(
            (acc, log) => acc + (log.NumberOfSteps ?? 0),
            0
        );

        // WEIGHT
        const weight = {
            initialWeightKg: onboarding?.current_weight_kg ?? null,
            initialWeightLb: onboarding?.current_weight_lb ?? null,
            targetWeightKg: onboarding?.weight_goal_kg ?? null,
            targetWeightLb: onboarding?.weight_goal_lb ?? null,
            currentWeightKg: weightLog?.current_weight_kg ?? null,
            currentWeightLb: weightLog?.current_weight_lb ?? null,
        };

        // ⭐ REMAINING DAYS UNTIL NEXT INJECTION
        let remainingDaysUntilNextInjection = null;
        if (nextInjectionShot?.Date) {
            remainingDaysUntilNextInjection = dayjs(nextInjectionShot.Date)
                .startOf("day")
                .diff(dayjs().startOf("day"), "day");
        }

        // ⭐⭐ CALCULATE ESTIMATED MEDICATION LEVEL (PK MODEL)
        let estimatedMedicationLevel = 0;

        if (allInjections?.length > 0) {
            estimatedMedicationLevel = allInjections.reduce((sum, inj) => {
                return sum + calculateMedicationLevel(inj, inj.medication);
            }, 0);
        }

        return NextResponse.json({
            date: queryDate.format("YYYY-MM-DD"),
            totalMacros,
            totalWaterConsumed,
            totalSteps,
            lastInjection,
            sideEffectLog,
            weight,
            nextInjectionShot,
            remainingDaysUntilNextInjection,
            estimatedMedicationLevel: Number(estimatedMedicationLevel.toFixed(3)),
            dashboard,
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}
