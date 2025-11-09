import { db } from "@/lib/db";
import { NextResponse, NextRequest } from "next/server";

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
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Medication name is required" },
        { status: 400 }
      );
    }

    // Use update with a try-catch for “not found”
    const updatedMedication = await db.medication.update({
      where: { id },
      data: { name },
    });

    // Check if the medication belongs to the logged-in user
    if (updatedMedication.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized to edit this medication" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      medication: updatedMedication,
    });
  } catch (error) {
    // Prisma throws an error if the record is not found
    if (error.code === "P2025") {
      return NextResponse.json(
        { success: false, message: "Medication not found" },
        { status: 404 }
      );
    }

    console.error(error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
