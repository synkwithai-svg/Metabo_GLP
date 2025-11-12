import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  try {
    // Parse user info from headers set by middleware
    const userId = req.headers.get("x-user-id");
    const deviceId = req.headers.get("x-user-deviceid");

    if (!userId && !deviceId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Missing userId or deviceId in headers" },
        { status: 401 }
      );
    }

    // Build Prisma "where" condition
    const where = {};
    if (userId && deviceId) where.AND = [{ userId }, { deviceId }];
    else if (userId) where.userId = userId;
    else if (deviceId) where.deviceId = deviceId;

    // Fetch onboarding with related user and device
    const onboarding = await db.onboarding.findFirst({
      where,
      include: {
        user: true,
        device: true,
      },
    });

    if (!onboarding) {
      return NextResponse.json(
        { success: false, message: "Onboarding not found" },
        { status: 404 }
      );
    }

    // Fetch latest injection shot
    const injectionShot = await db.injectionShot.findFirst({
      where: { onboardingId: onboarding.id },
      orderBy: { id: "desc" }, // use id for latest
    });

    // Fetch medication info
    let medication = null;
    if (injectionShot?.medicationId) {
      medication = await db.medication.findUnique({
        where: { id: injectionShot.medicationId },
        select: { id: true, name: true },
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: { onboarding, injectionShot, medication },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching onboarding details:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error while fetching onboarding details",
        error: error.message,
      },
      { status: 500 }
    );
  }
};
