import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import dayjs from "dayjs";

export async function GET(req) {
    try {
        const userId = req.headers.get("x-user-id");
        if (!userId) {
            return NextResponse.json({ error: "User ID header is required" }, { status: 400 });
        }

        const url = new URL(req.url);
        const dateParam = url.searchParams.get("date");
        const queryDate = dateParam ? dayjs(dateParam) : dayjs();

        const startOfDay = queryDate.startOf("day").toDate();
        const endOfDay = queryDate.endOf("day").toDate();

        // ---------------- MACROS ----------------
        const foodLogs = await db.FoodLogItem.findMany({
            where: { log: { userId, loggedAt: { gte: startOfDay, lte: endOfDay } } },
            include: { macros: true },
        });

        let totalMacros = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, energy: 0 };
        foodLogs.forEach(item => {
            item.macros.forEach(macro => {
                totalMacros.calories += macro.calories ?? 0;
                totalMacros.protein += macro.protein ?? 0;
                totalMacros.carbs += macro.carbs ?? 0;
                totalMacros.fat += macro.fat ?? 0;
                totalMacros.fiber += macro.fiber ?? 0;
                totalMacros.energy += macro.energy ?? 0;
            });
        });

        // ---------------- WATER ----------------
        const waterLog = await db.WaterLog.findFirst({
            where: { userId, date: { gte: startOfDay, lte: endOfDay } },
            include: { consumedWaters: true },
        });
        const totalWaterConsumed = waterLog
            ? waterLog.consumedWaters.reduce((acc, c) => acc + (c.consumedML ?? 0), 0)
            : 0;

        // ---------------- LAST INJECTION ----------------
        const lastInjection = await db.InjectionLog.findFirst({
            where: { userId, date: { gte: startOfDay, lte: endOfDay } },
            orderBy: { date: "desc" },
            include: { medication: true, device: true },
        });

        // ---------------- SIDE EFFECT ----------------
        const sideEffectLog = await db.SideEffectLog.findMany({
            where: { userId, date: { gte: startOfDay, lte: endOfDay } },
            include: { sideEffects: true },
        });

        // ---------------- WEIGHT LOG (current weight) ----------------
        const weightLog = await db.weightlog.findFirst({
            where: { userId, date: { gte: startOfDay, lte: endOfDay } },
        });

        // ---------------- GET ONBOARDING (initial + target weights) ----------------
        const onboarding = await db.onboarding.findFirst({
            where: { userId },
        });

        const weight = {
            initialWeightKg: onboarding?.current_weight_kg ?? null,
            initialWeightLb: onboarding?.current_weight_lb ?? null,
            targetWeightKg: onboarding?.weight_goal_kg ?? null,
            targetWeightLb: onboarding?.weight_goal_lb ?? null,
            currentWeightKg: weightLog?.current_weight_kg ?? null,
            currentWeightLb: weightLog?.current_weight_lb ?? null,
        };


        // ---------------- NEXT INJECTION SHOT ----------------
        const nextInjectionShot = await db.NextInjectionShot.findFirst({
            where: { userId },
            orderBy: { Date: "asc" },
            include: { medication: true, device: true },
        });

        // ---------------- DASHBOARD FEELINGS ----------------
        const dashboard = await db.dashboard.findFirst({
            where: { userId, createdAt: { gte: startOfDay, lte: endOfDay } },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({
            date: queryDate.format("YYYY-MM-DD"),
            totalMacros,
            totalWaterConsumed,
            lastInjection,
            sideEffectLog,
            // weightLog,
            weight,
            nextInjectionShot,
            dashboard,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}



export async function POST(req) {
    try {
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid") || null;
        const body = await req.json();
        const { feeling, estimatedLevel } = body;

        if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
        if (typeof feeling !== "number") return NextResponse.json({ error: "feeling must be a number" }, { status: 400 });

        const startOfToday = dayjs().startOf("day").toDate();
        const endOfToday = dayjs().endOf("day").toDate();

        let dashboard = await db.dashboard.findFirst({
            where: { userId, createdAt: { gte: startOfToday, lte: endOfToday } },
        });

        if (dashboard) {
            dashboard = await db.dashboard.update({
                where: { id: dashboard.id },
                data: {
                    feeling,
                    ...(estimatedLevel !== undefined && { estimatedLevel }),
                    deviceId: deviceId || dashboard.deviceId,
                },
            });
        } else {
            dashboard = await db.dashboard.create({
                data: { userId, deviceId, feeling, estimatedLevel },
            });
        }

        return NextResponse.json({ success: true, dashboard });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}