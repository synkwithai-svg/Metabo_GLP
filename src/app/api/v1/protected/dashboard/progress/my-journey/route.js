// import { NextResponse } from "next/server"
// import { db } from "@/lib/db"
// import { startOfDay, endOfDay } from "date-fns"
// import calculateBMI from "@/utils/calculate-bmi"

// function whereUserDevice(userId, deviceId) {
//     return deviceId ? { userId, deviceId } : { userId }
// }

// export async function GET(req) {
//     try {
//         const userId = req.headers.get("x-user-id")
//         const deviceId = req.headers.get("x-user-deviceid") || null

//         if (!userId) {
//             return NextResponse.json({ message: "User ID is required" }, { status: 400 })
//         }

//         const { searchParams } = new URL(req.url)
//         const queryDate = searchParams.get("date")

//         // ---------------------------------------------------
//         // 1. INITIAL (FIRST ONBOARDING ENTRY)
//         // ---------------------------------------------------
//         const onboarding = await db.onboarding.findFirst({
//             where: { userId },
//             orderBy: { createdAt: "asc" },
//             select: {
//                 createdAt: true,
//                 current_weight_kg: true,
//                 height_cm: true,
//                 height_ft: true,
//                 height_in: true,
//             },
//         })

//         if (!onboarding) {
//             return NextResponse.json({
//                 success: true,
//                 initial: null,
//                 today: null,
//                 injections: { totalCount: 0, todayCount: 0 },
//                 chart: [],
//             })
//         }

//         const initialDate = startOfDay(onboarding.createdAt)
//         const initialWeight = onboarding.current_weight_kg

//         // ---------------------------------------------------
//         // 2. SELECTED DATE - HANDLE UTC PROPERLY
//         // ---------------------------------------------------
//         let selectedDate;

//         // console.log("QUERY DATE:", queryDate);

//         if (queryDate) {
//             // Parse the date string as UTC by appending 'Z' or using UTC ISO format
//             // This prevents timezone conversion issues
//             const utcDateString = queryDate.includes('T') ? queryDate : `${queryDate}T00:00:00.000Z`;
//             selectedDate = new Date(utcDateString);
//         } else {
//             // Today in UTC
//             selectedDate = new Date();
//         }

//         // console.log("SELECTED DATE:", selectedDate);

//         // Get start and end of day in UTC
//         const selectedDateStart = new Date(Date.UTC(
//             selectedDate.getUTCFullYear(),
//             selectedDate.getUTCMonth(),
//             selectedDate.getUTCDate(),
//             0, 0, 0, 0
//         ));

//         const selectedDateEnd = new Date(Date.UTC(
//             selectedDate.getUTCFullYear(),
//             selectedDate.getUTCMonth(),
//             selectedDate.getUTCDate(),
//             23, 59, 59, 999
//         ));

//         const todayDate = selectedDateStart;

//         // ---------------------------------------------------
//         // 3. GET HEIGHT CLOSEST TO SELECTED DATE
//         // ---------------------------------------------------
//         const heightLog = await db.height.findFirst({
//             where: {
//                 userId,
//                 createdAt: { lte: selectedDateEnd },
//             },
//             orderBy: { createdAt: "desc" },
//         })

//         const heightCm =
//             heightLog?.height_cm ||
//             (heightLog?.height_ft && heightLog?.height_in
//                 ? heightLog.height_ft * 30.48 + heightLog.height_in * 2.54
//                 : onboarding.height_cm ||
//                 (onboarding.height_ft && onboarding.height_in
//                     ? onboarding.height_ft * 30.48 + onboarding.height_in * 2.54
//                     : null))

//         // ---------------------------------------------------
//         // 4. TODAY WEIGHT LOG - GET LATEST UP TO SELECTED DATE
//         // ---------------------------------------------------
//         let todayLog = await db.weightlog.findFirst({
//             where: {
//                 ...whereUserDevice(userId, deviceId),
//                 date: { gte: selectedDateStart, lte: selectedDateEnd },
//             },
//             orderBy: { date: "desc" },
//         })

//         // If no log exists for the selected date, get the latest previous one
//         if (!todayLog) {
//             todayLog = await db.weightlog.findFirst({
//                 where: {
//                     ...whereUserDevice(userId, deviceId),
//                     date: { lt: selectedDateStart },
//                 },
//                 orderBy: { date: "desc" },
//             })
//         }

//         // ---------------------------------------------------
//         // 5. PHOTO FOR TODAY LOG
//         // ---------------------------------------------------
//         const photo = todayLog
//             ? await db.photo.findFirst({
//                 where: {
//                     userId,
//                     ...(deviceId ? { deviceId } : {}),
//                     createdAt: {
//                         gte: startOfDay(todayLog.date),
//                         lte: endOfDay(todayLog.date),
//                     },
//                 },
//                 orderBy: { createdAt: "desc" },
//             })
//             : null

//         // ---------------------------------------------------
//         // 6. INJECTIONS COUNT
//         // ---------------------------------------------------
//         const totalInjections = await db.injectionLog.count({
//             where: {
//                 ...whereUserDevice(userId, deviceId),
//                 date: { lte: selectedDateEnd },
//             },
//         })

//         const todayInjections = await db.injectionLog.count({
//             where: {
//                 ...whereUserDevice(userId, deviceId),
//                 date: { gte: selectedDateStart, lte: selectedDateEnd },
//             },
//         })

//         // ---------------------------------------------------
//         // 7. CHART (INCLUDE SELECTED DATE ALWAYS)
//         // ---------------------------------------------------
//         const rawLogs = await db.weightlog.findMany({
//             where: {
//                 ...whereUserDevice(userId, deviceId),
//                 date: { gte: initialDate, lte: selectedDateEnd },
//             },
//             orderBy: { date: "asc" },
//         })

//         const weightByDate = {}
//         rawLogs.forEach((l) => {
//             // Format date in UTC to avoid timezone shifts
//             const dateUTC = new Date(l.date);
//             const d = dateUTC.toISOString().split("T")[0];
//             weightByDate[d] = l.current_weight_kg
//         })

//         // Format selected date in UTC
//         const selectedISO = selectedDate.toISOString().split("T")[0];

//         if (!weightByDate[selectedISO]) {
//             const prevWeightLog = await db.weightlog.findFirst({
//                 where: {
//                     ...whereUserDevice(userId, deviceId),
//                     date: { lt: selectedDateStart },
//                 },
//                 orderBy: { date: "desc" },
//             })

//             weightByDate[selectedISO] = prevWeightLog?.current_weight_kg || initialWeight
//         }

//         const sortedDates = Object.keys(weightByDate).sort()

//         const chart = sortedDates.map((d) => ({
//             date: d,
//             weight: weightByDate[d],
//         }))

//         // ---------------------------------------------------
//         // 8. BMI BASED ON SELECTED DATE
//         // ---------------------------------------------------
//         let selectedDateLog = await db.weightlog.findFirst({
//             where: {
//                 ...whereUserDevice(userId, deviceId),
//                 date: { gte: selectedDateStart, lte: selectedDateEnd },
//             },
//             orderBy: { date: "desc" },
//         })

//         if (!selectedDateLog) {
//             selectedDateLog = await db.weightlog.findFirst({
//                 where: {
//                     ...whereUserDevice(userId, deviceId),
//                     date: { lt: selectedDateStart },
//                 },
//                 orderBy: { date: "desc" },
//             })
//         }

//         const selectedWeight = selectedDateLog?.current_weight_kg || initialWeight

//         const bmi = calculateBMI(selectedWeight, heightCm)

//         // ---------------------------------------------------
//         // 9. RESPONSE - FORMAT DATES IN UTC
//         // ---------------------------------------------------
//         return NextResponse.json({
//             success: true,

//             initial: {
//                 date: new Date(initialDate).toISOString().split("T")[0],
//                 weight: initialWeight,
//                 bmi: calculateBMI(initialWeight, heightCm).index,
//             },

//             bmi,

//             today: {
//                 date: selectedISO,
//                 weight: todayLog?.current_weight_kg || null,
//                 photo: photo?.photoUrl || null,
//                 bmi: todayLog?.current_weight_kg ? calculateBMI(todayLog.current_weight_kg, heightCm).index : null,
//             },

//             injections: {
//                 totalCount: totalInjections,
//                 todayCount: todayInjections,
//             },

//             chart,
//         })
//     } catch (error) {
//         console.error("MY-JOURNEY ERROR:", error)
//         return NextResponse.json(
//             { success: false, message: "Internal Server Error", error: error.message },
//             { status: 500 },
//         )
//     }
// }


import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { startOfDay, endOfDay } from "date-fns"
import calculateBMI from "@/utils/calculate-bmi"

function whereUserDevice(userId, deviceId) {
    return deviceId ? { userId, deviceId } : { userId }
}

export async function GET(req) {
    try {
        const userId = req.headers.get("x-user-id")
        const deviceId = req.headers.get("x-user-deviceid") || null

        if (!userId) {
            return NextResponse.json({ message: "User ID is required" }, { status: 400 })
        }

        const { searchParams } = new URL(req.url)
        const queryDate = searchParams.get("date")

        // ---------------------------------------------------
        // 1. INITIAL (FIRST ONBOARDING ENTRY)
        // ---------------------------------------------------
        const onboarding = await db.onboarding.findFirst({
            where: { userId },
            orderBy: { createdAt: "asc" },
            select: {
                createdAt: true,
                current_weight_kg: true,
                height_cm: true,
                height_ft: true,
                height_in: true,
            },
        })

        if (!onboarding) {
            return NextResponse.json({
                success: true,
                initial: null,
                today: null,
                injections: { totalCount: 0, todayCount: 0 },
                chart: [],
            })
        }

        const initialDate = startOfDay(onboarding.createdAt)
        const initialWeight = onboarding.current_weight_kg

        // ---------------------------------------------------
        // 2. SELECTED DATE - HANDLE UTC PROPERLY
        // ---------------------------------------------------
        let selectedDate;

        if (queryDate) {
            // Parse the date string as UTC by appending 'Z' or using UTC ISO format
            // This prevents timezone conversion issues
            const utcDateString = queryDate.includes('T') ? queryDate : `${queryDate}T00:00:00.000Z`;
            selectedDate = new Date(utcDateString);
        } else {
            // Today in UTC
            selectedDate = new Date();
        }

        // Get start and end of day in UTC
        const selectedDateStart = new Date(Date.UTC(
            selectedDate.getUTCFullYear(),
            selectedDate.getUTCMonth(),
            selectedDate.getUTCDate(),
            0, 0, 0, 0
        ));

        const selectedDateEnd = new Date(Date.UTC(
            selectedDate.getUTCFullYear(),
            selectedDate.getUTCMonth(),
            selectedDate.getUTCDate(),
            23, 59, 59, 999
        ));

        const todayDate = selectedDateStart;

        // ---------------------------------------------------
        // 3. GET HEIGHT CLOSEST TO SELECTED DATE
        // ---------------------------------------------------
        const heightLog = await db.height.findFirst({
            where: {
                userId,
                createdAt: { lte: selectedDateEnd },
            },
            orderBy: { createdAt: "desc" },
        })

        const heightCm =
            heightLog?.height_cm ||
            (heightLog?.height_ft && heightLog?.height_in
                ? heightLog.height_ft * 30.48 + heightLog.height_in * 2.54
                : onboarding.height_cm ||
                (onboarding.height_ft && onboarding.height_in
                    ? onboarding.height_ft * 30.48 + onboarding.height_in * 2.54
                    : null))

        // ---------------------------------------------------
        // 4. TODAY WEIGHT LOG - GET LATEST UP TO SELECTED DATE
        // ---------------------------------------------------
        let todayLog = await db.weightlog.findFirst({
            where: {
                ...whereUserDevice(userId, deviceId),
                date: { gte: selectedDateStart, lte: selectedDateEnd },
            },
            orderBy: { date: "desc" },
        })

        // If no log exists for the selected date, get the latest previous one
        if (!todayLog) {
            todayLog = await db.weightlog.findFirst({
                where: {
                    ...whereUserDevice(userId, deviceId),
                    date: { lt: selectedDateStart },
                },
                orderBy: { date: "desc" },
            })
        }

        // ---------------------------------------------------
        // 5. PHOTO FOR TODAY LOG
        // ---------------------------------------------------
        const photo = todayLog
            ? await db.photo.findFirst({
                where: {
                    userId,
                    ...(deviceId ? { deviceId } : {}),
                    createdAt: {
                        gte: startOfDay(todayLog.date),
                        lte: endOfDay(todayLog.date),
                    },
                },
                orderBy: { createdAt: "desc" },
            })
            : null

        // ---------------------------------------------------
        // 6. INJECTIONS COUNT
        // ---------------------------------------------------
        const totalInjections = await db.injectionLog.count({
            where: {
                ...whereUserDevice(userId, deviceId),
                date: { lte: selectedDateEnd },
            },
        })

        const todayInjections = await db.injectionLog.count({
            where: {
                ...whereUserDevice(userId, deviceId),
                date: { gte: selectedDateStart, lte: selectedDateEnd },
            },
        })

        // ---------------------------------------------------
        // 7. CHART (INCLUDE SELECTED DATE ALWAYS)
        // ---------------------------------------------------
        const rawLogs = await db.weightlog.findMany({
            where: {
                ...whereUserDevice(userId, deviceId),
                date: { gte: initialDate, lte: selectedDateEnd },
            },
            orderBy: { date: "asc" },
        })

        const weightByDate = {}
        rawLogs.forEach((l) => {
            // Format date in UTC to avoid timezone shifts
            const dateUTC = new Date(l.date);
            const d = dateUTC.toISOString().split("T")[0];
            weightByDate[d] = l.current_weight_kg
        })

        // Format selected date in UTC
        const selectedISO = selectedDate.toISOString().split("T")[0];

        if (!weightByDate[selectedISO]) {
            const prevWeightLog = await db.weightlog.findFirst({
                where: {
                    ...whereUserDevice(userId, deviceId),
                    date: { lt: selectedDateStart },
                },
                orderBy: { date: "desc" },
            })

            weightByDate[selectedISO] = prevWeightLog?.current_weight_kg || initialWeight
        }

        const sortedDates = Object.keys(weightByDate).sort()

        const chart = sortedDates.map((d) => ({
            date: d,
            weight: weightByDate[d],
        }))

        // ---------------------------------------------------
        // 8. BMI BASED ON SELECTED DATE
        // ---------------------------------------------------
        let selectedDateLog = await db.weightlog.findFirst({
            where: {
                ...whereUserDevice(userId, deviceId),
                date: { gte: selectedDateStart, lte: selectedDateEnd },
            },
            orderBy: { date: "desc" },
        })

        if (!selectedDateLog) {
            selectedDateLog = await db.weightlog.findFirst({
                where: {
                    ...whereUserDevice(userId, deviceId),
                    date: { lt: selectedDateStart },
                },
                orderBy: { date: "desc" },
            })
        }

        const selectedWeight = selectedDateLog?.current_weight_kg || initialWeight

        const bmi = calculateBMI(selectedWeight, heightCm)

        // ---------------------------------------------------
        // 9. CALCULATE DIFFERENCE (WEIGHT CHANGE & DURATION)
        // ---------------------------------------------------
        const weightDifference = selectedWeight - initialWeight;

        // Calculate duration in days between onboarding and selected date
        const onboardingDateUTC = new Date(Date.UTC(
            initialDate.getUTCFullYear(),
            initialDate.getUTCMonth(),
            initialDate.getUTCDate()
        ));

        const durationDays = Math.floor(
            (selectedDateStart.getTime() - onboardingDateUTC.getTime()) / (1000 * 60 * 60 * 24)
        );

        const difference = {
            lostWeight: weightDifference <= 0 ? Math.abs(weightDifference).toFixed(2) : "0",
            increasedWeight: weightDifference > 0 ? weightDifference.toFixed(2) : "0",
            duration: durationDays,
        };

        // ---------------------------------------------------
        // 10. RESPONSE - FORMAT DATES IN UTC
        // ---------------------------------------------------
        return NextResponse.json({
            success: true,

            initial: {
                date: new Date(initialDate).toISOString().split("T")[0],
                weight: initialWeight,
                bmi: calculateBMI(initialWeight, heightCm).index,
            },

            bmi,

            today: {
                date: selectedISO,
                weight: todayLog?.current_weight_kg || null,
                photo: photo?.photoUrl || null,
                bmi: todayLog?.current_weight_kg ? calculateBMI(todayLog.current_weight_kg, heightCm).index : null,
            },

            difference,

            injections: {
                totalCount: totalInjections,
                todayCount: todayInjections,
            },

            chart,
        })
    } catch (error) {
        console.error("MY-JOURNEY ERROR:", error)
        return NextResponse.json(
            { success: false, message: "Internal Server Error", error: error.message },
            { status: 500 },
        )
    }
}