import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lbsToKg, kgToLbs, ftInToCm } from "@/utils/conversion";

// -------------------- POST --------------------
export async function POST(req) {
    try {
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid");

        if (!userId) {
            return NextResponse.json(
                { message: "User ID header is required" },
                { status: 400 }
            );
        }

        const body = await req.json();

        const {
            photoUrl,
            note,

            // Height
            height_cm,
            height_ft,
            height_in,

            // Weight
            weight_kg,
            weight_lb,
        } = body;

        if (!photoUrl) {
            return NextResponse.json(
                { message: "photoUrl is required" },
                { status: 400 }
            );
        }

        // Save photo
        const photo = await db.photo.create({
            data: {
                userId,
                ...(deviceId ? { deviceId } : {}),
                photoUrl,
                ...(note ? { note } : {}),
            },
        });

        // Save height
        if (height_cm || (height_ft && height_in)) {
            await db.height.create({
                data: {
                    userId,
                    ...(deviceId ? { deviceId } : {}),
                    height_cm: height_cm || ftInToCm(height_ft, height_in),
                    height_ft: height_ft || null,
                    height_in: height_in || null,
                },
            });
        }

        // Save weight
        if (weight_kg || weight_lb) {
            await db.weightlog.create({
                data: {
                    userId,
                    ...(deviceId ? { deviceId } : {}),
                    date: new Date(),
                    current_weight_kg: weight_kg || lbsToKg(weight_lb),
                    current_weight_lb: weight_lb || kgToLbs(weight_kg),
                },
            });
        }

        return NextResponse.json({ success: true, photo }, { status: 200 });

    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json(
            { success: false, message: "Error adding log", error: error.message },
            { status: 500 }
        );
    }
}



// -------------------- GET --------------------
export async function GET(req) {
    try {
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid");

        if (!userId) {
            return NextResponse.json({ message: "User ID header is required" }, { status: 400 });
        }

        const photos = await db.photo.findMany({
            where: { userId, ...(deviceId ? { deviceId } : {}) },
            orderBy: { createdAt: "asc" },
        });

        const heights = await db.height.findMany({
            where: { userId, ...(deviceId ? { deviceId } : {}) },
            orderBy: { createdAt: "asc" },
        });

        const weights = await db.weightlog.findMany({
            where: { userId, ...(deviceId ? { deviceId } : {}) },
            orderBy: { createdAt: "asc" },
        });

        const combined = {};

        const addToCombined = (date, type, data) => {
            if (!combined[date]) combined[date] = { date, photos: [], heights: [], weights: [] };
            combined[date][type].push(data);
        };

        photos.forEach(photo => {
            const date = photo.createdAt.toISOString().split("T")[0];
            addToCombined(date, "photos", {
                id: photo.id,
                photoUrl: photo.photoUrl,
                note: photo.note || null
            });
        });

        heights.forEach(height => {
            const date = height.createdAt.toISOString().split("T")[0];
            addToCombined(date, "heights", {
                id: height.id,
                height_cm: height.height_cm,
                height_ft: height.height_ft,
                height_in: height.height_in,
            });
        });

        weights.forEach(weight => {
            const date = weight.createdAt.toISOString().split("T")[0];
            addToCombined(date, "weights", {
                id: weight.id,
                current_weight_kg: weight.current_weight_kg,
                current_weight_lb: weight.current_weight_lb,
            });
        });

        const data = Object.values(combined).sort((a, b) => b.date.localeCompare(a.date));

        return NextResponse.json({ success: true, data }, { status: 200 });

    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json(
            { success: false, message: "Error fetching logs", error: error.message },
            { status: 500 }
        );
    }
}



// -------------------- PATCH --------------------
export async function PATCH(req) {
    try {
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid");

        if (!userId) {
            return NextResponse.json({ message: "User ID header is required" }, { status: 400 });
        }

        const body = await req.json();

        const {
            photoId, photoUrl, note,
            heightId, height_cm, height_ft, height_in,
            weightId, weight_kg, weight_lb
        } = body;

        let updatedPhoto = null;
        let updatedHeight = null;
        let updatedWeight = null;

        // Update photo
        if (photoId) {
            updatedPhoto = await db.photo.update({
                where: { id: photoId },
                data: {
                    ...(photoUrl ? { photoUrl } : {}),
                    ...(note ? { note } : {}),
                },
            });
        }

        // Update height
        if (heightId) {
            updatedHeight = await db.height.update({
                where: { id: heightId },
                data: {
                    height_cm: height_cm || (height_ft && height_in ? ftInToCm(height_ft, height_in) : undefined),
                    height_ft: height_ft ?? undefined,
                    height_in: height_in ?? undefined,
                },
            });
        }

        // Update weight
        if (weightId) {
            updatedWeight = await db.weightlog.update({
                where: { id: weightId },
                data: {
                    current_weight_kg: weight_kg || (weight_lb ? lbsToKg(weight_lb) : undefined),
                    current_weight_lb: weight_lb || (weight_kg ? kgToLbs(weight_kg) : undefined),
                },
            });
        }

        return NextResponse.json(
            {
                success: true,
                photo: updatedPhoto,
                height: updatedHeight,
                weight: updatedWeight,
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error updating log:", error);
        return NextResponse.json(
            { success: false, message: "Error updating daily log", error: error.message },
            { status: 500 }
        );
    }
}
