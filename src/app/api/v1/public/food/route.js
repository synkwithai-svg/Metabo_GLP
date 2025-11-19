import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);

        // Pagination
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "10", 10);
        const skip = (page - 1) * limit;

        // Search
        const search = searchParams.get("search") || "";

        const where = search
            ? {
                name: {
                    contains: search,
                    mode: "insensitive",
                },
            }
            : {};

        // Fetch foods + macros
        const foods = await db.food.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                macros: true,
            },
        });

        const total = await db.food.count({ where });

        return NextResponse.json(
            {
                success: "true",
                message: "Foods fetched successfully",
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
                data: foods,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching foods:", error);
        return NextResponse.json(
            { message: "Server error", error: error.message },
            { status: 500 }
        );
    }
}
