// import { NextResponse } from "next/server";
// import { db } from "@/lib/db";

// // Convert OZ ↔ ML
// const ozToMl = (oz) => oz * 29.5735;
// const mlToOz = (ml) => ml / 29.5735;

// export async function POST(req) {
//     try {
//         const body = await req.json();
//         const userId = req.headers.get("x-user-id");
//         const deviceId = req.headers.get("x-user-deviceid") || null;

//         if (!userId) {
//             return NextResponse.json({ message: "User ID header is required" }, { status: 400 });
//         }

//         const { date, consumedOZ, consumedML } = body;

//         if (!date) {
//             return NextResponse.json({ message: "Date is required" }, { status: 400 });
//         }

//         if (!consumedOZ && !consumedML) {
//             return NextResponse.json({ message: "Provide consumedOZ or consumedML" }, { status: 400 });
//         }

//         const logDate = new Date(date);

//         // Get or create water log
//         let waterLog = await db.waterLog.findFirst({ where: { userId, date: logDate } });

//         if (!waterLog) {
//             // ✅ FIXED: Changed from .update() to .create()
//             // Remove totalConsumed (has @default(0) in schema)
//             const createData = {
//                 user: {
//                     connect: { id: userId }
//                 },
//                 date: logDate,
//                 targets: []
//             };

//             // Only connect device if deviceId exists
//             if (deviceId) {
//                 createData.device = {
//                     connect: { id: deviceId }
//                 };
//             }

//             waterLog = await db.waterLog.create({
//                 data: createData
//             });
//         }

//         const consumedInMl = consumedML ?? (consumedOZ ? ozToMl(consumedOZ) : 0);
//         const consumedInOz = consumedOZ ?? (consumedML ? mlToOz(consumedML) : null);

//         // Save consumed entry
//         await db.consumedWater.create({
//             data: {
//                 consumedAt: new Date(),
//                 consumedML: consumedInMl,
//                 consumedOZ: consumedInOz,
//                 waterLogId: waterLog.id
//             },
//         });

//         // Recalculate totalConsumed
//         const total = await db.consumedWater.aggregate({
//             _sum: { consumedML: true },
//             where: { waterLogId: waterLog.id },
//         });

//         const finalTotal = total._sum.consumedML ?? 0;

//         await db.waterLog.update({
//             where: { id: waterLog.id },
//             data: { totalConsumed: finalTotal },
//         });

//         return NextResponse.json({
//             success: true,
//             message: "Consumed water logged",
//             consumedML: consumedInMl,
//             consumedOZ: consumedInOz,
//             totalConsumed: finalTotal,
//         });

//     } catch (error) {
//         console.error("Consumed API Error:", error);
//         return NextResponse.json(
//             { success: false, message: "Internal server error", error: { name: error.name, message: error.message } },
//             { status: 500 }
//         );
//     }
// }


import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Convert OZ ↔ ML
const ozToMl = (oz) => oz * 29.5735;
const mlToOz = (ml) => ml / 29.5735;

export async function POST(req) {
    try {
        const body = await req.json();
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid") || null;

        if (!userId) {
            return NextResponse.json({ message: "User ID header is required" }, { status: 400 });
        }

        const { date, consumedOZ, consumedML } = body;

        if (!date) {
            return NextResponse.json({ message: "Date is required" }, { status: 400 });
        }

        if (!consumedOZ && !consumedML) {
            return NextResponse.json({ message: "Provide consumedOZ or consumedML" }, { status: 400 });
        }

        const logDate = new Date(date);

        // Define start and end of day (UTC)
        const startOfDay = new Date(logDate);
        startOfDay.setUTCHours(0, 0, 0, 0);

        const endOfDay = new Date(logDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        // Check if water log exists for the day
        let waterLog = await db.waterLog.findFirst({
            where: {
                userId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });

        // If no water log exists, create one
        if (!waterLog) {
            waterLog = await db.waterLog.create({
                data: {
                    userId,
                    deviceId,
                    date: logDate,
                    totalConsumed: 0,
                    targets: [],
                },
            });
        }

        // Create consumed water entry
        const consumedInMl = consumedML ?? (consumedOZ ? ozToMl(consumedOZ) : 0);
        const consumedInOz = consumedOZ ?? (consumedML ? mlToOz(consumedML) : null);

        await db.consumedWater.create({
            data: {
                consumedAt: new Date(),
                consumedML: consumedInMl,
                consumedOZ: consumedInOz,
                waterLogId: waterLog.id,
            },
        });

        // Recalculate totalConsumed for the day
        const total = await db.consumedWater.aggregate({
            _sum: { consumedML: true },
            where: { waterLogId: waterLog.id },
        });

        const finalTotal = total._sum.consumedML ?? 0;

        await db.waterLog.update({
            where: { id: waterLog.id },
            data: { totalConsumed: finalTotal },
        });

        return NextResponse.json({
            success: true,
            message: "Consumed water logged",
            consumedML: consumedInMl,
            consumedOZ: consumedInOz,
            totalConsumed: finalTotal,
        });

    } catch (error) {
        console.error("Consumed API Error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error", error: { name: error.name, message: error.message } },
            { status: 500 }
        );
    }
}
