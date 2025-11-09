import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    // Create a new Device record
    const device = await db.device.create({
      data: {
        // userId is optional here
      },
    });

    // Return the device ID under message and data
    return NextResponse.json(
      {
        message: "Device created successfully",
        data: { id: device.id },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating device:", error);
    return NextResponse.json(
      {
        message: "Failed to create device",
        data: null,
      },
      { status: 500 }
    );
  }
}
