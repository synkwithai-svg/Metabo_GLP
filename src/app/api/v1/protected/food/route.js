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

        // ---------------------------
        // PAGINATION
        // ---------------------------
        const page = Number(searchParams.get("page") || 1);
        const limit = Number(searchParams.get("limit") || 20);
        const skip = (page - 1) * limit;

        // ---------------------------
        // SEARCH & DATE FILTER
        // ---------------------------
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

        // ---------------------------
        // WHERE CLAUSES
        // ---------------------------
        const foodWhere = {
            ...(search && { name: { contains: search, mode: "insensitive" } }),
            ...(dateFilter.gte && { createdAt: dateFilter }),
        };

        const userFoodWhere = {
            userId,
            ...(deviceId && { deviceId }),
            ...(search && { name: { contains: search, mode: "insensitive" } }),
            ...(dateFilter.gte && { createdAt: dateFilter }),
        };

        const mealWhere = {
            userId,
            ...(deviceId && { deviceId }),
            ...(search && { name: { contains: search, mode: "insensitive" } }),
            ...(dateFilter.gte && { createdAt: dateFilter }),
        };

        // ---------------------------
        // FETCH DATA
        // ---------------------------
        const [foods, userFoods, meals] = await Promise.all([
            db.food.findMany({
                where: foodWhere,
                orderBy: { createdAt: "desc" },
            }),
            db.userFood.findMany({
                where: userFoodWhere,
                orderBy: { createdAt: "desc" },
            }),
            db.meal.findMany({
                where: mealWhere,
                orderBy: { createdAt: "desc" },
                include: {
                    foods: {
                        include: {
                            food: true,
                            userFood: true,
                            quickAdd: true,
                        },
                    },
                },
            }),
        ]);

        // ---------------------------
        // FORMAT MEALS
        // ---------------------------
        const formattedMeals = meals.map((meal) => ({
            id: meal.id,
            type: "meal",
            name: meal.name,
            mealType: meal.mealType,
            createdAt: meal.createdAt,
            updatedAt: meal.updatedAt,
            foods: meal.foods
                .map((item) => {
                    if (item.food) {
                        return {
                            id: item.food.id,
                            type: "food",
                            name: item.food.name,
                            quantity: item.quantity,
                        };
                    }
                    if (item.userFood) {
                        return {
                            id: item.userFood.id,
                            type: "userFood",
                            name: item.userFood.name,
                            quantity: item.quantity,
                        };
                    }
                    if (item.quickAdd) {
                        return {
                            id: item.quickAdd.id,
                            type: "quickAdd",
                            name: "Quick Add",
                            quantity: item.quantity,
                        };
                    }
                    return null;
                })
                .filter(Boolean),
        }));

        // ---------------------------
        // MERGE ALL DATA INTO SINGLE ARRAY
        // ---------------------------
        const mergedData = [
            ...foods.map((f) => ({ id: f.id, type: "food", name: f.name, createdAt: f.createdAt, updatedAt: f.updatedAt })),
            ...userFoods.map((uf) => ({ id: uf.id, type: "userFood", name: uf.name, createdAt: uf.createdAt, updatedAt: uf.updatedAt })),
            ...formattedMeals,
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // latest first

        // ---------------------------
        // PAGINATION
        // ---------------------------
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
                    searchUsed: search || null,
                    dateFilterUsed:
                        dateStr || (fromStr && toStr)
                            ? dateStr
                                ? { date: dateStr }
                                : { from: fromStr, to: toStr }
                            : null,
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
