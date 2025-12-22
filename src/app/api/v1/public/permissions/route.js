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

        // Build search filter
        const where = search
            ? {
                OR: [
                    {
                        name: {
                            contains: search,
                            mode: Prisma.QueryMode.insensitive,
                        },
                    },
                    {
                        slug: {
                            contains: search,
                            mode: Prisma.QueryMode.insensitive,
                        },
                    },
                ],
            }
            : {};

        const [permissions, total] = await Promise.all([
            db.permission.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    userId: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            db.permission.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            message: "Permissions fetched successfully",
            data: permissions,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("PERMISSIONS GET ERROR:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
