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
        // Get user's onboarding info
        // -------------------------------
        const onboarding = await db.onboarding.findFirst({
            where: { userId },
            select: {
                createdAt: true,
                current_weight_kg: true, // starting weight
                weight_goal_kg: true,    // goal weight
            },
            orderBy: { createdAt: "asc" },
        });

        if (!onboarding) {
            return NextResponse.json(
                { message: "Onboarding data not found for user" },
                { status: 404 }
            );
        }

        const { current_weight_kg, weight_goal_kg } = onboarding;

        // -------------------------------
        // Helper to get chart logs
        // -------------------------------
        const getLogsForDays = async (days) => {
            const start = startOfDay(subDays(new Date(), days - 1));
            const end = new Date(); // includes today

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

                // Find log for the current day (ignore time)
                const logForDay = logs.find((l) => {
                    const logDate = new Date(l.date);
                    return (
                        logDate.getUTCFullYear() === day.getUTCFullYear() &&
                        logDate.getUTCMonth() === day.getUTCMonth() &&
                        logDate.getUTCDate() === day.getUTCDate()
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
        // Get latest weight log
        // -------------------------------
        const latestWeightLog = await db.weightlog.findFirst({
            where: { userId, ...(deviceId ? { deviceId } : {}) },
            orderBy: { date: "desc" },
        });

        const currentWeight = latestWeightLog?.current_weight_kg || current_weight_kg;

        // -------------------------------
        // Calculate progress %
        // -------------------------------
        const progressPercent =
            weight_goal_kg && current_weight_kg
                ? Math.min(
                    100,
                    Math.max(
                        0,
                        ((currentWeight - current_weight_kg) /
                            (weight_goal_kg - current_weight_kg)) *
                        100
                    )
                )
                : 0;

        // -------------------------------
        // Chart data
        // -------------------------------
        const chart7d = await getLogsForDays(7);
        const chart30d = await getLogsForDays(30);
        const chart90d = await getLogsForDays(90);

        return NextResponse.json(
            {
                success: true,
                weight: {
                    initial: current_weight_kg,
                    current: currentWeight,
                    goal: weight_goal_kg,
                    progressPercent,
                    chart: { "7d": chart7d, "30d": chart30d, "90d": chart90d },
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
