import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// CREATE — userId required
export async function POST(req) {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
        return NextResponse.json(
            { success: false, message: "Unauthorized: Missing user ID" },
            { status: 401 }
        );
    }

    try {
        const body = await req.json();

        // Ensure slug is provided
        if (Array.isArray(body)) {
            if (body.length === 0) {
                return NextResponse.json(
                    { success: false, message: "Permission array cannot be empty" },
                    { status: 400 }
                );
            }

            const preparedData = body.map((p) => {
                if (!p.slug) {
                    throw new Error("Permission slug is required for each item");
                }
                return { ...p, userId };
            });

            const result = await db.permission.createMany({
                data: preparedData,
            });

            return NextResponse.json({
                success: true,
                count: result.count,
                message: "Permissions created successfully",
            });
        }

        if (!body.slug) {
            return NextResponse.json(
                { success: false, message: "Permission slug is required" },
                { status: 400 }
            );
        }

        // Single permission creation
        const permission = await db.permission.create({
            data: {
                ...body,
                userId,
            },
        });

        return NextResponse.json({ success: true, permission });
    } catch (error) {
        console.error("POST /permission error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// UPDATE — allow updating slug as well
export async function PUT(req) {
    try {
        const body = await req.json();
        const { id, slug, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, message: "Permission ID is required" },
                { status: 400 }
            );
        }

        if (!slug) {
            return NextResponse.json(
                { success: false, message: "Permission slug is required" },
                { status: 400 }
            );
        }

        const permission = await db.permission.update({
            where: { id },
            data: {
                ...updateData,
                slug, // ensure slug is updated
            },
        });

        return NextResponse.json({ success: true, permission });
    } catch (error) {
        console.error("PUT /permission error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}


// DELETE
export async function DELETE(req) {
    try {
        const body = await req.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, message: "Permission ID is required" },
                { status: 400 }
            );
        }

        await db.permission.delete({
            where: { id },
        });

        return NextResponse.json({
            success: true,
            message: "Permission deleted",
        });
    } catch (error) {
        console.error("DELETE /permission error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
