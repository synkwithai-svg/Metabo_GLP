import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startOfDay, endOfDay, subDays } from "date-fns";

export async function GET(req) {
    try {
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid");

        if (!userId) {
            return NextResponse.json(
                { message: "User ID header is required" },
                { status: 400 }
            );
        }

        // -------------------------------
        // DATE FILTERING LOGIC
        // -------------------------------
        const { searchParams } = new URL(req.url);
        const dateParam = searchParams.get("date");

        let targetDate = dateParam ? new Date(dateParam) : new Date();

        const todayStart = startOfDay(targetDate);
        const todayEnd = endOfDay(targetDate);

        const yStart = startOfDay(subDays(targetDate, 1));
        const yEnd = endOfDay(subDays(targetDate, 1));

        const baseFilter = {
            userId,
            ...(deviceId ? { deviceId } : {}),
        };

        // -----------------------------------------------------
        // FETCH TODAY'S LOGS
        // -----------------------------------------------------
        const [
            foodToday,
            weightToday,
            waterToday,
            injectionToday,
            nextShotsToday,
            sideEffectsToday,
            walkingToday,
        ] = await Promise.all([
            db.foodLog.findMany({
                where: { ...baseFilter, loggedAt: { gte: todayStart, lte: todayEnd } },
                include: { items: true },
            }),
            db.weightlog.findMany({
                where: { ...baseFilter, date: { gte: todayStart, lte: todayEnd } },
            }),
            db.waterLog.findMany({
                where: { ...baseFilter, date: { gte: todayStart, lte: todayEnd } },
                include: { consumedWaters: true },
            }),
            db.injectionLog.findMany({
                where: { ...baseFilter, date: { gte: todayStart, lte: todayEnd } },
            }),
            db.nextInjectionShot.findMany({
                where: { ...baseFilter, Date: { gte: todayStart, lte: todayEnd } },
            }),
            db.sideEffectLog.findMany({
                where: { ...baseFilter, date: { gte: todayStart, lte: todayEnd } },
                include: { sideEffects: true },
            }),
            db.walkingStepsLog.findMany({
                where: { ...baseFilter, date: { gte: todayStart, lte: todayEnd } },
            }),
        ]);

        // -----------------------------------------------------
        // FETCH YESTERDAY'S LOGS
        // -----------------------------------------------------
        const [
            foodY,
            weightY,
            waterY,
            injectionY,
            nextShotsY,
            sideEffectsY,
            walkingY,
        ] = await Promise.all([
            db.foodLog.findMany({
                where: { ...baseFilter, loggedAt: { gte: yStart, lte: yEnd } },
                include: { items: true },
            }),
            db.weightlog.findMany({
                where: { ...baseFilter, date: { gte: yStart, lte: yEnd } },
            }),
            db.waterLog.findMany({
                where: { ...baseFilter, date: { gte: yStart, lte: yEnd } },
                include: { consumedWaters: true },
            }),
            db.injectionLog.findMany({
                where: { ...baseFilter, date: { gte: yStart, lte: yEnd } },
            }),
            db.nextInjectionShot.findMany({
                where: { ...baseFilter, Date: { gte: yStart, lte: yEnd } },
            }),
            db.sideEffectLog.findMany({
                where: { ...baseFilter, date: { gte: yStart, lte: yEnd } },
                include: { sideEffects: true },
            }),
            db.walkingStepsLog.findMany({
                where: { ...baseFilter, date: { gte: yStart, lte: yEnd } },
            }),
        ]);

        // -----------------------------------------------------
        // NORMALIZE DATA INTO UNIFIED STRUCTURE
        // -----------------------------------------------------

        const normalize = (arr, type, timeField = "time") =>
            arr.map((x) => ({
                type,
                time: x[timeField],
                data: x,
            }));

        const todayLogs = [
            ...normalize(foodToday, "food", "loggedAt"),
            ...normalize(weightToday, "weight", "date"),
            ...normalize(waterToday, "water", "date"),
            ...normalize(injectionToday, "injection", "date"),
            ...normalize(nextShotsToday, "next_injection", "Date"),
            ...normalize(sideEffectsToday, "side_effect", "date"),
            ...normalize(walkingToday, "walking", "date"),
        ].sort((a, b) => new Date(b.time) - new Date(a.time));

        const yesterdayLogs = [
            ...normalize(foodY, "food", "loggedAt"),
            ...normalize(weightY, "weight", "date"),
            ...normalize(waterY, "water", "date"),
            ...normalize(injectionY, "injection", "date"),
            ...normalize(nextShotsY, "next_injection", "Date"),
            ...normalize(sideEffectsY, "side_effect", "date"),
            ...normalize(walkingY, "walking", "date"),
        ].sort((a, b) => new Date(b.time) - new Date(a.time));

        // -----------------------------------------------------
        // FINAL ORDER:
        // 1) Today (DESC)
        // 2) Yesterday (DESC)
        // -----------------------------------------------------
        const finalLogs = [...todayLogs, ...yesterdayLogs];

        return NextResponse.json(
            { success: true, logs: finalLogs },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Error retrieving logs",
                error: error.message,
            },
            { status: 500 }
        );
    }
}
