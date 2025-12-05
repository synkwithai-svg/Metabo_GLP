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

        // 1️⃣ Get frequency count for Food
        const foodCounts = await db.foodLogItem.groupBy({
            by: ["foodId"],
            where: {
                foodId: { not: null },
                log: { userId },
            },
            _count: { foodId: true },
        });

        // 2️⃣ Get frequency count for UserFood
        const userFoodCounts = await db.foodLogItem.groupBy({
            by: ["userFoodId"],
            where: {
                userFoodId: { not: null },
                log: { userId },
            },
            _count: { userFoodId: true },
        });

        // Fetch actual food data
        const foodIds = foodCounts.map((f) => f.foodId);
        const userFoodIds = userFoodCounts.map((u) => u.userFoodId);

        const foods = await db.food.findMany({
            where: { id: { in: foodIds } },
        });

        const userFoods = await db.userFood.findMany({
            where: { id: { in: userFoodIds } },
        });

        // Merge with frequency counts
        const formattedFoods = foodCounts.map((f) => ({
            id: f.foodId,
            type: "food",
            count: f._count.foodId,
            data: foods.find((x) => x.id === f.foodId) || null,
        }));

        const formattedUserFoods = userFoodCounts.map((f) => ({
            id: f.userFoodId,
            type: "userFood",
            count: f._count.userFoodId,
            data: userFoods.find((x) => x.id === f.userFoodId) || null,
        }));

        // 3️⃣ Combine → sort by highest frequency
        const combined = [...formattedFoods, ...formattedUserFoods].sort(
            (a, b) => b.count - a.count
        );

        return NextResponse.json(
            {
                success: true,
                total: combined.length,
                data: combined,
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
