import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(req, context) {
  const userId = req.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: Missing user ID" },
      { status: 401 }
    );
  }

  const { id } = await context.params;

  if (!id) {
    return NextResponse.json(
      { success: false, message: "Medication ID is required" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();

    // Fetch the medication first to verify ownership
    const existingMedication = await db.medication.findUnique({
      where: { id },
    });

    if (!existingMedication) {
      return NextResponse.json(
        { success: false, message: "Medication not found" },
        { status: 404 }
      );
    }

    if (existingMedication.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized to edit this medication" },
        { status: 403 }
      );
    }

    // Update all provided fields dynamically
    const updatedMedication = await db.medication.update({
      where: { id },
      data: {
        ...body, // allows updating name or PK values
      },
    });

    return NextResponse.json({
      success: true,
      medication: updatedMedication,
    });

  } catch (error) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { success: false, message: "Medication not found" },
        { status: 404 }
      );
    }

    console.error("PATCH medication error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
