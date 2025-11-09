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

    // Build query dynamically
    const query = {};
    if (userId && deviceId) {
      query.AND = [{ userId }, { deviceId }];
    } else if (userId) {
      query.userId = userId;
    } else if (deviceId) {
      query.deviceId = deviceId;
    }

    // Fetch onboarding
    const onboarding = await db.onboarding.findFirst({
      where: query,
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

    return NextResponse.json({ success: true, onboarding }, { status: 200 });
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
