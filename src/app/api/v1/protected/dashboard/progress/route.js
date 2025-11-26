import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startOfDay, subDays } from "date-fns";

export async function GET(req) {
    try {
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid") || undefined;

        if (!userId) {
            return NextResponse.json(
                { message: "User ID header is required" },
                { status: 400 }
            );
        }

        // -------------------------------
        // GET ONBOARDING (starting data)
        // -------------------------------
        const onboarding = await db.onboarding.findFirst({
            where: { userId },
            select: {
                createdAt: true,
                current_weight_kg: true,
                weight_goal_kg: true,
                height_cm: true,
                height_ft: true,
                height_in: true,
            },
            orderBy: { createdAt: "asc" },
        });

        if (!onboarding) {
            return NextResponse.json(
                { message: "Onboarding data not found for user" },
                { status: 404 }
            );
        }

        const {
            current_weight_kg: initialWeightKg,
            weight_goal_kg,
            height_cm,
            height_ft,
            height_in,
        } = onboarding;

        // -------------------------------
        // GET LATEST HEIGHT (Height model)
        // -------------------------------
        const latestHeight = await db.height.findFirst({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });

        // Choose height priority: Height model → onboarding height
        const heightCm =
            latestHeight?.height_cm ||
            height_cm ||
            (latestHeight?.height_ft && latestHeight?.height_in
                ? latestHeight.height_ft * 30.48 + latestHeight.height_in * 2.54
                : height_ft && height_in
                    ? height_ft * 30.48 + height_in * 2.54
                    : null);

        // -------------------------------
        // GET LATEST WEIGHT
        // -------------------------------
        const latestWeightLog = await db.weightlog.findFirst({
            where: { userId, ...(deviceId ? { deviceId } : {}) },
            orderBy: { date: "desc" },
        });

        const currentWeightKg =
            latestWeightLog?.current_weight_kg || initialWeightKg;

        // -------------------------------
        // PROGRESS %
        // -------------------------------
        const progressPercent =
            weight_goal_kg && initialWeightKg
                ? Math.min(
                    100,
                    Math.max(
                        0,
                        ((currentWeightKg - initialWeightKg) /
                            (weight_goal_kg - initialWeightKg)) *
                        100
                    )
                )
                : 0;

        // -------------------------------
        // BMI CALCULATION
        // -------------------------------
        const calculateBMI = (weight, height) => {
            if (!weight || !height) return null;
            const hMeters = height / 100;
            return Number((weight / (hMeters * hMeters)).toFixed(1));
        };

        const bmi = calculateBMI(currentWeightKg, heightCm);
        const initialBmi = calculateBMI(initialWeightKg, heightCm);

        const getBmiCategory = (b) => {
            if (!b) return "Unknown";
            if (b < 18.5) return "Underweight";
            if (b < 25) return "Normal weight";
            if (b < 30) return "Overweight";
            return "Obesity";
        };

        const bmiCategory = getBmiCategory(bmi);

        // -------------------------------
        // CHART DATA HELPER
        // -------------------------------
        const getLogsForDays = async (days) => {
            const start = startOfDay(subDays(new Date(), days - 1));
            const end = new Date();

            const logs = await db.weightlog.findMany({
                where: {
                    userId,
                    ...(deviceId ? { deviceId } : {}),
                    date: { gte: start, lte: end },
                },
                orderBy: { date: "asc" },
            });

            const chartData = [];

            for (let i = 0; i < days; i++) {
                const day = startOfDay(subDays(new Date(), days - i - 1));

                const logForDay = logs.find((l) => {
                    const d = new Date(l.date);
                    return (
                        d.getUTCFullYear() === day.getUTCFullYear() &&
                        d.getUTCMonth() === day.getUTCMonth() &&
                        d.getUTCDate() === day.getUTCDate()
                    );
                });

                chartData.push({
                    date: day.toISOString().split("T")[0],
                    weight: logForDay?.current_weight_kg ?? null,
                });
            }

            return chartData;
        };

        // -------------------------------
        // CHARTS
        // -------------------------------
        const chart7d = await getLogsForDays(7);
        const chart30d = await getLogsForDays(30);
        const chart90d = await getLogsForDays(90);

        // -------------------------------
        // FINAL RESPONSE
        // -------------------------------
        return NextResponse.json(
            {
                success: true,
                weight: {
                    initial: initialWeightKg,
                    current: currentWeightKg,
                    goal: weight_goal_kg,
                    progressPercent,
                },
                bmi: {
                    height_cm: heightCm,
                    current: bmi,
                    initial: initialBmi,
                    category: bmiCategory,
                },
                chart: {
                    "7d": chart7d,
                    "30d": chart30d,
                    "90d": chart90d,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching weight progress:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Error retrieving weight progress",
                error: error.message,
            },
            { status: 500 }
        );
    }
}
