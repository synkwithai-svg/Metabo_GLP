import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Accept both single food and array of foods
export async function POST(req) {
    try {
        const body = await req.json();

        const userId = req.headers.get("x-user-id") || null;
        const deviceId = req.headers.get("x-user-deviceid") || null;

        if (!body) {
            return NextResponse.json({ message: "Request body is required" }, { status: 400 });
        }

        // Normalize to array for bulk support
        const foods = Array.isArray(body) ? body : [body];

        const results = [];

        for (const item of foods) {
            const { name, dataPerAmount = 100, dataPerUnit = "g", macros } = item;

            if (!name) {
                return NextResponse.json(
                    { message: "Food name is required" },
                    { status: 400 }
                );
            }

            // 1️⃣ Create Food
            const newFood = await db.food.create({
                data: {
                    name,
                    dataPerAmount,
                    dataPerUnit,
                    userId,
                    deviceId,
                },
            });

            let macroData = null;

            // 2️⃣ Create Macro if provided
            if (macros) {
                macroData = await db.macro.create({
                    data: {
                        calories: macros.calories || 0,
                        protein: macros.protein || 0,
                        carbs: macros.carbs || 0,
                        fat: macros.fat || 0,
                        fiber: macros.fiber || 0,
                        foodId: newFood.id,
                    },
                });
            }

            // 3️⃣ Append full food + macro to response
            results.push({
                ...newFood,
                macros: macroData,
            });
        }

        return NextResponse.json(
            {
                success: "true",
                message: "Food(s) added successfully",
                count: results.length,
                data: results,
            },
            { status: 201 }
        );

    } catch (error) {
        console.error("Error adding food:", error);
        return NextResponse.json(
            { message: "Server error", error: error.message },
            { status: 500 }
        );
    }
}
