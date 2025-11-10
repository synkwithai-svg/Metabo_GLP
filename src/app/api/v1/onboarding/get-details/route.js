import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const deviceId = url.searchParams.get("deviceId");

    if (!userId && !deviceId) {
      return NextResponse.json(
        { success: false, message: "Either userId or deviceId is required" },
        { status: 400 }
      );
    }

    const where = {};
    if (userId && deviceId) where.AND = [{ userId }, { deviceId }];
    else if (userId) where.userId = userId;
    else if (deviceId) where.deviceId = deviceId;

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

    // ✅ FIX → use id instead of createdAt
    const injectionShot = await db.injectionShot.findFirst({
      where: { onboardingId: onboarding.id },
      orderBy: { id: "desc" },
    });

    let medication = null;
    if (injectionShot?.medicationId) {
      medication = await db.medication.findUnique({
        where: { id: injectionShot.medicationId },
        select: {
          id: true,
          name: true,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          onboarding,
          injectionShot,
          medication,
        },
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
}
