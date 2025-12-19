import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
    try {
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid");

        if (!userId) {
            return NextResponse.json(
                { success: false, message: "User ID header is required" },
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

        const userPlan = await db.$transaction(async (tx) => {
            // 1️⃣ Check if plan exists
            const existingPlan = await tx.userPlan.findUnique({ where: { userId } });
            if (existingPlan) {
                throw new Error("User plan already exists");
            }

            const now = new Date();

            // 2️⃣ Find next upcoming injection
            let injection = await tx.nextInjectionShot.findFirst({
                where: { userId, Date: { gte: now } },
                orderBy: { Date: "asc" },
            });

            // 3️⃣ Fallback → last past injection
            if (!injection) {
                injection = await tx.nextInjectionShot.findFirst({
                    where: { userId, Date: { lt: now } },
                    orderBy: { Date: "desc" },
                });
            }

            // 4️⃣ Create plan (FK safe)
            return await tx.userPlan.create({
                data: {
                    userId,
                    ...(deviceId
                        ? { device: { connect: { id: deviceId } } }
                        : undefined),
                    energy,
                    calories,
                    protein,
                    carbs,
                    fat,
                    fiber,
                    stepsTarget,
                    waterTargetMl,
                    ...(injection
                        ? { nextInjectionShot: { connect: { id: injection.id } } }
                        : undefined),
                },
                include: { nextInjectionShot: true, device: true },
            });
        });

        return NextResponse.json({
            success: true,
            message: "User daily plan created",
            userPlan,
        });
    } catch (error) {
        console.error("Create Plan Error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Internal Server Error" },
            { status: error.message === "User plan already exists" ? 400 : 500 }
        );
    }
}



export async function PUT(req) {
    try {
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid");

        if (!userId) {
            return NextResponse.json(
                { success: false, message: "User ID header is required" },
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

        const updatedPlan = await db.$transaction(async (tx) => {
            // 1️⃣ Ensure plan exists
            const plan = await tx.userPlan.findUnique({ where: { userId } });
            if (!plan) throw new Error("User plan does not exist");

            const now = new Date();

            // 2️⃣ Get upcoming injection
            let injection = await tx.nextInjectionShot.findFirst({
                where: { userId, Date: { gte: now } },
                orderBy: { Date: "asc" },
            });

            // 3️⃣ Fallback → last past injection
            if (!injection) {
                injection = await tx.nextInjectionShot.findFirst({
                    where: { userId, Date: { lt: now } },
                    orderBy: { Date: "desc" },
                });
            }

            // 4️⃣ Update plan (relations handled correctly)
            return await tx.userPlan.update({
                where: { userId },
                data: {
                    energy,
                    calories,
                    protein,
                    carbs,
                    fat,
                    fiber,
                    stepsTarget,
                    waterTargetMl,

                    // ✅ Device relation
                    ...(deviceId
                        ? { device: { connect: { id: deviceId } } }
                        : { device: { disconnect: true } }
                    ),

                    // ✅ Injection relation
                    ...(injection
                        ? { nextInjectionShot: { connect: { id: injection.id } } }
                        : { nextInjectionShot: { disconnect: true } }
                    ),
                },
                include: { nextInjectionShot: true, device: true },
            });
        });

        return NextResponse.json({
            success: true,
            message: "User daily plan updated",
            updatedPlan,
        });
    } catch (error) {
        console.error("Update Plan Error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Internal Server Error" },
            { status: error.message === "User plan does not exist" ? 404 : 500 }
        );
    }
}



export async function GET(req) {
    try {
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid");

        if (!userId) {
            return NextResponse.json(
                { success: false, message: "User ID header is required" },
                { status: 400 }
            );
        }

        const userPlan = await db.$transaction(async (tx) => {
            // 1️⃣ Check existing plan
            const existingPlan = await tx.userPlan.findUnique({
                where: { userId },
                include: { nextInjectionShot: true },
            });

            if (existingPlan) {
                return existingPlan;
            }

            const now = new Date();

            // 2️⃣ Find NEXT upcoming injection
            let injection = await tx.nextInjectionShot.findFirst({
                where: {
                    userId,
                    Date: { gte: now },
                },
                orderBy: { Date: "asc" },
            });

            // 3️⃣ Fallback → last past injection (missed)
            if (!injection) {
                injection = await tx.nextInjectionShot.findFirst({
                    where: {
                        userId,
                        Date: { lt: now },
                    },
                    orderBy: { Date: "desc" },
                });
            }

            // 4️⃣ Create plan - FIXED
            return await tx.userPlan.create({
                data: {
                    userId,
                    deviceId: deviceId || null,
                    nextInjectionShotId: injection?.id || null,
                },
                include: {
                    nextInjectionShot: true,
                },
            });
        });

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

