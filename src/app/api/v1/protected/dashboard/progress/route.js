import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import calculateBMI from "@/utils/calculate-bmi";
import dayjs from "dayjs";

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

        const url = new URL(req.url);
        const dateParam = url.searchParams.get("date");
        const queryDate = dateParam ? dayjs(dateParam) : dayjs();

        const startOfDay = queryDate.startOf("day").toDate();
        const endOfDay = queryDate.endOf("day").toDate();

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

        const goalDate = dayjs(onboardingDate)
            .add(parseInt(goal_duration || 0), "day")
            .toDate();

        // -------------------------------
        // GET LATEST HEIGHT (Height model)
        // -------------------------------
        const latestHeight = await db.height.findFirst({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });

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
                date: { gte: startOfDay, lte: endOfDay },
            },
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
            initialDate: dayjs(onboardingDate).format("YYYY-MM-DD"),
            initialWeight: initialWeightKg,
            goalDate: dayjs(goalDate).format("YYYY-MM-DD"),
            goalWeight: weight_goal_kg,
            currentWeight: currentWeightKg,
        };

        // -------------------------------
        // CHART DATA HELPER
        // -------------------------------
        const getLogsForDays = async (days) => {
            const onboardingDateStart = dayjs(onboardingDate).startOf("day");
            const daysSinceOnboarding = queryDate.diff(onboardingDateStart, "day");
            const actualDays = Math.min(days, daysSinceOnboarding + 1);
            const chartStartDate = queryDate.subtract(actualDays - 1, "day").startOf("day");
            const finalStartDate = chartStartDate.isBefore(onboardingDateStart)
                ? onboardingDateStart
                : chartStartDate;

            // Fetch all weight logs between start and selected date
            const logs = await db.weightlog.findMany({
                where: {
                    userId,
                    ...(deviceId ? { deviceId } : {}),
                    date: { gte: finalStartDate.toDate(), lte: queryDate.endOf("day").toDate() },
                },
                orderBy: { date: "asc" },
            });

            const totalDays = queryDate.diff(finalStartDate, "day") + 1;
            const chartData = [];
            let lastWeight = initialWeightKg; // start with initial weight

            for (let i = 0; i < totalDays; i++) {
                const day = finalStartDate.add(i, "day");

                // For each day, get the **latest weight log** of that day
                const logForDay = logs
                    .filter(l => dayjs(l.date).isSame(day, "day"))
                    .sort((a, b) => dayjs(b.date).diff(dayjs(a.date)))[0]; // latest log

                if (logForDay) lastWeight = logForDay.current_weight_kg;

                chartData.push({
                    date: day.format("YYYY-MM-DD"),
                    weight: lastWeight ?? null, // carry forward if null
                });
            }

            return chartData;
        };


        const chart7d = await getLogsForDays(7);
        const chart30d = await getLogsForDays(30);
        const chart90d = await getLogsForDays(90);

        // -------------------------------
        // JOURNEY - ONLY IF PHOTOS EXIST
        // -------------------------------
        let journeyData = [];

        const photoCount = await db.photo.count({
            where: { userId, ...(deviceId ? { deviceId } : {}) },
        });

        if (photoCount > 0) {
            const photos = await db.photo.findMany({
                where: { userId, ...(deviceId ? { deviceId } : {}) },
                orderBy: { createdAt: "desc" },
                take: 2,
            });

            journeyData = await Promise.all(
                photos.map(async (photo) => {
                    const photoDate = dayjs(photo.createdAt).format("YYYY-MM-DD");

                    const photoDateStart = dayjs(photo.createdAt).startOf("day");
                    const photoDateEnd = dayjs(photo.createdAt).endOf("day");

                    const weight = await db.weightlog.findFirst({
                        where: {
                            userId,
                            ...(deviceId ? { deviceId } : {}),
                            date: {
                                gte: photoDateStart.toDate(),
                                lte: photoDateEnd.toDate(),
                            },
                        },
                        orderBy: { date: "desc" },
                    });

                    const height = await db.height.findFirst({
                        where: {
                            userId,
                            ...(deviceId ? { deviceId } : {}),
                            createdAt: {
                                gte: photoDateStart.toDate(),
                                lte: photoDateEnd.toDate(),
                            },
                        },
                        orderBy: { createdAt: "desc" },
                    });

                    return {
                        date: photoDate,
                        photos: [
                            {
                                id: photo.id,
                                photoUrl: photo.photoUrl,
                                note: photo.note || null,
                            },
                        ],
                        weights: weight
                            ? [
                                {
                                    id: weight.id,
                                    current_weight_kg: weight.current_weight_kg,
                                    current_weight_lb: weight.current_weight_lb,
                                },
                            ]
                            : [],
                        heights: height
                            ? [
                                {
                                    id: height.id,
                                    height_cm: height.height_cm,
                                    height_ft: height.height_ft,
                                    height_in: height.height_in,
                                },
                            ]
                            : [],
                    };
                })
            );
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
