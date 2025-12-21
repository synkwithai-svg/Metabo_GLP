import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
    try {
        const userId = req.headers.get("x-user-id");

        if (!userId) {
            return NextResponse.json(
                { success: false, message: "Missing user ID" },
                { status: 400 }
            );
        }

        // ✅ Read query params
        const { searchParams } = new URL(req.url);

        const page = Number(searchParams.get("page")) || 1;
        const limit = Number(searchParams.get("limit")) || 10;

        // This should match `searchKey` from frontend
        // example: ?name=abc OR ?key=abc
        const searchValue =
            searchParams.get("name") ||
            searchParams.get("key") ||
            searchParams.get("search") ||
            "";

        const skip = (page - 1) * limit;

        // ✅ Search condition (adjust field names as per your schema)
        const where = searchValue
            ? {
                OR: [
                    { name: { contains: searchValue, mode: "insensitive" } },
                    { key: { contains: searchValue, mode: "insensitive" } },
                ],
            }
            : {};

        // ✅ Query data
        const [apiKeys, total] = await Promise.all([
            db.apiKey.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
            }),
            db.apiKey.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return NextResponse.json({
            success: true,
            message: "API Keys retrieved",
            data: apiKeys,
            meta: {
                page,
                limit,
                total,
                totalPages,
            },
        });
    } catch (error) {
        console.error("API KEY GET ERROR:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(req) {
    try {
        const userId = req.headers.get("x-user-id");
        // const deviceId = req.headers.get("x-device-id") || null;

        if (!userId) {
            return NextResponse.json(
                { success: false, message: "Missing user ID" },
                { status: 400 }
            );
        }

        const body = await req.json();
        const { key, provider, tokens, expiresAt } = body;

        if (!key || !provider) {
            return NextResponse.json(
                { success: false, message: "Missing required fields" },
                { status: 400 }
            );
        }

        // Validate user
        const user = await db.user.findUnique({ where: { id: userId } });
        if (!user) {
            return NextResponse.json(
                { success: false, message: "User not found" },
                { status: 404 }
            );
        }

        // Validate tokens if provided
        let tokenCount = undefined;
        if (tokens !== undefined) {
            if (typeof tokens !== "number" || tokens < 0) {
                return NextResponse.json(
                    { success: false, message: "Invalid tokens" },
                    { status: 400 }
                );
            }
            tokenCount = tokens;
        }

        // Create API key
        const apiKey = await db.apiKey.create({
            data: {
                userId,
                key,
                provider,
                tokens: tokenCount,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
            },
        });

        return NextResponse.json({
            success: true,
            message: "API Key created",
            apiKey,
        });
    } catch (error) {
        console.error("API KEY POST ERROR:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(req) {
    try {
        const userId = req.headers.get("x-user-id");

        if (!userId) {
            return NextResponse.json(
                { success: false, message: "Missing user ID" },
                { status: 400 }
            );
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const key = searchParams.get("key");

        if (!id && !key) {
            return NextResponse.json(
                { success: false, message: "Provide either id or key" },
                { status: 400 }
            );
        }

        const apiKey = await db.apiKey.findFirst({
            where: {
                OR: [
                    id ? { id } : undefined,
                    key ? { key } : undefined,
                ].filter(Boolean),
            },
        });

        if (!apiKey) {
            return NextResponse.json(
                { success: false, message: "API Key not found" },
                { status: 404 }
            );
        }

        await db.apiKey.delete({
            where: { id: apiKey.id },
        });

        return NextResponse.json({
            success: true,
            message: "API Key deleted successfully",
        });
    } catch (error) {
        console.error("API KEY DELETE ERROR:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
