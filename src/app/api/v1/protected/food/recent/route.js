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

        // Get recent FoodLogItems with food, userFood, quickAdd relations
        const recentLogs = await db.foodLogItem.findMany({
            where: {
                log: { userId },
            },
            select: {
                foodId: true,
                userFoodId: true,
                quickAddId: true,
                log: {
                    select: {
                        loggedAt: true,
                    },
                },
            },
            orderBy: {
                log: { loggedAt: "desc" },
            },
            take: 30, // recent 30 unique entries, adjust as needed
        });

        // Collect unique IDs
        const foodIds = [
            ...new Set(recentLogs.map((i) => i.foodId).filter(Boolean)),
        ];

        const userFoodIds = [
            ...new Set(recentLogs.map((i) => i.userFoodId).filter(Boolean)),
        ];

        const quickAddIds = [
            ...new Set(recentLogs.map((i) => i.quickAddId).filter(Boolean)),
        ];

        // Fetch actual data
        const foods = await db.food.findMany({
            where: { id: { in: foodIds } },
        });

        const userFoods = await db.userFood.findMany({
            where: { id: { in: userFoodIds } },
        });

        const quickAdds = await db.quickAdd.findMany({
            where: { id: { in: quickAddIds } },
        });

        // Attach loggedAt to each item
        const formatted = [];

        recentLogs.forEach((log) => {
            const loggedAt = log.log.loggedAt;

            if (log.foodId) {
                const item = foods.find((f) => f.id === log.foodId);
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
                const item = userFoods.find((f) => f.id === log.userFoodId);
                if (item) {
                    formatted.push({
                        type: "userFood",
                        id: item.id,
                        loggedAt,
                        data: item,
                    });
                }
            }

            if (log.quickAddId) {
                const item = quickAdds.find((f) => f.id === log.quickAddId);
                if (item) {
                    formatted.push({
                        type: "quickAdd",
                        id: item.id,
                        loggedAt,
                        data: item,
                    });
                }
            }
        });

        // Deduplicate by ID + type → keep MOST recent only
        const uniqueMap = new Map();
        formatted.forEach((item) => {
            const key = `${item.type}-${item.id}`;
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, item);
            }
        });

        // Convert to list + sort by recent date
        const result = Array.from(uniqueMap.values()).sort(
            (a, b) => new Date(b.loggedAt) - new Date(a.loggedAt)
        );

        return NextResponse.json(
            {
                success: true,
                total: result.length,
                data: result,
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
