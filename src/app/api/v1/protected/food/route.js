import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import dayjs from "dayjs";

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

        const page = Number(searchParams.get("page") || 1);
        const limit = Number(searchParams.get("limit") || 20);
        const skip = (page - 1) * limit;

        const search = searchParams.get("search") || undefined;
        const dateStr = searchParams.get("date") || undefined;
        const fromStr = searchParams.get("from") || undefined;
        const toStr = searchParams.get("to") || undefined;

        let dateFilter = {};
        if (dateStr) {
            dateFilter = {
                gte: dayjs(dateStr).startOf("day").toDate(),
                lte: dayjs(dateStr).endOf("day").toDate(),
            };
        } else if (fromStr && toStr) {
            dateFilter = {
                gte: dayjs(fromStr).startOf("day").toDate(),
                lte: dayjs(toStr).endOf("day").toDate(),
            };
        }

        const baseFilters = {
            ...(search && { name: { contains: search, mode: "insensitive" } }),
            ...(dateFilter.gte && { createdAt: dateFilter }),
        };

        const foodWhere = { ...baseFilters };
        const userFoodWhere = { userId, ...(deviceId && { deviceId }), ...baseFilters };
        const mealWhere = { userId, ...(deviceId && { deviceId }), ...baseFilters };

        // -------------------------------------
        // FETCH WITH MACROS
        // -------------------------------------
        const [foods, userFoods, meals] = await Promise.all([
            db.food.findMany({
                where: foodWhere,
                include: { macros: true },
                orderBy: { createdAt: "desc" },
            }),
            db.userFood.findMany({
                where: userFoodWhere,
                include: { macros: true },
                orderBy: { createdAt: "desc" },
            }),
            db.meal.findMany({
                where: mealWhere,
                orderBy: { createdAt: "desc" },
                include: {
                    foods: {
                        include: {
                            food: { include: { macros: true } },
                            userFood: { include: { macros: true } },
                            quickAdd: { include: { macros: true } },
                        },
                    },
                },
            }),
        ]);

        // -----------------------------------------------------
        // HELPER: EXTRACT CALORIES FROM ANY MACROS[]
        // -----------------------------------------------------
        const getCalories = (macros) => {
            if (!macros || macros.length === 0) return 0;
            return macros[0]?.calories || 0;
        };

        // -----------------------------------------------------
        // FORMAT MEALS WITH CALORIES
        // -----------------------------------------------------
        const formattedMeals = meals.map((meal) => {
            let mealTotalCalories = 0;

            const formattedFoods = meal.foods
                .map((item) => {
                    if (item.food) {
                        const cal = getCalories(item.food.macros) * item.quantity;
                        mealTotalCalories += cal;

                        return {
                            id: item.food.id,
                            type: "food",
                            name: item.food.name,
                            quantity: item.quantity,
                            calories: cal,
                        };
                    }

                    if (item.userFood) {
                        const cal = getCalories(item.userFood.macros) * item.quantity;
                        mealTotalCalories += cal;

                        return {
                            id: item.userFood.id,
                            type: "userFood",
                            name: item.userFood.name,
                            quantity: item.quantity,
                            calories: cal,
                        };
                    }

                    if (item.quickAdd) {
                        const cal = getCalories(item.quickAdd.macros) * item.quantity;
                        mealTotalCalories += cal;

                        return {
                            id: item.quickAdd.id,
                            type: "quickAdd",
                            name: "Quick Add",
                            quantity: item.quantity,
                            calories: cal,
                        };
                    }

                    return null;
                })
                .filter(Boolean);

            return {
                id: meal.id,
                type: "meal",
                name: meal.name,
                mealType: meal.mealType,
                createdAt: meal.createdAt,
                updatedAt: meal.updatedAt,
                foods: formattedFoods,
                calories: mealTotalCalories,
            };
        });

        // -----------------------------------------------------
        // MERGE DATA WITH CALORIES INCLUDED
        // -----------------------------------------------------
        const mergedData = [
            ...foods.map((f) => ({
                id: f.id,
                type: "food",
                name: f.name,
                createdAt: f.createdAt,
                updatedAt: f.updatedAt,
                calories: getCalories(f.macros),
            })),
            ...userFoods.map((uf) => ({
                id: uf.id,
                type: "userFood",
                name: uf.name,
                createdAt: uf.createdAt,
                updatedAt: uf.updatedAt,
                calories: getCalories(uf.macros),
            })),
            ...formattedMeals,
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const paginatedData = mergedData.slice(skip, skip + limit);

        return NextResponse.json(
            {
                success: true,
                message: "Data retrieved successfully",
                data: paginatedData,
                meta: {
                    page,
                    limit,
                    totalItems: mergedData.length,
                    totalPages: Math.ceil(mergedData.length / limit),
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching data:", error);
        return NextResponse.json(
            { success: false, message: "Server error", error: error.message },
            { status: 500 }
        );
    }
}
