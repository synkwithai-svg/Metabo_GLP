import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { FoodSource } from "@/lib/enums";

export async function POST(req) {
    try {
        const body = await req.json();

        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid") || null;

        if (!userId) {
            return NextResponse.json({ message: "User ID header is required" }, { status: 400 });
        }

        const {
            name,
            servingSize,
            servingUnit,
            alternativeServingSizes,
            alternativeServingUnits,
            macros,
            foodSource,
        } = body;

        if (!name) {
            return NextResponse.json({ message: "Food name is required" }, { status: 400 });
        }

        if (!Object.values(FoodSource).includes(foodSource)) {
            return NextResponse.json({ message: "Invalid food source" }, { status: 400 });
        }

        // Prepare macros array safely
        const macrosData = Array.isArray(macros)
            ? macros.map((m) => ({
                energy: m.energy ?? null,
                calories: m.calories ?? null,
                protein: m.protein ?? null,
                carbs: m.carbs ?? null,
                fat: m.fat ?? null,
                fiber: m.fiber ?? null,
            }))
            : [];

        const userFood = await db.userFood.create({
            data: {
                name,
                userId,
                deviceId,
                FoodSource: foodSource,
                servingSize: servingSize ?? null,
                servingUnit: servingUnit ?? null,
                alternativeServingSizes: alternativeServingSizes ?? [],
                alternativeServingUnits: alternativeServingUnits ?? [],
                macros: {
                    create: macrosData,
                },
            },
            include: {
                macros: true,
            },
        });

        return NextResponse.json({ message: "User food created successfully", data: userFood });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Failed to create user food", error: error.message }, { status: 500 });
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

    // Query params
    const foodSource = searchParams.get("foodSource") || undefined;
    const name = searchParams.get("name") || undefined;

    const date = searchParams.get("date") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    const queryDevice = searchParams.get("deviceId") || undefined;

    // Pagination params
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause = {
      userId,

      ...(foodSource && { FoodSource: foodSource }),

      ...(name && {
        name: {
          contains: name,
          mode: "insensitive",
        },
      }),

      ...(queryDevice
        ? { deviceId: queryDevice }
        : deviceId
        ? { deviceId }
        : {}),

      // Exact date filter
      ...(date && {
        createdAt: {
          gte: new Date(`${date}T00:00:00`),
          lte: new Date(`${date}T23:59:59`),
        },
      }),

      // Date range filter
      ...(from &&
        to && {
          createdAt: {
            gte: new Date(`${from}T00:00:00`),
            lte: new Date(`${to}T23:59:59`),
          },
        }),
    };

    const userFoods = await db.userFood.findMany({
      where: whereClause,
      include: {
        macros: true,
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    });

    const total = await db.userFood.count({ where: whereClause });

    return NextResponse.json({
      success: true,
      message: "User foods fetched successfully",
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: whereClause,
      data: userFoods,
    });
  } catch (error) {
    console.error("GET user food error:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch user foods",
        error: error.message,
      },
      { status: 500 }
    );
  }
}