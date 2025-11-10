// import { NextRequest, NextResponse } from "next/server";
// import { db } from "@/lib/db";
// import { getUserAndDevice } from "@/lib/getUserAndDevice";

// export async function POST(req) {
//   try {
//     const body = await req.json();

//     const requiredFields = [
//       "name",
//       "birthday",
//       "gender",
//       "glp_medication_on",
//       "medicationId",
//       "current_dose",
//       "injection_device",
//       "often_shots",
//       "height",
//       "current_weight",
//       "current_goal",
//       "weight_goal",
//       "goal_duration",
//       "frustrate_thing",
//       "lifestyle",
//       "protein_goal",
//       "motivation",
//     ];

//     // Check for missing fields
//     const missingFields = requiredFields.filter((field) => body[field] === undefined || body[field] === null);
//     if (missingFields.length > 0) {
//       return NextResponse.json({
//         success: false,
//         message: `Missing required fields: ${missingFields.join(", ")}`,
//         data: {},
//       }, { status: 400 });
//     }

//     const {
//       userId,
//       deviceId,
//       name,
//       birthday,
//       gender,
//       glp_medication_on,
//       medicationId,
//       current_dose,
//       injection_device,
//       often_shots,
//       height,
//       current_weight,
//       current_goal,
//       weight_goal,
//       goal_duration,
//       frustrate_thing,
//       lifestyle,
//       protein_goal,
//       motivation,
//     } = body;

//     if (!userId && !deviceId) {
//       return NextResponse.json({
//         success: false,
//         message: "Either userId or deviceId is required",
//         data: {},
//       }, { status: 400 });
//     }

//     // Validate types
//     if (typeof glp_medication_on !== "boolean") {
//       return NextResponse.json({
//         success: false,
//         message: "`glp_medication_on` must be a boolean",
//         data: {},
//       }, { status: 400 });
//     }

//     if (typeof often_shots !== "number" || often_shots < 0) {
//       return NextResponse.json({
//         success: false,
//         message: "`often_shots` must be a positive number",
//         data: {},
//       }, { status: 400 });
//     }

//     if (typeof medicationId !== "string") {
//       return NextResponse.json({
//         success: false,
//         message: "`medicationId` must be a string",
//         data: {},
//       }, { status: 400 });
//     }

//     const { user, device } = await getUserAndDevice({ userId, deviceId });

//     // Upsert onboarding
//     const onboarding = await db.onboarding.upsert({
//       where: user?.id
//         ? { userId: user.id }
//         : { deviceId: device?.id },

//       update: {
//         deviceId: device?.id || null,
//         name,
//         birthday,
//         gender,
//         glp_medication_on,
//         height: String(height),
//         current_weight: String(current_weight),
//         current_goal,
//         weight_goal: String(weight_goal),
//         goal_duration,
//         frustrate_thing,
//         lifestyle,
//         protein_goal,
//         motivation,
//       },

//       create: {
//         userId: user?.id || null,
//         deviceId: device?.id || null,
//         name,
//         birthday,
//         gender,
//         glp_medication_on,
//         height: String(height),
//         current_weight: String(current_weight),
//         current_goal,
//         weight_goal: String(weight_goal),
//         goal_duration,
//         frustrate_thing,
//         lifestyle,
//         protein_goal,
//         motivation,
//       },
//     });


//     // Create InjectionShot
//     const injectionShot = await db.injectionShot.create({
//       data: {
//         userId: user?.id || null,
//         deviceId: device?.id || null,
//         onboardingId: onboarding.id,
//         medicationId,
//         current_dose,
//         injection_device,
//         often_shots,
//         currentStock: 0,
//       },
//     });

//     // ✅ Fetch medication name
//     let medication = null;
//     if (medicationId) {
//       medication = await db.medication.findUnique({
//         where: { id: medicationId },
//         select: { id: true, name: true },
//       });
//     }

//     // Mark user and device onboarded
//     if (device) await db.device.update({ where: { id: device.id }, data: { isOnboarded: true } });
//     if (user) await db.user.update({ where: { id: user.id }, data: { isOnboarded: true } });

//     return NextResponse.json({
//       success: true,
//       message: "Onboarding and injection shot created successfully",
//       data: { onboarding, injectionShot, medication },
//     }, { status: 200 });
//   } catch (error) {
//     console.error("Error saving onboarding details:", error);
//     return NextResponse.json({
//       success: false,
//       message: error.message || "Error while saving onboarding details",
//       data: {},
//     }, { status: 500 });
//   }
// }




import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserAndDevice } from "@/lib/getUserAndDevice";

export async function POST(req) {
  try {
    const body = await req.json();

    const requiredFields = [
      "name",
      "birthday",
      "gender",
      "glp_medication_on",
      "medicationId",
      "current_dose",
      "injection_device",
      "often_shots",
      "height",
      "current_weight",
      "current_goal",
      "weight_goal",
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
        {
          success: false,
          message: `Missing required fields: ${missingFields.join(", ")}`,
          data: {},
        },
        { status: 400 }
      );
    }

    const {
      userId,
      deviceId,
      name,
      birthday,
      gender,
      glp_medication_on,
      medicationId,
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

    if (!userId && !deviceId) {
      return NextResponse.json(
        {
          success: false,
          message: "Either userId or deviceId is required",
          data: {},
        },
        { status: 400 }
      );
    }

    if (typeof glp_medication_on !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          message: "`glp_medication_on` must be a boolean",
          data: {},
        },
        { status: 400 }
      );
    }

    if (typeof often_shots !== "number" || often_shots < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "`often_shots` must be a positive number",
          data: {},
        },
        { status: 400 }
      );
    }

    if (typeof medicationId !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "`medicationId` must be a string",
          data: {},
        },
        { status: 400 }
      );
    }

    const { user, device } = await getUserAndDevice({ userId, deviceId });

    // ✅ UPSERT ONBOARDING
    const onboarding = await db.onboarding.upsert({
      where: user?.id
        ? { userId: user.id }
        : { deviceId: device?.id },

      update: {
        deviceId: device?.id || null,
        name,
        birthday,
        gender,
        glp_medication_on,
        height: String(height),
        current_weight: String(current_weight),
        current_goal,
        weight_goal: String(weight_goal),
        goal_duration,
        frustrate_thing,
        lifestyle,
        protein_goal,
        motivation,
      },

      create: {
        userId: user?.id || null,
        deviceId: device?.id || null,
        name,
        birthday,
        gender,
        glp_medication_on,
        height: String(height),
        current_weight: String(current_weight),
        current_goal,
        weight_goal: String(weight_goal),
        goal_duration,
        frustrate_thing,
        lifestyle,
        protein_goal,
        motivation,
      },
    });

    // ✅ CREATE INJECTION SHOT
    const injectionShot = await db.injectionShot.create({
      data: {
        userId: user?.id || null,
        deviceId: device?.id || null,
        onboardingId: onboarding.id,
        medicationId,
        current_dose,
        injection_device,
        often_shots,
        currentStock: 0,
      },
    });

    // ✅ FETCH MEDICATION NAME
    let medication = null;
    if (medicationId) {
      medication = await db.medication.findUnique({
        where: { id: medicationId },
        select: { id: true, name: true },
      });
    }

    // ✅ CREATE TREATMENT
    const treatment = await db.treatment.create({
      data: {
        userId: user?.id || null,
        deviceId: device?.id || null,
        onboardingId: onboarding.id,
        injectionShotId: injectionShot.id,
        treatmentNotes: [],
      },
    });

    // ✅ UPDATE isOnboarded FLAG
    if (device)
      await db.device.update({
        where: { id: device.id },
        data: { isOnboarded: true },
      });

    if (user)
      await db.user.update({
        where: { id: user.id },
        data: { isOnboarded: true },
      });

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
