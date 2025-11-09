import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      userId,
      deviceId,
      name,
      birthday,
      gender,
      glp_medication,
      glp_medication_on,
      current_dose,
      injection_device,
      often_shots,
      height,
      current_weight,
      current_goal,
      weight_goal,
      goal_duration,
      frustrate_thing,
      lifestyle,
      protein_goal,
      motivation,
    } = body;

    // Validate required fields
    if (!deviceId && !userId) {
      return NextResponse.json(
        { success: false, message: "Either deviceId or userId is required" },
        { status: 400 }
      );
    }

    let device;

    // If deviceId is provided, fetch the device
    if (deviceId) {
      device = await db.device.findUnique({ where: { id: deviceId } });
      if (!device) {
        return NextResponse.json(
          { success: false, message: "Device not found" },
          { status: 404 }
        );
      }
    }

    // If userId is provided, fetch the user and associate device
    if (userId) {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: { devices: true },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, message: "User not found" },
          { status: 404 }
        );
      }

      // If device exists but is not linked to this user, link it
      if (device && device.userId !== userId) {
        await db.device.update({
          where: { id: device.id },
          data: { userId },
        });
      }

      // If no deviceId provided, use user's first device if exists
      if (!device && user.devices.length > 0) {
        device = user.devices[0];
      }
    }

    // Upsert onboarding record
    let onboarding = await db.onboarding.upsert({
      where: { userId: userId || "" }, // unique onboarding per user
      update: {
        deviceId: device?.id || null,
        name,
        birthday,
        gender,
        glp_medication,
        glp_medication_on,
        current_dose,
        injection_device,
        often_shots,
        height,
        current_weight,
        current_goal,
        weight_goal,
        goal_duration,
        frustrate_thing,
        lifestyle,
        protein_goal,
        motivation,
      },
      create: {
        userId,
        deviceId: device?.id || null,
        name,
        birthday,
        gender,
        glp_medication,
        glp_medication_on,
        current_dose,
        injection_device,
        often_shots,
        height,
        current_weight,
        current_goal,
        weight_goal,
        goal_duration,
        frustrate_thing,
        lifestyle,
        protein_goal,
        motivation,
      },
    });

    // Mark device and user as onboarded
    if (device) {
      await db.device.update({
        where: { id: device.id },
        data: { isOnboarded: true },
      });
    }
    if (userId) {
      await db.user.update({
        where: { id: userId },
        data: { isOnboarded: true },
      });
    }

    return NextResponse.json({ success: true, onboarding }, { status: 200 });
  } catch (error) {
    console.error("Error saving onboarding details:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error while saving onboarding details",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
