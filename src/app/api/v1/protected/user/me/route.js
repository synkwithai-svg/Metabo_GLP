import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  try {
    const userId = req.headers.get("x-user-id");
    const deviceId = req.headers.get("x-user-deviceid");

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID header missing", data: null },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: { devices: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found", data: null },
        { status: 404 }
      );
    }

    // Find the requested device or fallback to the first device
    const device =
      user.devices.find((d) => d.id === deviceId) || user.devices[0] || null;

    return NextResponse.json(
      {
        success: true,
        message: "User profile fetched successfully",
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          birthday: user.birthday,
          gender: user.gender,
          role: user.role,
          isAnonymous: user.isAnonymous,
          isOnboarded: user.isOnboarded,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          provider: user.provider,
          providerUid: user.providerUid,
          device: device
            ? {
                id: device.id,
                platform: device.platform,
                createdAt: device.createdAt,
                updatedAt: device.updatedAt,
              }
            : null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
        data: null,
      },
      { status: 500 }
    );
  }
}
