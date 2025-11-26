import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import calculateBMI from "@/utils/calculate-bmi";

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

        const { searchParams } = new URL(req.url);
        const queryDate = searchParams.get("date");

        // Parse selected date as UTC
        let selectedDate;
        if (queryDate) {
            const utcDateString = queryDate.includes('T') ? queryDate : `${queryDate}T00:00:00.000Z`;
            selectedDate = new Date(utcDateString);
        } else {
            selectedDate = new Date();
        }

        // Get start and end of selected date in UTC
        const selectedDateStart = new Date(Date.UTC(
            selectedDate.getUTCFullYear(),
            selectedDate.getUTCMonth(),
            selectedDate.getUTCDate(),
            0, 0, 0, 0
        ));

        const selectedDateEnd = new Date(Date.UTC(
            selectedDate.getUTCFullYear(),
            selectedDate.getUTCMonth(),
            selectedDate.getUTCDate(),
            23, 59, 59, 999
        ));

        // -------------------------------
        // GET ONBOARDING (starting data)
        // -------------------------------
        const onboarding = await db.onboarding.findFirst({
            where: { userId },
            select: {
                createdAt: true,
                current_weight_kg: true,
                weight_goal_kg: true,
                goal_duration: true,
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
            createdAt: onboardingDate,
            current_weight_kg: initialWeightKg,
            weight_goal_kg,
            goal_duration,
            height_cm,
            height_ft,
            height_in,
        } = onboarding;

        // Calculate goal date (onboarding date + goal_duration days)
        const goalDate = new Date(onboardingDate);
        goalDate.setDate(goalDate.getDate() + parseInt(goal_duration || 0));

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
        // GET LATEST WEIGHT UP TO SELECTED DATE
        // -------------------------------
        const latestWeightLog = await db.weightlog.findFirst({
            where: {
                userId,
                ...(deviceId ? { deviceId } : {}),
                date: { lte: selectedDateEnd }
            },
            orderBy: { date: "desc" },
        });

        const currentWeightKg = latestWeightLog?.current_weight_kg || initialWeightKg;

        // -------------------------------
        // PROGRESS %
        // -------------------------------
        const progressPercent =
            weight_goal_kg && initialWeightKg
                ? Math.min(
                    100,
                    Math.max(
                        0,
                        ((initialWeightKg - currentWeightKg) /
                            (initialWeightKg - weight_goal_kg)) *
                        100
                    )
                )
                : 0;

        // -------------------------------
        // BMI CALCULATION using imported function
        // -------------------------------
        const bmi = calculateBMI(currentWeightKg, heightCm);
        const initialBmi = calculateBMI(initialWeightKg, heightCm);

        // -------------------------------
        // TIMELINE
        // -------------------------------
        const timeline = {
            initialDate: onboardingDate.toISOString().split("T")[0],
            initialWeight: initialWeightKg,
            goalDate: goalDate.toISOString().split("T")[0],
            goalWeight: weight_goal_kg,
            currentWeight: currentWeightKg,
        };

        // -------------------------------
        // CHART DATA HELPER
        // -------------------------------
        const getLogsForDays = async (days) => {
            // Calculate onboarding date start in UTC
            const onboardingDateStart = new Date(Date.UTC(
                onboardingDate.getUTCFullYear(),
                onboardingDate.getUTCMonth(),
                onboardingDate.getUTCDate(),
                0, 0, 0, 0
            ));

            // Calculate days since onboarding
            const daysSinceOnboarding = Math.floor(
                (selectedDateStart.getTime() - onboardingDateStart.getTime()) / (1000 * 60 * 60 * 24)
            );

            // If user hasn't completed the requested period, use actual days since onboarding
            const actualDays = Math.min(days, daysSinceOnboarding + 1);

            // Start date for chart (either X days ago or onboarding date, whichever is later)
            const chartStartDate = new Date(Date.UTC(
                selectedDateStart.getUTCFullYear(),
                selectedDateStart.getUTCMonth(),
                selectedDateStart.getUTCDate() - (actualDays - 1),
                0, 0, 0, 0
            ));

            // Don't go before onboarding date
            const finalStartDate = chartStartDate < onboardingDateStart
                ? onboardingDateStart
                : chartStartDate;

            const logs = await db.weightlog.findMany({
                where: {
                    userId,
                    ...(deviceId ? { deviceId } : {}),
                    date: { gte: finalStartDate, lte: selectedDateEnd },
                },
                orderBy: { date: "asc" },
            });

            const chartData = [];

            // Calculate actual number of days to display
            const totalDays = Math.floor(
                (selectedDateEnd.getTime() - finalStartDate.getTime()) / (1000 * 60 * 60 * 24)
            ) + 1;

            for (let i = 0; i < totalDays; i++) {
                const day = new Date(Date.UTC(
                    finalStartDate.getUTCFullYear(),
                    finalStartDate.getUTCMonth(),
                    finalStartDate.getUTCDate() + i,
                    0, 0, 0, 0
                ));

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
        // CHARTS
        // -------------------------------
        const chart7d = await getLogsForDays(7);
        const chart30d = await getLogsForDays(30);
        const chart90d = await getLogsForDays(90);

        // -------------------------------
        // JOURNEY - ONLY IF PHOTOS EXIST
        // -------------------------------
        let journeyData = [];

        // Check if photos exist first
        const photoCount = await db.photo.count({
            where: { userId, ...(deviceId ? { deviceId } : {}) }
        });

        if (photoCount > 0) {
            // Fetch all photos
            const photos = await db.photo.findMany({
                where: { userId, ...(deviceId ? { deviceId } : {}) },
                orderBy: { createdAt: "desc" },
                take: 2, // Only get latest 2 photos
            });

            // For each photo, get weight and height from the same date
            journeyData = await Promise.all(photos.map(async (photo) => {
                const photoDate = photo.createdAt.toISOString().split("T")[0];

                // Get start and end of photo date in UTC
                const photoDateStart = new Date(Date.UTC(
                    photo.createdAt.getUTCFullYear(),
                    photo.createdAt.getUTCMonth(),
                    photo.createdAt.getUTCDate(),
                    0, 0, 0, 0
                ));

                const photoDateEnd = new Date(Date.UTC(
                    photo.createdAt.getUTCFullYear(),
                    photo.createdAt.getUTCMonth(),
                    photo.createdAt.getUTCDate(),
                    23, 59, 59, 999
                ));

                // Get weight from the same date
                const weight = await db.weightlog.findFirst({
                    where: {
                        userId,
                        ...(deviceId ? { deviceId } : {}),
                        createdAt: {
                            gte: photoDateStart,
                            lte: photoDateEnd
                        }
                    },
                    orderBy: { createdAt: "desc" }
                });

                // Get height from the same date
                const height = await db.height.findFirst({
                    where: {
                        userId,
                        ...(deviceId ? { deviceId } : {}),
                        createdAt: {
                            gte: photoDateStart,
                            lte: photoDateEnd
                        }
                    },
                    orderBy: { createdAt: "desc" }
                });

                return {
                    date: photoDate,
                    photos: [{
                        id: photo.id,
                        photoUrl: photo.photoUrl,
                        note: photo.note || null
                    }],
                    weights: weight ? [{
                        id: weight.id,
                        current_weight_kg: weight.current_weight_kg,
                        current_weight_lb: weight.current_weight_lb
                    }] : [],
                    heights: height ? [{
                        id: height.id,
                        height_cm: height.height_cm,
                        height_ft: height.height_ft,
                        height_in: height.height_in
                    }] : []
                };
            }));
        }

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
                    progressPercent: parseFloat(progressPercent.toFixed(2)),
                },
                bmi: {
                    height_cm: heightCm,
                    current: bmi.index,
                    initial: initialBmi.index,
                    category: bmi.category,
                },
                timeline,
                journey: journeyData,
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