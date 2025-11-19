import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

        const { mealType, loggedAt, items } = body;

        if (!mealType || !items || !Array.isArray(items)) {
            return NextResponse.json(
                { message: "mealType and items[] are required" },
                { status: 400 }
            );
        }

        // 1️⃣ Create Parent FoodLog
        const foodLog = await db.foodLog.create({
            data: {
                userId,
                deviceId,
                mealType,
                loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
            },
        });

        // 2️⃣ Loop through items
        for (const rawItem of items) {
            const { foodId, userFoodId, mealId, quickAddId } = rawItem;

            // Default fallback values
            const quantity = rawItem.quantity ?? 1;
            const unit = rawItem.unit ?? "g";

            if (!foodId && !userFoodId && !mealId && !quickAddId) {
                continue;
            }

            const logItem = await db.foodLogItem.create({
                data: {
                    logId: foodLog.id,
                    foodId: foodId || null,
                    userFoodId: userFoodId || null,
                    mealId: mealId || null,
                    quickAddId: quickAddId || null,
                    quantity,
                    unit,
                },
            });

            // 3️⃣ Fetch Macros Based on Type
            let macrosSource = [];

            if (foodId) {
                macrosSource = await db.macro.findMany({ where: { foodId } });
            } else if (userFoodId) {
                macrosSource = await db.macro.findMany({ where: { userFoodId } });
            } else if (quickAddId) {
                macrosSource = await db.macro.findMany({ where: { quickAddId } });
            } else if (mealId) {
                const mealFoods = await db.mealFood.findMany({
                    where: { mealId },
                    include: { food: true, userFood: true },
                });

                for (const mf of mealFoods) {
                    const macro = await db.macro.findFirst({
                        where: {
                            OR: [{ foodId: mf.foodId }, { userFoodId: mf.userFoodId }],
                        },
                    });

                    if (!macro) continue;

                    await db.macro.create({
                        data: {
                            energy: macro.energy,
                            calories: macro.calories,
                            protein: macro.protein,
                            carbs: macro.carbs,
                            fat: macro.fat,
                            fiber: macro.fiber,
                            foodLogItemId: logItem.id,
                        },
                    });
                }

                continue;
            }

            // 4️⃣ Insert macros for foodId / userFoodId / quickAddId
            for (const m of macrosSource) {
                await db.macro.create({
                    data: {
                        energy: m.energy,
                        calories: m.calories,
                        protein: m.protein,
                        carbs: m.carbs,
                        fat: m.fat,
                        fiber: m.fiber,
                        foodLogItemId: logItem.id,
                    },
                });
            }
        }

        return NextResponse.json(
            {
                success: "true",
                message: "Food log created ",
                foodLogId: foodLog.id,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("FoodLog Error:", error);
        return NextResponse.json(
            { success: "false", message: "Internal server error", error },
            { status: 500 }
        );
    }
}


export async function GET(req) {
    try {
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid") || null;

        if (!userId) {
            return NextResponse.json(
                { message: "User ID header is required" },
                { status: 400 }
            );
        }

        // ---------------------------
        // READ QUERY PARAMS
        // ---------------------------
        const { searchParams } = new URL(req.url);

        const date = searchParams.get("date");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        let dateFilter = {};

        // ---------------------------
        // FILTER FOR SPECIFIC DAY
        // ---------------------------
        if (date) {
            const start = new Date(date);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);

            dateFilter.loggedAt = {
                gte: start,
                lte: end
            };
        }

        // ---------------------------
        // FILTER FOR DATE RANGE
        // ---------------------------
        if (startDate && endDate) {
            dateFilter.loggedAt = {
                gte: new Date(startDate),
                lte: new Date(endDate + "T23:59:59.999")
            };
        }

        // ---------------------------
        // FETCH FOOD LOGS
        // ---------------------------
        const foodLogs = await db.foodLog.findMany({
            where: {
                userId,
                ...(deviceId && { deviceId }),
                ...dateFilter
            },
            orderBy: { loggedAt: "desc" },
            include: {
                items: {
                    include: {
                        food: true,
                        userFood: true,
                        quickAdd: true,
                        macros: true,
                        meal: {
                            include: {
                                foods: {
                                    include: {
                                        food: true,
                                        userFood: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        // ---------------------------
        // STRUCTURE RESPONSE
        // ---------------------------
        const structured = foodLogs.map((log) => ({
            id: log.id,
            mealType: log.mealType,
            loggedAt: log.loggedAt,

            items: log.items.map((item) => ({
                id: item.id,
                quantity: item.quantity,
                unit: item.unit,

                food: item.food || null,
                userFood: item.userFood || null,
                quickAdd: item.quickAdd || null,

                meal: item.meal
                    ? {
                        id: item.meal.id,
                        name: item.meal.name,
                        foods: item.meal.foods.map((mf) => ({
                            quantity: mf.quantity,
                            food: mf.food || null,
                            userFood: mf.userFood || null,
                        }))
                    }
                    : null,

                macros:
                    item.macros?.map((m) => ({
                        energy: m.energy,
                        calories: m.calories,
                        protein: m.protein,
                        carbs: m.carbs,
                        fat: m.fat,
                        fiber: m.fiber
                    })) || []
            }))
        }));

        return NextResponse.json(
            { success: true, data: structured },
            { status: 200 }
        );

    } catch (error) {
        console.error("Fetch FoodLog Error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error", error },
            { status: 500 }
        );
    }
}
