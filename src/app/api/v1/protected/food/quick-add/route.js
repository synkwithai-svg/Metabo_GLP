import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MealType } from "@/lib/enums";

export async function POST(req) {
    try {
        const body = await req.json();

        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid") || null;

        if (!userId) {
            return NextResponse.json({ message: "User ID header is required" }, { status: 400 });
        }

        if (!body) {
            return NextResponse.json({ message: "Request body is required" }, { status: 400 });
        }

        const { mealType, loggedAt, macros } = body;

        // Validate mealType
        if (!mealType || !Object.values(MealType).includes(mealType)) {
            return NextResponse.json(
                { message: `Invalid mealType. Must be one of ${Object.values(MealType).join(", ")}` },
                { status: 400 }
            );
        }

        if (!loggedAt) {
            return NextResponse.json({ message: "loggedAt is required" }, { status: 400 });
        }

        // Create QuickAdd and its Macros in a transaction
        const newQuickAdd = await db.$transaction(async (prisma) => {
            const quickAdd = await prisma.quickAdd.create({
                data: {
                    userId,
                    deviceId,
                    mealType,
                    loggedAt: new Date(loggedAt),
                },
            });

            if (Array.isArray(macros) && macros.length > 0) {
                const macroPromises = macros.map((item) => {
                    const { energy, calories, protein, carbs, fat, fiber } = item;

                    return prisma.macro.create({
                        data: {
                            quickAddId: quickAdd.id,
                            energy: energy ?? null,
                            calories: calories ?? null,
                            protein: protein ?? null,
                            carbs: carbs ?? null,
                            fat: fat ?? null,
                            fiber: fiber ?? null,
                        },
                    });
                });

                await Promise.all(macroPromises);
            }

            // Return quickAdd with its macros
            return prisma.quickAdd.findUnique({
                where: { id: quickAdd.id },
                include: { macros: true },
            });
        });

        return NextResponse.json(
            {
                success: true,
                message: "QuickAdd with macros created successfully",
                data: newQuickAdd,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creating QuickAdd:", error);
        return NextResponse.json(
            { message: "Server error", error: error.message },
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
