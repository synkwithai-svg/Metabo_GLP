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
        const limit = parseInt(searchParams.get("limit") || "30", 10);
        const skip = (page - 1) * limit;

        // Fetch paginated log items (exclude quickAddId)
        const recentLogs = await db.foodLogItem.findMany({
            where: { log: { userId } },
            select: {
                foodId: true,
                userFoodId: true,
                log: { select: { loggedAt: true } },
            },
            orderBy: { log: { loggedAt: "desc" } },
            skip,
            take: limit,
        });

        // Collect unique IDs
        const foodIds = [...new Set(recentLogs.map(i => i.foodId).filter(Boolean))];
        const userFoodIds = [...new Set(recentLogs.map(i => i.userFoodId).filter(Boolean))];

        // Fetch related models
        const [foods, userFoods] = await Promise.all([
            db.food.findMany({ where: { id: { in: foodIds } } }),
            db.userFood.findMany({ where: { id: { in: userFoodIds } } }),
        ]);

        // Format response
        const formatted = [];

        recentLogs.forEach((log) => {
            const loggedAt = log.log.loggedAt;

            if (log.foodId) {
                const item = foods.find(f => f.id === log.foodId);
                if (item) {
                    formatted.push({
                        type: "food",
                        id: item.id,
                        loggedAt,
                        data: item,
                    });
                }
            }

            if (log.userFoodId) {
                const item = userFoods.find(f => f.id === log.userFoodId);
                if (item) {
                    formatted.push({
                        type: "userFood",
                        id: item.id,
                        loggedAt,
                        data: item,
                    });
                }
            }
        });

        // Deduplication
        const uniqueMap = new Map();
        formatted.forEach(item => {
            const key = `${item.type}-${item.id}`;
            if (!uniqueMap.has(key)) uniqueMap.set(key, item);
        });

        const result = Array.from(uniqueMap.values()).sort(
            (a, b) => new Date(b.loggedAt) - new Date(a.loggedAt)
        );

        // Count total items for meta
        const totalItems = await db.foodLogItem.count({
            where: { log: { userId } },
        });

        return NextResponse.json(
            {
                success: true,
                data: result,
                meta: {
                    page,
                    limit,
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit),
                    count: result.length,
                },
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error fetching recent foods:", error);
        return NextResponse.json(
            { message: "Server error", error: error.message },
            { status: 500 }
        );
    }
}
