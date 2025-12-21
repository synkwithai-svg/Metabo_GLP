import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);

        const page = Number(searchParams.get("page")) || 1;
        const limit = Number(searchParams.get("limit")) || 20;
        const search = searchParams.get("search") || "";

        const skip = (page - 1) * limit;

        const where = search
            ? {
                OR: [
                    {
                        name: {
                            contains: search,
                            mode: Prisma.QueryMode.insensitive,
                        },
                    },
                ],
            }
            : {};

        const [medications, total] = await Promise.all([
            db.medication.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    name: true,
                    userId: true,
                    doseMg: true,
                    halfLifeHours: true,
                    absorptionRateKa: true,
                    bioavailability: true,
                    volumeDistribution: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            db.medication.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            message: "Medications fetched successfully",
            data: medications,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("MEDICATION GET ERROR:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
