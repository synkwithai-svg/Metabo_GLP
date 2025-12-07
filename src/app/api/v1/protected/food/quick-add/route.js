import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MealType } from "@/lib/enums";

export async function POST(req) {
    try {
        const body = await req.json();

        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid") || null;

        if (!userId) {
            return NextResponse.json(
                { message: "User ID header is required" },
                { status: 400 }
            );
        }

        const { mealType, loggedAt, macros, quantity = 1, unit = "serving" } = body;

        if (!mealType || !Object.values(MealType).includes(mealType)) {
            return NextResponse.json(
                {
                    message: `Invalid mealType. Must be one of: ${Object.values(
                        MealType
                    ).join(", ")}`,
                },
                { status: 400 }
            );
        }

        if (!loggedAt) {
            return NextResponse.json(
                { message: "loggedAt is required" },
                { status: 400 }
            );
        }

        // -------------------------------------------------------------
        // 1️⃣ Create QuickAdd + its macros + FoodLog + FoodLogItem
        // -------------------------------------------------------------
        const result = await db.$transaction(async (tx) => {
            // 1. Create QuickAdd
            const quickAdd = await tx.quickAdd.create({
                data: {
                    userId,
                    deviceId,
                    mealType,
                    loggedAt: new Date(loggedAt),
                },
            });

            // 2. Insert QuickAdd Macros
            if (Array.isArray(macros) && macros.length > 0) {
                await Promise.all(
                    macros.map((m) =>
                        tx.macro.create({
                            data: {
                                quickAddId: quickAdd.id,
                                energy: m.energy ?? null,
                                calories: m.calories ?? null,
                                protein: m.protein ?? null,
                                carbs: m.carbs ?? null,
                                fat: m.fat ?? null,
                                fiber: m.fiber ?? null,
                            },
                        })
                    )
                );
            }

            // 3. Create FoodLog entry
            const log = await tx.foodLog.create({
                data: {
                    userId,
                    deviceId,
                    mealType,
                    loggedAt: new Date(loggedAt),
                },
            });

            // 4. Create FoodLogItem under this FoodLog
            await tx.foodLogItem.create({
                data: {
                    logId: log.id,
                    quickAddId: quickAdd.id, // link QuickAdd
                    quantity,
                    unit,
                },
            });

            // Return with macros
            return tx.quickAdd.findUnique({
                where: { id: quickAdd.id },
                include: { macros: true },
            });
        });

        return NextResponse.json(
            {
                success: true,
                message: "QuickAdd logged successfully",
                data: result,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("QuickAdd Error:", error);
        return NextResponse.json(
            {
                message: "Server error",
                error: error.message,
            },
            { status: 500 }
        );
    }
}



export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);

        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid") || null;

        if (!userId) {
            return NextResponse.json(
                { message: "User ID header is required" },
                { status: 400 }
            );
        }

        // Extract filters
        const mealType = searchParams.get("mealType") || undefined;
        const date = searchParams.get("date") || undefined;
        const from = searchParams.get("from") || undefined;
        const to = searchParams.get("to") || undefined;
        const queryDevice = searchParams.get("deviceId") || undefined;

        // Build where clause
        const whereClause = {
            userId,
            ...(mealType && { mealType }),

            // Device priority: search param > header
            ...(queryDevice
                ? { deviceId: queryDevice }
                : deviceId
                    ? { deviceId }
                    : {}),

            // Exact date
            ...(date && {
                loggedAt: {
                    gte: new Date(`${date}T00:00:00`),
                    lte: new Date(`${date}T23:59:59`),
                },
            }),

            // Date range
            ...(from &&
                to && {
                loggedAt: {
                    gte: new Date(`${from}T00:00:00`),
                    lte: new Date(`${to}T23:59:59`),
                },
            }),
        };

        const quickAdds = await db.quickAdd.findMany({
            where: whereClause,
            include: {
                macros: true,
            },
            orderBy: {
                loggedAt: "desc",
            },
        });

        return NextResponse.json({
            success: true,
            message: "QuickAdd items retrieved successfully",
            filters: whereClause,
            data: quickAdds,
        });
    } catch (error) {
        console.error("Error fetching QuickAdd:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to retrieve QuickAdd items",
                error: error.message,
            },
            { status: 500 }
        );
    }
}
