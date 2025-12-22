import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req) {
    const userId = req.headers.get("x-user-id");
    const deviceId = req.headers.get("x-user-deviceid") || null;

    if (!userId) {
        return NextResponse.json(
            { success: false, message: "Unauthorized: Missing user ID" },
            { status: 401 }
        );
    }

    try {
        const body = await req.json();

        if (!Array.isArray(body)) {
            return NextResponse.json(
                { success: false, message: "Expected an array of side effects" },
                { status: 400 }
            );
        }

        const data = body.map((item) => ({
            ...item,
            userId,
            deviceId,
        }));

        const result = await db.sideEffect.createMany({
            data,
            skipDuplicates: true, // avoid duplicates
        });

        return NextResponse.json({
            success: true,
            inserted: result.count,
        });
    } catch (error) {
        console.error("Side effects bulk create error:", error);
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


export async function DELETE(req) {
    try {
        const url = new URL(req.url);
        const id = url.searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { success: false, message: "ID is required" },
                { status: 400 }
            );
        }

        const sideEffect = await db.sideEffect.findUnique({
            where: { id },
        });

        if (!sideEffect) {
            return NextResponse.json(
                { success: false, message: "Side effect not found" },
                { status: 404 }
            );
        }

        await db.sideEffect.delete({
            where: { id },
        });

        return NextResponse.json({
            success: true,
            message: "Side effect deleted",
            sideEffect,
        });
    } catch (error) {
        console.error("Side effect DELETE error:", error);
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
