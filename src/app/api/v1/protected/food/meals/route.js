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
    // QUERY PARAMS
    // ---------------------------
    const type = searchParams.get("type") || "all"; // recent or all
    const mealType = searchParams.get("mealType") || undefined;
    const date = searchParams.get("date") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    // ---------------------------
    // PAGINATION (only for normal/all)
    // ---------------------------
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 20);
    const skip = (page - 1) * limit;

    // ---------------------------
    // WHERE CLAUSE
    // ---------------------------
    const whereClause = {
      userId,
      ...(deviceId && { deviceId }),
      ...(mealType && { mealType }),
      ...(!from && !to && date && { date }),
      ...(from &&
        to && {
        date: { gte: from, lte: to },
      }),
    };

    // ---------------------------
    // FETCH MEALS
    // ---------------------------
    let meals;
    let totalItems = 0;

    if (type === "recent") {
      meals = await db.meal.findMany({
        where: whereClause,
        include: {
          foods: {
            include: {
              food: { include: { macros: true } },
              userFood: { include: { macros: true } },
              quickAdd: { include: { macros: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      });
      totalItems = meals.length;
    } else {
      totalItems = await db.meal.count({ where: whereClause });

      meals = await db.meal.findMany({
        where: whereClause,
        include: {
          foods: {
            include: {
              food: { include: { macros: true } },
              userFood: { include: { macros: true } },
              quickAdd: { include: { macros: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      });
    }

    // ---------------------------
    // FORMAT OUTPUT WITH TOTAL CALORIES
    // ---------------------------
    const formattedMeals = meals.map((meal) => {
      let totalCalories = 0;

      const foods = meal.foods
        .map((item) => {
          let calories = 0;

          if (item.food) {
            // Sum all macros calories for this food
            calories = (item.food.macros?.reduce((sum, m) => sum + (m.calories || 0), 0) || 0) * item.quantity;
            totalCalories += calories;

            return {
              id: item.id,
              mealId: item.mealId,
              foodId: item.foodId,
              quantity: item.quantity,
              name: item.food.name,
              type: "food",
              food: item.food,
              calories,
            };
          }

          if (item.userFood) {
            calories = (item.userFood.macros?.reduce((sum, m) => sum + (m.calories || 0), 0) || 0) * item.quantity;
            totalCalories += calories;

            return {
              id: item.id,
              mealId: item.mealId,
              userFoodId: item.userFoodId,
              quantity: item.quantity,
              name: item.userFood.name,
              type: "userFood",
              userFood: item.userFood,
              calories,
            };
          }

          if (item.quickAdd) {
            calories = (item.quickAdd.macros?.reduce((sum, m) => sum + (m.calories || 0), 0) || 0) * item.quantity;
            totalCalories += calories;

            return {
              id: item.id,
              mealId: item.mealId,
              quickAddId: item.quickAddId,
              quantity: item.quantity,
              name: "Quick Add",
              type: "quickAdd",
              quickAdd: item.quickAdd,
              calories,
            };
          }

          return null;
        })
        .filter(Boolean);

      return {
        ...meal,
        foods,
        totalCalories,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Meals retrieved successfully",
        data: formattedMeals,
        meta: {
          page,
          limit,
          totalItems,
          totalPages: type === "recent" ? 1 : Math.ceil(totalItems / limit),
          count: formattedMeals.length,
          filters_used: whereClause,
          type,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Meal fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve meals",
        error: error.message,
      },
      { status: 500 }
    );
  }
}