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

    const { name, mealType, foods } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { message: "Meal name is required" },
        { status: 400 }
      );
    }

    if (!Object.values(MealType).includes(mealType)) {
      return NextResponse.json(
        { message: "Invalid meal type" },
        { status: 400 }
      );
    }

    // Prepare MealFood data
    const mealFoodsData = Array.isArray(foods)
      ? foods.map((f) => ({
        foodId: f.foodId ?? null,
        userFoodId: f.userFoodId ?? null,
        quickAddId: f.quickAddId ?? null,
        quantity: f.quantity ?? 1,
      }))
      : [];

    // Create Meal
    const meal = await db.meal.create({
      data: {
        name,
        userId,
        deviceId,
        mealType,
        foods: {
          create: mealFoodsData,
        },
      },
      include: {
        foods: true,
      },
    });

    return NextResponse.json({
      message: "Meal created successfully",
      data: meal,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Failed to create meal", error: error.message },
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

    // ---------------------------
    // EXTRACT SEARCH PARAMS
    // ---------------------------
    const mealType = searchParams.get("mealType") || undefined;
    const date = searchParams.get("date") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    // ---------------------------
    // BUILD FILTERS
    // ---------------------------
    const whereClause = {
      userId,
      ...(mealType && { mealType }),
      ...(deviceId && { deviceId }),
      ...(date && { date }),
      ...(from &&
        to && {
        date: {
          gte: from,
          lte: to,
        },
      }),
    };

    // ---------------------------
    // FETCH MEALS
    // ---------------------------
    const meals = await db.meal.findMany({
      where: whereClause,
      include: { foods: true },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: "true",
      message: "Meals retrieved successfully",
      filters_used: whereClause,
      data: meals,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        success: "false",
        message: "Failed to retrieve meals",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

