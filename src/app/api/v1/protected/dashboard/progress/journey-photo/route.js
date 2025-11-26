import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { lbsToKg, kgToLbs, ftInToCm } from "@/utils/conversion";

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

        const formData = await req.formData();
        const file = formData.get("file");
        const note = formData.get("note")?.toString();

        // Height
        const heightCm = parseFloat(formData.get("height_cm")?.toString() || "0") || null;
        const heightFt = parseInt(formData.get("height_ft")?.toString() || "0") || null;
        const heightIn = parseInt(formData.get("height_in")?.toString() || "0") || null;

        // Weight
        const weightKg = parseFloat(formData.get("weight_kg")?.toString() || "0") || null;
        const weightLb = parseFloat(formData.get("weight_lb")?.toString() || "0") || null;

        if (!file) {
            return NextResponse.json(
                { message: "Image file is required" },
                { status: 400 }
            );
        }

        const uploadResult = await uploadImageToCloudinary(file);

        if (!uploadResult || !uploadResult.url) {
            return NextResponse.json(
                { success: false, message: "Cloudinary upload failed" },
                { status: 500 }
            );
        }

        // Save photo
        const photo = await db.photo.create({
            data: {
                userId,
                ...(deviceId ? { deviceId } : {}),
                photoUrl: uploadResult.url,
                ...(note ? { note } : {}),
            },
        });

        // Save height if provided
        if (heightCm || (heightFt && heightIn)) {
            await db.height.create({
                data: {
                    userId,
                    ...(deviceId ? { deviceId } : {}),
                    height_cm: heightCm || ftInToCm(heightFt, heightIn),
                    height_ft: heightFt || null,
                    height_in: heightIn || null,
                },
            });
        }

        // Save weight if provided
        if (weightKg || weightLb) {
            await db.weightlog.create({
                data: {
                    userId,
                    ...(deviceId ? { deviceId } : {}),
                    date: new Date(),
                    current_weight_kg: weightKg || lbsToKg(weightLb),
                    current_weight_lb: weightLb || kgToLbs(weightKg),
                },
            });
        }

        return NextResponse.json({ success: true, photo }, { status: 200 });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json(
            { success: false, message: "Error adding photo", error: error.message },
            { status: 500 }
        );
    }
}


export async function GET(req) {
    try {
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid");

        if (!userId) {
            return NextResponse.json(
                { message: "User ID header is required" },
                { status: 400 }
            );
        }

        // Fetch all photos
        const photos = await db.photo.findMany({
            where: { userId, ...(deviceId ? { deviceId } : {}) },
            orderBy: { createdAt: "asc" },
        });

        // Fetch all heights
        const heights = await db.height.findMany({
            where: { userId, ...(deviceId ? { deviceId } : {}) },
            orderBy: { createdAt: "asc" },
        });

        // Fetch all weights
        const weights = await db.weightlog.findMany({
            where: { userId, ...(deviceId ? { deviceId } : {}) },
            orderBy: { createdAt: "asc" },
        });

        // Combine all entries by date
        const combined = {};

        const addToCombined = (date, type, data) => {
            if (!combined[date]) combined[date] = { date, photos: [], heights: [], weights: [] };
            combined[date][type].push(data);
        };

        photos.forEach(photo => {
            const date = photo.createdAt.toISOString().split("T")[0];
            addToCombined(date, "photos", { id: photo.id, photoUrl: photo.photoUrl, note: photo.note || null });
        });

        heights.forEach(height => {
            const date = height.createdAt.toISOString().split("T")[0];
            addToCombined(date, "heights", {
                id: height.id,
                height_cm: height.height_cm,
                height_ft: height.height_ft,
                height_in: height.height_in
            });
        });

        weights.forEach(weight => {
            const date = weight.createdAt.toISOString().split("T")[0];
            addToCombined(date, "weights", {
                id: weight.id,
                current_weight_kg: weight.current_weight_kg,
                current_weight_lb: weight.current_weight_lb
            });
        });

        // Convert combined object to array sorted by date descending
        const data = Object.values(combined).sort((a, b) => b.date.localeCompare(a.date));

        return NextResponse.json({
            success: true,
            data,
        }, { status: 200 });

    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json(
            { success: false, message: "Error fetching daily logs", error: error.message },
            { status: 500 }
        );
    }
}


export async function PATCH(req) {
    try {
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid");

        if (!userId) {
            return NextResponse.json({ message: "User ID header is required" }, { status: 400 });
        }

        const formData = await req.formData();
        const photoId = formData.get("photoId")?.toString();
        const note = formData.get("note")?.toString();

        // Height
        const heightId = formData.get("heightId")?.toString();
        const heightCm = parseFloat(formData.get("height_cm")?.toString() || "0") || null;
        const heightFt = parseInt(formData.get("height_ft")?.toString() || "0") || null;
        const heightIn = parseInt(formData.get("height_in")?.toString() || "0") || null;

        // Weight
        const weightId = formData.get("weightId")?.toString();
        const weightKg = parseFloat(formData.get("weight_kg")?.toString() || "0") || null;
        const weightLb = parseFloat(formData.get("weight_lb")?.toString() || "0") || null;

        // New file (optional)
        const file = formData.get("file");

        // Update photo if photoId is provided
        let updatedPhoto = null;
        if (photoId) {
            const data = {};
            if (note) data.note = note;
            if (file) {
                const uploadResult = await uploadImageToCloudinary(file);
                if (!uploadResult || !uploadResult.url) {
                    return NextResponse.json({ success: false, message: "Cloudinary upload failed" }, { status: 500 });
                }
                data.photoUrl = uploadResult.url;
            }

            updatedPhoto = await db.photo.update({
                where: { id: photoId },
                data,
            });
        }

        // Update height if heightId is provided
        let updatedHeight = null;
        if (heightId) {
            updatedHeight = await db.height.update({
                where: { id: heightId },
                data: {
                    height_cm: heightCm || (heightFt && heightIn ? ftInToCm(heightFt, heightIn) : undefined),
                    height_ft: heightFt || undefined,
                    height_in: heightIn || undefined,
                },
            });
        }

        // Update weight if weightId is provided
        let updatedWeight = null;
        if (weightId) {
            updatedWeight = await db.weightlog.update({
                where: { id: weightId },
                data: {
                    current_weight_kg: weightKg || (weightLb ? lbsToKg(weightLb) : undefined),
                    current_weight_lb: weightLb || (weightKg ? kgToLbs(weightKg) : undefined),
                },
            });
        }

        return NextResponse.json({
            success: true,
            photo: updatedPhoto,
            height: updatedHeight,
            weight: updatedWeight,
        }, { status: 200 });

    } catch (error) {
        console.error("Error updating daily log:", error);
        return NextResponse.json(
            { success: false, message: "Error updating daily log", error: error.message },
            { status: 500 }
        );
    }
}