import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
    try {
        const userId = req.headers.get("x-user-id");
        // const deviceId = req.headers.get("x-device-id") || null;

        if (!userId) {
            return NextResponse.json(
                { success: false, message: "Missing user ID" },
                { status: 400 }
            );
        }

        const apiKeys = await db.apiKey.findMany({});

        return NextResponse.json({
            success: true,
            message: "API Keys retrieved",
            apiKeys,
        });
    } catch (error) {
        console.error("API KEY GET ERROR:", error);
        return NextResponse.json(
            { error: "Internal server error" },
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
        // const deviceId = req.headers.get("x-device-id") || null;

        if (!userId) {
            return NextResponse.json(
                { success: false, message: "Missing user ID" },
                { status: 400 }
            );
        }

        const body = await req.json();
        const { key, id } = body;

        if (!key && !id) {
            return NextResponse.json(
                { success: false, message: "Provide either key or id" },
                { status: 400 }
            );
        }

        const apiKey = await db.apiKey.findFirst({
            where: {
                OR: [{ key: key || undefined }, { id: id || undefined }],
            },
        });

        if (!apiKey) {
            return NextResponse.json(
                { success: false, message: "API Key not found" },
                { status: 404 }
            );
        }

        // Delete API key
        const deletedApiKey = await db.apiKey.delete({
            where: { id: apiKey.id },
        });

        return NextResponse.json({
            success: true,
            message: "API Key deleted",
            apiKey: deletedApiKey,
        });
    } catch (error) {
        console.error("API KEY DELETE ERROR:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
