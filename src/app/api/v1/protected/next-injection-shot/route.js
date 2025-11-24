import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
    try {
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid");

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

        const nextInjectionShot = await db.nextInjectionShot.findFirst({
            where: {
                ...(deviceId ? { deviceId } : { userId }),
            },
            orderBy: { Date: "asc" },
        });

        if (!nextInjectionShot) {
            return NextResponse.json({ success: false, message: "NextInjectionShot not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, nextInjectionShot }, { status: 200 });

    } catch (error) {
        console.error("Error getting next injection shot:", error);
        return NextResponse.json(
            { success: false, message: "Error getting next injection shot", error: error.message },
            { status: 500 }
        );
    }
}

export async function PATCH(req) {
    try {
        const body = await req.json();
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid");
        const { medicationId, dose, injection_device, Injectionsite, Date } = body;

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

        const nextInjectionShot = await db.nextInjectionShot.findFirst({
            where: {
                ...(deviceId ? { deviceId } : { userId }),
            },
            orderBy: { Date: "asc" },
        });

        if (!nextInjectionShot) {
            return NextResponse.json({ success: false, message: "NextInjectionShot not found" }, { status: 404 });
        }

        const updatedNextShot = await db.nextInjectionShot.update({
            where: { id: nextInjectionShot.id },
            data: {
                medicationId: medicationId ?? nextInjectionShot.medicationId,
                dose: dose ?? nextInjectionShot.dose,
                injection_device: injection_device ?? nextInjectionShot.injection_device,
                Injectionsite: Injectionsite ?? nextInjectionShot.Injectionsite,
                Date: Date ? new Date(Date) : nextInjectionShot.Date,
            },
        });

        return NextResponse.json({ success: true, nextInjectionShot: updatedNextShot }, { status: 200 });

    } catch (error) {
        console.error("Error updating next injection shot:", error);
        return NextResponse.json(
            { success: false, message: "Error updating next injection shot", error: error.message },
            { status: 500 }
        );
    }
}
