import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import dayjs from "dayjs";

export async function GET(req) {
    try {
        const userId = req.headers.get("x-user-id");
        const familyId = req.headers.get("x-family-id");
        if (!userId) {
            return NextResponse.json({ error: "User ID header is required" }, { status: 400 });
        }

        const url = new URL(req.url);
        const dateParam = url.searchParams.get("date");
        const queryDate = dateParam ? dayjs(dateParam) : dayjs();

        const startOfDay = queryDate.startOf("day").toDate();
        const endOfDay = queryDate.endOf("day").toDate();

        // Execute all queries in parallel using Promise.all
        const [
            foodLogs,
            waterLog,
            lastInjection,
            sideEffectLog,
            weightLog,
            onboarding,
            nextInjectionShot,
            dashboard,
            walkingStepsLogs
        ] = await Promise.all([
            // MACROS
            db.FoodLogItem.findMany({
                where: {
                    log: {
                        userId,
                        loggedAt: { gte: startOfDay, lte: endOfDay }
                    }
                },
                select: {
                    macros: {
                        select: {
                            calories: true,
                            protein: true,
                            carbs: true,
                            fat: true,
                            fiber: true,
                            energy: true
                        }
                    }
                }
            }),

            // WATER
            db.WaterLog.findFirst({
                where: {
                    userId,
                    date: { gte: startOfDay, lte: endOfDay }
                },
                select: {
                    consumedWaters: {
                        select: {
                            consumedML: true
                        }
                    }
                }
            }),

            // LAST INJECTION
            db.InjectionLog.findFirst({
                where: {
                    userId,
                    date: { gte: startOfDay, lte: endOfDay }
                },
                orderBy: { date: "desc" },
                include: {
                    medication: true,
                    device: true
                }
            }),

            // SIDE EFFECT
            db.SideEffectLog.findMany({
                where: {
                    userId,
                    date: { gte: startOfDay, lte: endOfDay }
                },
                include: {
                    sideEffects: true
                }
            }),

            // WEIGHT LOG - most recent of the day
            db.weightlog.findFirst({
                where: {
                    userId,
                    date: { gte: startOfDay, lte: endOfDay }
                },
                orderBy: { date: "desc" }, // ensures we get the most recent
                select: {
                    current_weight_kg: true,
                    current_weight_lb: true
                }
            }),

            // ONBOARDING
            db.onboarding.findFirst({
                where: { userId },
                select: {
                    current_weight_kg: true,
                    current_weight_lb: true,
                    weight_goal_kg: true,
                    weight_goal_lb: true
                }
            }),

            // NEXT INJECTION SHOT
            db.NextInjectionShot.findFirst({
                where: { userId },
                orderBy: { Date: "asc" },
                include: {
                    medication: true,
                    device: true
                }
            }),

            // DASHBOARD
            db.dashboard.findFirst({
                where: {
                    userId,
                    createdAt: { gte: startOfDay, lte: endOfDay }
                },
                orderBy: { createdAt: "desc" }
            }),

            // WALKING STEPS LOG
            db.WalkingStepsLog.findMany({
                where: {
                    userId,
                    date: { gte: startOfDay, lte: endOfDay }
                },
                select: {
                    NumberOfSteps: true
                }
            })
        ]);

        // Calculate total macros
        const totalMacros = foodLogs.reduce((acc, item) => {
            item.macros.forEach(macro => {
                acc.calories += macro.calories ?? 0;
                acc.protein += macro.protein ?? 0;
                acc.carbs += macro.carbs ?? 0;
                acc.fat += macro.fat ?? 0;
                acc.fiber += macro.fiber ?? 0;
                acc.energy += macro.energy ?? 0;
            });
            return acc;
        }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, energy: 0 });

        // Calculate total water consumed
        const totalWaterConsumed = waterLog?.consumedWaters.reduce(
            (acc, c) => acc + (c.consumedML ?? 0),
            0
        ) ?? 0;

        // Calculate total steps
        const totalSteps = walkingStepsLogs.reduce((acc, log) => acc + (log.NumberOfSteps ?? 0), 0);

        // Build weight object
        const weight = {
            initialWeightKg: onboarding?.current_weight_kg ?? null,
            initialWeightLb: onboarding?.current_weight_lb ?? null,
            targetWeightKg: onboarding?.weight_goal_kg ?? null,
            targetWeightLb: onboarding?.weight_goal_lb ?? null,
            currentWeightKg: weightLog?.current_weight_kg ?? null,
            currentWeightLb: weightLog?.current_weight_lb ?? null,
        };

        return NextResponse.json({
            date: queryDate.format("YYYY-MM-DD"),
            totalMacros,
            totalWaterConsumed,
            totalSteps, // <-- added
            lastInjection,
            sideEffectLog,
            weight,
            nextInjectionShot,
            dashboard,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}