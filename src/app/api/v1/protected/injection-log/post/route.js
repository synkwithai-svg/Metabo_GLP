import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
    try {
        const body = await req.json();
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid");
        const { medicationId, date, dosage, site, painLevel, notes } = body;

        // Validate required fields
        if (!userId || !deviceId) {
            return NextResponse.json(
                { success: false, message: "userId and deviceId are required" },
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
            return NextResponse.json(
                { success: false, message: "Medication not found" },
                { status: 404 }
            );
        }

        // Ensure user and device exist
        const [user, device] = await Promise.all([
            db.user.findUnique({ where: { id: userId } }),
            db.device.findUnique({ where: { id: deviceId } }),
        ]);

        if (!user) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        if (!device) {
            return NextResponse.json({ success: false, message: "Device not found" }, { status: 404 });
        }

        // Link device to user if necessary
        if (device.userId !== userId) {
            await db.device.update({ where: { id: deviceId }, data: { userId } });
        }

        // Find latest injectionShot
        const injectionShot = await db.injectionShot.findFirst({
            where: { medicationId, deviceId },
            orderBy: { CreatedAt: "desc" },
        });

        if (!injectionShot) {
            return NextResponse.json(
                { success: false, message: "InjectionShot not found for this device" },
                { status: 404 }
            );
        }

        // Check stock
        const doseFloat = Number(dosage);
        const stockFloat = injectionShot.currentStock;

        if (stockFloat < doseFloat) {
            return NextResponse.json(
                { success: false, message: "Not enough stock for this injection" },
                { status: 400 }
            );
        }

        // Update stock
        await db.injectionShot.update({
            where: { id: injectionShot.id },
            data: { currentStock: stockFloat - doseFloat, isFirstDose: false },
        });

        // Create injection log
        const injectionLog = await db.injectionLog.create({
            data: {
                userId,
                deviceId,
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
