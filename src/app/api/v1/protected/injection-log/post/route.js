import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
    try {
        // console.log("=== 🚀 Injection Log API Started ===");

        const body = await req.json();
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid");

        const { medicationId, date, dosage, site, painLevel, notes } = body;

        // console.log("📌 UserId:", userId);
        // console.log("📌 DeviceId:", deviceId);
        // console.log("📌 Received Body:", body);

        if (!userId) {
            return NextResponse.json(
                { success: false, message: "userId is required" },
                { status: 400 }
            );
        }

        // Validate user
        const user = await db.user.findUnique({ where: { id: userId } });
        if (!user) {
            // console.log("❌ User not found!");
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        // Validate medication
        const medication = await db.medication.findUnique({ where: { id: medicationId } });
        if (!medication) {
            // console.log("❌ Medication not found!");
            return NextResponse.json(
                { success: false, message: "Medication not found" },
                { status: 404 }
            );
        }

        // Validate injection data
        if (!medicationId || !dosage || !site) {
            // console.log("❌ Missing required fields!");
            return NextResponse.json(
                { success: false, message: "medicationId, dosage, and site are required" },
                { status: 400 }
            );
        }

        // Fetch latest injection shot (for stock + often_shots)
        const injectionShot = await db.injectionShot.findFirst({
            where: {
                medicationId,
                ...(deviceId ? { deviceId } : { userId }),
            },
            orderBy: { CreatedAt: "desc" },
        });

        if (!injectionShot) {
            // console.log("❌ No InjectionShot found for user/device!");
            return NextResponse.json(
                { success: false, message: "InjectionShot not found" },
                { status: 404 }
            );
        }

        // console.log("📦 InjectionShot:", injectionShot);

        // Validate stock
        const doseFloat = Number(dosage);
        const stockFloat = injectionShot.currentStock;

        // console.log("📌 Stock check: Current =", stockFloat, " Required =", doseFloat);

        if (stockFloat < doseFloat) {
            // console.log("❌ Not enough stock!");
            return NextResponse.json(
                { success: false, message: "Not enough stock for this injection" },
                { status: 400 }
            );
        }

        // Update stock
        await db.injectionShot.update({
            where: { id: injectionShot.id },
            data: {
                currentStock: stockFloat - doseFloat,
                isFirstDose: false,
            },
        });

        // console.log("✔️ Stock updated!");

        // Create injection log
        const injectionLog = await db.injectionLog.create({
            data: {
                userId,
                deviceId: deviceId || null,
                medicationId,
                date: new Date(date),
                dosage,
                site,
                painLevel: painLevel || 0,
                notes: notes || null,
            },
        });

        // console.log("📝 Injection Log Created:", injectionLog);

        // Update latest treatment record
        const treatment = await db.treatment.findFirst({
            where: {
                userId,
                ...(deviceId ? { deviceId } : {}),
                injectionShotId: injectionShot.id,
            },
            orderBy: { updatedAt: "desc" },
        });

        if (treatment) {
            await db.treatment.update({
                where: { id: treatment.id },
                data: { lastInjectionId: injectionLog.id },
            });
            // console.log("✔️ Treatment updated with last injection");
        }

        // console.log("➡ Fetching NextInjectionShot automatically...");

        // Auto-fetch the next injection shot
        const nextShot = await db.nextInjectionShot.findFirst({
            where: {
                userId,
                medicationId,
                ...(deviceId ? { deviceId } : {}),
            },
            orderBy: { createdAt: "desc" },
        });

        // console.log("📌 Found nextShot:", nextShot ? nextShot.id : "None");

        if (nextShot) {
            // console.log("📌 often_shots:", injectionShot.often_shots);
            // console.log("📌 Injection Log Date:", injectionLog.date);

            const newDate = new Date(injectionLog.date);
            newDate.setDate(newDate.getDate() + injectionShot.often_shots);

            // console.log("📅 Calculated Next Injection Date:", newDate);

            await db.nextInjectionShot.update({
                where: { id: nextShot.id },
                data: { Date: newDate, notified: false },
            });

            // console.log("✔️ NextInjectionShot updated!");
        } else {
            // console.log("⚠️ No existing nextShot found → Skipping update.");
        }

        // console.log("=== ✅ Injection Log Process Completed ===");

        return NextResponse.json({ success: true, injectionLog }, { status: 201 });

    } catch (error) {
        console.error("❌ Error creating injection log:", error);
        return NextResponse.json(
            { success: false, message: "Error creating injection log", error: error.message },
            { status: 500 }
        );
    }
}
