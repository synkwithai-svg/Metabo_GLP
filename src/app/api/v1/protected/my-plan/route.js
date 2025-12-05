import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
    try {
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid") || null;

        if (!userId) {
            return NextResponse.json(
                { message: "User ID header is required" },
                { status: 400 }
            );
        }

        const body = await req.json();
        const {
            energy,
            calories,
            protein,
            carbs,
            fat,
            fiber,
            stepsTarget,
            waterTargetMl,
        } = body;

        // Check if user already has a plan
        const existingPlan = await db.userPlan.findUnique({
            where: { userId },
        });

        if (existingPlan) {
            return NextResponse.json(
                { message: "User plan already exists" },
                { status: 400 }
            );
        }

        // Find next injection shot (only one per user)
        const nextInjectionShot = await db.injectionShot.findFirst({
            where: { userId },
            orderBy: { CreatedAt: "asc" }, 
        });


        const userPlan = await db.userPlan.create({
            data: {
                userId,
                deviceId,
                energy,
                calories,
                protein,
                carbs,
                fat,
                fiber,
                stepsTarget,
                waterTargetMl,
                nextInjectionShotId: nextInjectionShot?.id || null,
            },
        });

        return NextResponse.json({
            success: true,
            message: "User daily plan created",
            userPlan,
        });
    } catch (error) {
        console.error("Create Plan Error:", error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}

export async function PUT(req) {
    try {
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid") || null;

        if (!userId) {
            return NextResponse.json(
                { message: "User ID header is required" },
                { status: 400 }
            );
        }

        const body = await req.json();
        const {
            energy,
            calories,
            protein,
            carbs,
            fat,
            fiber,
            stepsTarget,
            waterTargetMl,
        } = body;

        // Only update if plan exists
        const userPlan = await db.userPlan.findUnique({
            where: { userId },
        });

        if (!userPlan) {
            return NextResponse.json(
                { message: "User plan does not exist" },
                { status: 404 }
            );
        }

        // Find next injection shot (only one for user)
        const nextInjectionShot = await db.injectionShot.findFirst({
            where: { userId },
            orderBy: { date: "asc" },
        });

        const updatedPlan = await db.userPlan.update({
            where: { userId },
            data: {
                deviceId,
                energy,
                calories,
                protein,
                carbs,
                fat,
                fiber,
                stepsTarget,
                waterTargetMl,
                nextInjectionShotId: nextInjectionShot?.id || null,
            },
        });

        return NextResponse.json({
            success: true,
            message: "User daily plan updated",
            updatedPlan,
        });
    } catch (error) {
        console.error("Update Plan Error:", error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}

export async function GET(req) {
    try {
        const userId = req.headers.get("x-user-id");

        if (!userId) {
            return NextResponse.json(
                { message: "User ID header is required" },
                { status: 400 }
            );
        }


        const userPlan = await db.userPlan.findUnique({
            where: { userId },
            include: {
                nextInjectionShot: true,
            },
        });

        if (!userPlan) {
            return NextResponse.json(
                { message: "User plan not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "User daily plan retrieved",
            userPlan,
        });
    } catch (error) {
        console.error("Get Plan Error:", error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}