import { db } from "@/lib/db";

export async function getUserAndDevice({
    userId,
    deviceId,
}) {
    let user = null;
    let device = null;

    // Case 1: userId is provided
    if (userId) {
        user = await db.user.findUnique({
            where: { id: userId },
            include: { devices: true },
        });

        if (!user) throw new Error("User not found");

        // Use first device if exists
        if (user.devices.length > 0) {
            device = user.devices[0];
        }
    }

    // Case 2: deviceId is provided
    if (deviceId) {
        device = await db.device.findUnique({
            where: { id: deviceId },
        });

        if (!device) throw new Error("Device not found");

        // If device is linked to a user
        if (device.userId) {
            user = user || (await db.user.findUnique({ where: { id: device.userId } }));
        }
    }

    return { user, device };
}
