import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
    try {
        const body = await req.json();
        let { userId, deviceId, medicationId, date, dosage, site, painLevel, notes } = body;

        // Validate required fields
        if (!userId && !deviceId) {
            return NextResponse.json(
                { success: false, message: "Either userId or deviceId is required" },
                { status: 400 }
            );
        }
        if (!medicationId || !date || !dosage || !site) {
            return NextResponse.json(
                { success: false, message: "medicationId, date, dosage, and site are required" },
                { status: 400 }
            );
        }

        // Check if medication exists
        const medication = await db.medication.findUnique({ where: { id: medicationId } });
        if (!medication) {
            return NextResponse.json({ success: false, message: "Medication not found" }, { status: 404 });
        }

        let user, device;

        // Fetch user if userId provided
        if (userId) {
            user = await db.user.findUnique({
                where: { id: userId },
                include: { devices: true },
            });
            if (!user) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

            // If no deviceId, pick the first device
            if (!deviceId && user.devices.length > 0) {
                device = user.devices[0];
                deviceId = device.id;
            }
        }

        // Fetch device if deviceId provided
        if (deviceId) {
            device = await db.device.findUnique({ where: { id: deviceId } });
            if (!device) return NextResponse.json({ success: false, message: "Device not found" }, { status: 404 });

            // Link device to user if necessary
            if (userId && device.userId !== userId) {
                await db.device.update({ where: { id: deviceId }, data: { userId } });
            }
        }

        // Find latest injectionShot
        let injectionShot = await db.injectionShot.findFirst({
            where: { medicationId, deviceId },
            orderBy: { CreatedAt: "desc" },
        });

        if (!injectionShot && deviceId) {
            injectionShot = await db.injectionShot.findFirst({
                where: { deviceId },
                orderBy: { CreatedAt: "desc" },
            });
        }

        if (!injectionShot && userId) {
            injectionShot = await db.injectionShot.findFirst({
                where: { userId },
                orderBy: { CreatedAt: "desc" },
            });
        }

        if (!injectionShot) {
            return NextResponse.json(
                { success: false, message: "InjectionShot not found for device or user" },
                { status: 404 }
            );
        }

        // Check stock
        const doseFloat = Number(dosage);
        const stockFloat = injectionShot.currentStock;

        if (stockFloat < doseFloat) {
            return NextResponse.json({ success: false, message: "Not enough stock for this injection" }, { status: 400 });
        }

        // Update injectionShot stock
        await db.injectionShot.update({
            where: { id: injectionShot.id },
            data: { currentStock: stockFloat - doseFloat, isFirstDose: false },
        });

        // Create injection log
        const injectionLog = await db.injectionLog.create({
            data: {
                userId: userId || null,
                deviceId: deviceId || null,
                medicationId,
                date: new Date(date),
                dosage,
                site,
                painLevel: painLevel || 0,
                notes: notes || null,
            },
        });

        return NextResponse.json({ success: true, injectionLog }, { status: 201 });
    } catch (error) {
        console.error("Error creating injection log:", error);
        return NextResponse.json(
            { success: false, message: "Error creating injection log", error: error.message },
            { status: 500 }
        );
    }
}
