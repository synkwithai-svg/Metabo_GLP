import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Unit conversion helpers
const lbsToKg = (lbs) => lbs * 0.453592;
const kgToLbs = (kg) => kg / 0.453592;
const ftToCm = (ft) => ft * 30.48;
const inToCm = (inch) => inch * 2.54;

export async function POST(req) {
  try {
    const body = await req.json();

    // Get userId & deviceId from middleware/proxy
    const userId = req.headers.get("x-user-id") || null;
    const deviceId = req.headers.get("x-user-deviceid") || null;

    if (!userId && !deviceId) {
      return NextResponse.json(
        { success: false, message: "Either userId or deviceId is required", data: {} },
        { status: 400 }
      );
    }

    // Required onboarding fields
    const requiredFields = [
      "name",
      "birthday",
      "gender",
      "glp_medication_on",
      "medicationId",
      "current_dose",
      "injection_device",
      "often_shots",
      "goal_duration",
      "frustrate_thing",
      "lifestyle",
      "protein_goal",
      "motivation",
    ];

    const missingFields = requiredFields.filter(
      (field) => body[field] === undefined || body[field] === null
    );

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, message: `Missing required fields: ${missingFields.join(", ")}`, data: {} },
        { status: 400 }
      );
    }

    // Weight & height validation & conversion
    const {
      current_weight_kg, current_weight_lb,
      weight_goal_kg, weight_goal_lb,
      height_cm, height_ft, height_in
    } = body;

    // At least one current weight
    if (!current_weight_kg && !current_weight_lb) {
      return NextResponse.json(
        { success: false, message: "At least one current weight (kg or lb) must be provided", data: {} },
        { status: 400 }
      );
    }

    // At least one weight goal
    if (!weight_goal_kg && !weight_goal_lb) {
      return NextResponse.json(
        { success: false, message: "At least one weight goal (kg or lb) must be provided", data: {} },
        { status: 400 }
      );
    }

    // At least one height
    if (!height_cm && !height_ft && !height_in) {
      return NextResponse.json(
        { success: false, message: "At least one height (cm, ft, or in) must be provided", data: {} },
        { status: 400 }
      );
    }

    // Convert weights
    const currentWeightKg = current_weight_kg ?? (current_weight_lb ? lbsToKg(current_weight_lb) : null);
    const currentWeightLb = current_weight_lb ?? (current_weight_kg ? kgToLbs(current_weight_kg) : null);
    const weightGoalKg = weight_goal_kg ?? (weight_goal_lb ? lbsToKg(weight_goal_lb) : null);
    const weightGoalLb = weight_goal_lb ?? (weight_goal_kg ? kgToLbs(weight_goal_kg) : null);

    // Convert heights
    const heightCm = height_cm ?? (height_ft && height_in ? ftToCm(height_ft) + inToCm(height_in) : height_ft ? ftToCm(height_ft) : height_in ? inToCm(height_in) : null);
    let heightFt = height_ft ?? (height_cm ? Math.floor(height_cm / 30.48) : null);
    let heightIn = height_in ?? (height_cm ? Math.round((height_cm / 2.54) % 12) : null);

    // Fetch user & device
    const user = userId ? await db.user.findUnique({ where: { id: userId } }) : null;
    const device = deviceId ? await db.device.findUnique({ where: { id: deviceId } }) : null;

    // Update user basic info
    if (user) {
      await db.user.update({
        where: { id: user.id },
        data: {
          name: body.name,
          birthday: body.birthday,
          gender: body.gender,
          isOnboarded: true,
        },
      });
    }

    // Upsert Onboarding
    const onboarding = await db.onboarding.upsert({
      where: user?.id ? { userId: user.id } : { deviceId: device?.id },
      update: {
        deviceId: device?.id || null,
        glp_medication_on: body.glp_medication_on,
        height_cm: heightCm,
        height_ft: heightFt,
        height_in: heightIn,
        current_weight_kg: currentWeightKg,
        current_weight_lb: currentWeightLb,
        weight_goal_kg: weightGoalKg,
        weight_goal_lb: weightGoalLb,
        goal_duration: body.goal_duration,
        frustrate_thing: body.frustrate_thing,
        lifestyle: body.lifestyle,
        protein_goal: body.protein_goal,
        motivation: body.motivation,
      },
      create: {
        userId: user?.id || null,
        deviceId: device?.id || null,
        glp_medication_on: body.glp_medication_on,
        height_cm: heightCm,
        height_ft: heightFt,
        height_in: heightIn,
        current_weight_kg: currentWeightKg,
        current_weight_lb: currentWeightLb,
        weight_goal_kg: weightGoalKg,
        weight_goal_lb: weightGoalLb,
        goal_duration: body.goal_duration,
        frustrate_thing: body.frustrate_thing,
        lifestyle: body.lifestyle,
        protein_goal: body.protein_goal,
        motivation: body.motivation,
      },
    });

    // Create InjectionShot
    const injectionShot = await db.injectionShot.create({
      data: {
        userId: user?.id || null,
        deviceId: device?.id || null,
        onboardingId: onboarding.id,
        medicationId: body.medicationId,
        current_dose: body.current_dose,
        injection_device: body.injection_device,
        often_shots: body.often_shots,
        currentStock: 0,
      },
    });

    // Fetch Medication info
    const medication = body.medicationId
      ? await db.medication.findUnique({
        where: { id: body.medicationId },
        select: { id: true, name: true },
      })
      : null;

    // Create Treatment
    const treatment = await db.treatment.create({
      data: {
        userId: user?.id || null,
        deviceId: device?.id || null,
        onboardingId: onboarding.id,
        injectionShotId: injectionShot.id,
        treatmentNotes: [],
      },
    });

    // Update device onboarded flag
    if (device) {
      await db.device.update({ where: { id: device.id }, data: { isOnboarded: true } });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Onboarding, injection shot & treatment created successfully",
        data: { onboarding, injectionShot, medication, treatment },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error saving onboarding details:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error while saving onboarding details",
        data: {},
      },
      { status: 500 }
    );
  }
}
