import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import dayjs from "dayjs";

export async function GET(req) {
    try {
        const familyId = req.headers.get("x-family-id");

        if (!familyId) {
            return NextResponse.json(
                { success: false, message: "x-family-id header is required" },
                { status: 400 }
            );
        }

        const family = await db.family.findUnique({
            where: { id: familyId },
            select: {
                id: true,
                name: true,
                dob: true,
                relationship: true,
                isActive: true,
                accepted: true,
                createdAt: true,
                permissions: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
        });

        if (!family) {
            return NextResponse.json(
                { success: false, message: "Family not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                id: family.id,
                name: family.name,
                relationship: family.relationship,
                dob: family.dob ? dayjs(family.dob).format("YYYY-MM-DD") : null,
                isActive: family.isActive,
                accepted: family.accepted,
                createdAt: family.createdAt,
                permissions: family.permissions,
            },
        });
    } catch (error) {
        console.error("GET FAMILY PROFILE ERROR:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
