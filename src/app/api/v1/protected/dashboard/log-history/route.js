import { NextResponse } from "next/server";
import { db } from "@/lib/db";
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

        // -------------------------------
        // DATE FILTERING LOGIC
        // -------------------------------
        const url = new URL(req.url);
        const dateParam = url.searchParams.get("date");

        const targetDate = dateParam ? dayjs(dateParam) : dayjs();

        const todayStart = targetDate.startOf("day").toDate();
        const todayEnd = targetDate.endOf("day").toDate();

        const yesterdayStart = targetDate.subtract(1, "day").startOf("day").toDate();
        const yesterdayEnd = targetDate.subtract(1, "day").endOf("day").toDate();

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
                where: { ...baseFilter, loggedAt: { gte: yesterdayStart, lte: yesterdayEnd } },
                include: { items: true },
            }),
            db.weightlog.findMany({
                where: { ...baseFilter, date: { gte: yesterdayStart, lte: yesterdayEnd } },
            }),
            db.waterLog.findMany({
                where: { ...baseFilter, date: { gte: yesterdayStart, lte: yesterdayEnd } },
                include: { consumedWaters: true },
            }),
            db.injectionLog.findMany({
                where: { ...baseFilter, date: { gte: yesterdayStart, lte: yesterdayEnd } },
            }),
            db.nextInjectionShot.findMany({
                where: { ...baseFilter, Date: { gte: yesterdayStart, lte: yesterdayEnd } },
            }),
            db.sideEffectLog.findMany({
                where: { ...baseFilter, date: { gte: yesterdayStart, lte: yesterdayEnd } },
                include: { sideEffects: true },
            }),
            db.walkingStepsLog.findMany({
                where: { ...baseFilter, date: { gte: yesterdayStart, lte: yesterdayEnd } },
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
