import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
    try {
        const body = await req.json();
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid");
        const { medicationId, date, dosage, site, painLevel, notes } = body;

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

        const medication = await db.medication.findUnique({ where: { id: medicationId } });
        if (!medication) {
            return NextResponse.json({ success: false, message: "Medication not found" }, { status: 404 });
        }

        const [user, device] = await Promise.all([
            db.user.findUnique({ where: { id: userId } }),
            db.device.findUnique({ where: { id: deviceId } }),
        ]);

        if (!user) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        if (!device) return NextResponse.json({ success: false, message: "Device not found" }, { status: 404 });

        if (device.userId !== userId) {
            await db.device.update({ where: { id: deviceId }, data: { userId } });
        }

        // Get latest injection shot for this device + medication
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

        // ✅ Timing Validation
        const newInjectionDate = new Date(date);
        const latestInjectionLog = await db.injectionLog.findFirst({
            where: { medicationId, deviceId },
            orderBy: { date: "desc" },
        });

        if (injectionShot.isFirstDose) {
            // First injection: must be done on or after InjectionShot.CreatedAt
            const createdAt = new Date(injectionShot.CreatedAt);
            if (newInjectionDate < createdAt) {
                return NextResponse.json(
                    {
                        success: false,
                        message: `First injection cannot be before the shot creation date (${createdAt.toDateString()}).`,
                    },
                    { status: 400 }
                );
            }
        } else if (latestInjectionLog) {
            // Subsequent injections: must respect the "often_shots" interval (in days)
            const lastInjectionDate = new Date(latestInjectionLog.date);
            const nextAllowedDate = new Date(
                lastInjectionDate.getTime() + injectionShot.often_shots * 24 * 60 * 60 * 1000
            );

            if (newInjectionDate < nextAllowedDate) {
                return NextResponse.json(
                    {
                        success: false,
                        message: `Next injection is too early. You can inject only after ${nextAllowedDate.toDateString()}.`,
                    },
                    { status: 400 }
                );
            }
        }

        // ✅ Stock Validation
        const doseFloat = Number(dosage);
        const stockFloat = injectionShot.currentStock;

        if (stockFloat < doseFloat) {
            return NextResponse.json(
                { success: false, message: "Not enough stock for this injection" },
                { status: 400 }
            );
        }

        // Update injection shot (reduce stock)
        await db.injectionShot.update({
            where: { id: injectionShot.id },
            data: { currentStock: stockFloat - doseFloat, isFirstDose: false },
        });

        // Create injection log entry
        const injectionLog = await db.injectionLog.create({
            data: {
                userId,
                deviceId,
                medicationId,
                date: newInjectionDate,
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
