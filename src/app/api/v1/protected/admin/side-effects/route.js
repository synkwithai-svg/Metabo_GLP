import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
    try {
        const body = await req.json();
        const userId = req.headers.get("x-user-id");
        const deviceId = req.headers.get("x-user-deviceid") || null;

        if (!userId) {
            return NextResponse.json(
                { message: "User ID header is required" },
                { status: 400 }
            );
        }

        const { name } = body;

        if (!name) {
            return NextResponse.json(
                { message: "Name is required" },
                { status: 400 }
            );
        }

        const sideEffect = await db.sideEffect.create({
            data: {
                userId,
                deviceId,
                name,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Side effect created",
            sideEffect,
        });
    } catch (error) {
        console.error("Side effect API Error:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Internal server error",
                error: { name: error.name, message: error.message },
            },
            { status: 500 }
        );
    }
}

export async function Delete(req) {
    try {
        const body = await req.json();

        const { id } = body;

        if (!id) {
            return NextResponse.json({ message: "ID is required" }, { status: 400 });
        }

        const sideEffect = await db.sideEffect.findFirst({
            where: {
                id,
            },
        });

        if (!sideEffect) {
            return NextResponse.json(
                { message: "Side effect not found" },
                { status: 404 }
            );
        }

        await db.sideEffect.delete({
            where: {
                id,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Side effect deleted",
            sideEffect,
        });
    } catch (error) {
        console.error("Side effect API Error:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Internal server error",
                error: { name: error.name, message: error.message },
            },
            { status: 500 }
        );
    }
}
