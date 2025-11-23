import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Conversion helpers
const kgToLb = (kg) => +(kg * 2.20462).toFixed(2);
const lbToKg = (lb) => +(lb / 2.20462).toFixed(2);

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

        const { date, current_weight_kg, current_weight_lb } = body;

        if (!date || (!current_weight_kg && !current_weight_lb)) {
            return NextResponse.json(
                { message: "Date and at least one of current_weight_kg or current_weight_lb is required" },
                { status: 400 }
            );
        }

        // Compute missing weight
        let kg = current_weight_kg ?? lbToKg(current_weight_lb);
        let lb = current_weight_lb ?? kgToLb(current_weight_kg);

        // Round to 2 decimal places
        kg = +kg.toFixed(2);
        lb = +lb.toFixed(2);

        const weightLog = await db.weightlog.create({
            data: {
                userId,
                deviceId,
                date: new Date(date),
                current_weight_kg: kg,
                current_weight_lb: lb,
            },
        });

        return NextResponse.json(
            {
                success: true,
                message: "Weight log created",
                weightLogId: weightLog.id,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("WeightLog Error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error", error: { name: error.name, message: error.message } },
            { status: 500 }
        );
    }
}
