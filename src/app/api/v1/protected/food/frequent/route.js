import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
    try {
        const userId = req.headers.get("x-user-id");

        if (!userId) {
            return NextResponse.json(
                { message: "User ID is required" },
                { status: 400 }
            );
        }

        // ---- PAGINATION ---- //
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "20", 10);
        const skip = (page - 1) * limit;

        // ---- 1️⃣ Frequency count for Food ---- //
        const foodCounts = await db.foodLogItem.groupBy({
            by: ["foodId"],
            where: {
                foodId: { not: null },
                log: { userId },
            },
            _count: { foodId: true },
        });

        // ---- 2️⃣ Frequency count for UserFood ---- //
        const userFoodCounts = await db.foodLogItem.groupBy({
            by: ["userFoodId"],
            where: {
                userFoodId: { not: null },
                log: { userId },
            },
            _count: { userFoodId: true },
        });

        const foodIds = foodCounts.map((f) => f.foodId);
        const userFoodIds = userFoodCounts.map((u) => u.userFoodId);

        // ---- Fetch data WITH MACROS ---- //
        const [foods, userFoods] = await Promise.all([
            db.food.findMany({
                where: { id: { in: foodIds } },
                include: { macros: true },
            }),
            db.userFood.findMany({
                where: { id: { in: userFoodIds } },
                include: { macros: true },
            }),
        ]);

        // ---- Extract calories helper ---- //
        const getCalories = (macros) => {
            if (!macros || macros.length === 0) return 0;
            return macros[0]?.calories || 0;
        };

        // ---- Format food items ---- //
        const formattedFoods = foodCounts.map((f) => {
            const data = foods.find((x) => x.id === f.foodId) || null;

            return {
                id: f.foodId,
                type: "food",
                count: f._count.foodId,
                calories: data ? getCalories(data.macros) : 0,
                data,
            };
        });

        // ---- Format user foods ---- //
        const formattedUserFoods = userFoodCounts.map((u) => {
            const data = userFoods.find((x) => x.id === u.userFoodId) || null;

            return {
                id: u.userFoodId,
                type: "userFood",
                count: u._count.userFoodId,
                calories: data ? getCalories(data.macros) : 0,
                data,
            };
        });

        // ---- Combine + Sort by frequency ---- //
        const combined = [...formattedFoods, ...formattedUserFoods].sort(
            (a, b) => b.count - a.count
        );

        // ---- Pagination ---- //
        const paginated = combined.slice(skip, skip + limit);

        return NextResponse.json(
            {
                success: true,
                data: paginated,
                meta: {
                    page,
                    limit,
                    totalItems: combined.length,
                    totalPages: Math.ceil(combined.length / limit),
                    count: paginated.length,
                },
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error fetching frequent foods:", error);
        return NextResponse.json(
            { message: "Server error", error: error.message },
            { status: 500 }
        );
    }
}
