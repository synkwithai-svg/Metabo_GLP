import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
    try {
        const body = await req.json();
        let { userId, deviceId, medicationId, date, dosage, site, painLevel, notes } = body;

        // Validate that either userId or deviceId is provided
        if (!userId && !deviceId) {
            return NextResponse.json(
                { success: false, message: "Either userId or deviceId is required" },
                { status: 400 }
            );
        }

        // Validate required injection log fields
        if (!medicationId || !date || !dosage || !site) {
            return NextResponse.json(
                { success: false, message: "medicationId, date, dosage, and site are required" },
                { status: 400 }
            );
        }

        let user, device;

        // If userId is provided, fetch user and associated devices
        if (userId) {
            user = await db.user.findUnique({
                where: { id: userId },
                include: { devices: true },
            });

            if (!user) {
                return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
            }

            // If no deviceId provided, pick user's first device if exists
            if (!deviceId && user.devices.length > 0) {
                device = user.devices[0];
                deviceId = device.id;
            }
        }

        // If deviceId is provided (or got from user), validate it
        if (deviceId) {
            device = await db.device.findUnique({ where: { id: deviceId } });
            if (!device) {
                return NextResponse.json({ success: false, message: "Device not found" }, { status: 404 });
            }

            // Link device to user if not already linked
            if (userId && device.userId !== userId) {
                await db.device.update({
                    where: { id: deviceId },
                    data: { userId },
                });
            }
        }

        // Create the injection log
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
