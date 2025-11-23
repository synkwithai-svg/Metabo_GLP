import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
    try {
        const body = await req.json();
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid"); 
        const { nextInjectionShotId, medicationId, date, dosage, site, painLevel, notes } = body;

        if (!userId) {
            return NextResponse.json(
                { success: false, message: "userId is required" },
                { status: 400 }
            );
        }

        const user = await db.user.findUnique({ where: { id: userId } });
        if (!user) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

        let device = null;
        if (deviceId) {
            device = await db.device.findUnique({ where: { id: deviceId } });
            if (!device) return NextResponse.json({ success: false, message: "Device not found" }, { status: 404 });

            if (device.userId !== userId) {
                await db.device.update({ where: { id: deviceId }, data: { userId } });
            }
        }

        let injectionData;
        let nextShot = null;

        if (nextInjectionShotId) {
            nextShot = await db.nextInjectionShot.findUnique({ where: { id: nextInjectionShotId } });
            if (!nextShot) {
                return NextResponse.json({ success: false, message: "NextInjectionShot not found" }, { status: 404 });
            }

            injectionData = {
                medicationId: nextShot.medicationId,
                dosage: nextShot.dose,
                injection_device: nextShot.injection_device,
                site: nextShot.Injectionsite,
            };
        } else {
            if (!medicationId || !dosage || !site || !body.injection_device) {
                return NextResponse.json(
                    { success: false, message: "medicationId, dosage, injection_device, and site are required" },
                    { status: 400 }
                );
            }

            const medication = await db.medication.findUnique({ where: { id: medicationId } });
            if (!medication) return NextResponse.json({ success: false, message: "Medication not found" }, { status: 404 });

            injectionData = {
                medicationId,
                dosage,
                injection_device: body.injection_device,
                site,
            };
        }

        // Fetch latest InjectionShot for stock validation
        const injectionShot = await db.injectionShot.findFirst({
            where: {
                medicationId: injectionData.medicationId,
                ...(deviceId ? { deviceId } : { userId }), 
            },
            orderBy: { CreatedAt: "desc" },
        });

        if (!injectionShot) {
            return NextResponse.json(
                { success: false, message: "InjectionShot not found" },
                { status: 404 }
            );
        }

        // Validate Stock
        const doseFloat = Number(injectionData.dosage);
        const stockFloat = injectionShot.currentStock;
        if (stockFloat < doseFloat) {
            return NextResponse.json(
                { success: false, message: "Not enough stock for this injection" },
                { status: 400 }
            );
        }

        // Update InjectionShot stock
        await db.injectionShot.update({
            where: { id: injectionShot.id },
            data: { currentStock: stockFloat - doseFloat, isFirstDose: false },
        });

        // Create InjectionLog
        const injectionLog = await db.injectionLog.create({
            data: {
                userId,
                deviceId: deviceId || null,
                medicationId: injectionData.medicationId,
                date: new Date(date),
                dosage: injectionData.dosage,
                site: injectionData.site,
                painLevel: painLevel || 0,
                notes: notes || null,
            },
        });

        // Update treatment last injection
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
        }

        // Update NextInjectionShot date if used
        if (nextShot) {
            const newDate = new Date(injectionLog.date);
            newDate.setDate(newDate.getDate() + nextShot.often_shots); // Add often_shots days
            await db.nextInjectionShot.update({
                where: { id: nextShot.id },
                data: { Date: newDate },
            });
        }

        return NextResponse.json({ success: true, injectionLog }, { status: 201 });

    } catch (error) {
        console.error("Error creating injection log:", error);
        return NextResponse.json(
            { success: false, message: "Error creating injection log", error: error.message },
            { status: 500 }
        );
    }
}
