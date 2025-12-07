import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notificationCategories } from "@/lib/enums";

export async function GET(req) {
    try {
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-device-id") || null;

        if (!userId) {
            return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
        }

        // Fetch user global reminders toggle
        const user = await db.user.findUnique({
            where: { id: userId },
            select: { remindersEnabled: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Fetch all notification reminders for the user
        const reminders = await db.notificationReminder.findMany({
            where: {
                userId,
                OR: [{ deviceId }, { deviceId: null }],
            },
        });

        // Helper function to get reminder by category
        const getReminder = (cat) => reminders.find(r => r.category === cat);

        // Fetch next injection schedule
        const nextInjection = await db.nextInjectionShot.findFirst({
            where: { userId },
            orderBy: { Date: "asc" },
        });

        return NextResponse.json({
            remindersEnabled: user.remindersEnabled,
            reminders: {
                injectionSchedule: {
                    isEnabled: getReminder("INJECTION_SCHEDULE")?.isEnabled ?? false,
                    cronTime: nextInjection?.Date ?? null, // injection uses next injection date
                },
                breakfast: {
                    isEnabled: getReminder("BREAKFAST")?.isEnabled ?? false,
                    cronTime: getReminder("BREAKFAST")?.cronTime ?? null,
                },
                lunch: {
                    isEnabled: getReminder("LUNCH")?.isEnabled ?? false,
                    cronTime: getReminder("LUNCH")?.cronTime ?? null,
                },
                dinner: {
                    isEnabled: getReminder("DINNER")?.isEnabled ?? false,
                    cronTime: getReminder("DINNER")?.cronTime ?? null,
                },
                water: {
                    isEnabled: getReminder("WATER")?.isEnabled ?? false,
                    cronTime: getReminder("WATER")?.cronTime ?? null,
                },
                steps: {
                    isEnabled: getReminder("STEPS")?.isEnabled ?? false,
                    cronTime: getReminder("STEPS")?.cronTime ?? null,
                },
                weight: {
                    isEnabled: getReminder("WEIGHT")?.isEnabled ?? false,
                    cronTime: getReminder("WEIGHT")?.cronTime ?? null,
                },
            },
        });
    } catch (error) {
        console.error("NOTIFICATION GET ERROR:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-device-id") || null;

        if (!userId) {
            return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
        }

        const body = await req.json();
        const { remindersEnabled, category, isEnabled, cronTime } = body;

        // ✅ Validate remindersEnabled
        if (remindersEnabled !== undefined && typeof remindersEnabled !== "boolean") {
            return NextResponse.json({ error: "'remindersEnabled' must be true or false" }, { status: 400 });
        }

        // ✅ Validate category
        if (category && !Object.values(notificationCategories).includes(category)) {
            return NextResponse.json({ error: `'category' must be one of ${Object.values(notificationCategories).join(", ")}` }, { status: 400 });
        }

        // ✅ Validate cronTime for categories that require it
        if (
            category &&
            ["BREAKFAST", "LUNCH", "DINNER"].includes(category) &&
            !cronTime
        ) {
            return NextResponse.json({ error: `'cronTime' is required for category ${category}` }, { status: 400 });
        }

        // 1️⃣ Update global remindersEnabled if provided
        let updatedUser = null;
        if (typeof remindersEnabled === "boolean") {
            updatedUser = await db.user.update({
                where: { id: userId },
                data: { remindersEnabled },
            });
        }

        // 2️⃣ Update/create individual reminder if category is provided
        let updatedReminder = null;
        if (category) {
            const existing = await db.notificationReminder.findFirst({
                where: { userId, category, deviceId },
            });

            if (existing) {
                updatedReminder = await db.notificationReminder.update({
                    where: { id: existing.id },
                    data: {
                        isEnabled: isEnabled ?? true,
                        cronTime: cronTime ?? null,
                    },
                });
            } else {
                updatedReminder = await db.notificationReminder.create({
                    data: {
                        userId,
                        deviceId,
                        category,
                        isEnabled: isEnabled ?? true,
                        cronTime: cronTime ?? null,
                    },
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: "Reminder updated",
            updatedUser,
            updatedReminder,
        });
    } catch (error) {
        console.error("NOTIFICATION UPDATE ERROR:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
