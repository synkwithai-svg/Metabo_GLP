import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

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

        if (!body.slug) {
            return NextResponse.json(
                { success: false, message: "Permission slug is required" },
                { status: 400 }
            );
        }

        // Optional: Check if slug already exists before attempting to create
        const existingPermission = await db.permission.findUnique({
            where: { slug: body.slug },
        });

        if (existingPermission) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Permission with slug "${body.slug}" already exists`,
                    field: "slug",
                },
                { status: 409 } // 409 Conflict is more appropriate than 400
            );
        }

        const permission = await db.permission.create({
            data: {
                ...body,
                userId,
            },
        });

        return NextResponse.json({ success: true, permission }, { status: 201 });
    } catch (error) {
        console.error("POST /permission error:", error);

        // Handle unique constraint violation (backup check)
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            const target = error.meta?.target;
            if (Array.isArray(target) && target.includes("slug")) {
                return NextResponse.json(
                    {
                        success: false,
                        message: `Permission with this slug already exists`,
                        field: "slug",
                    },
                    { status: 409 }
                );
            }
        }

        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}

export async function PUT(req) {
    const userId = req.headers.get("x-user-id");

    if (!userId) {
        return NextResponse.json(
            { success: false, message: "Unauthorized: Missing user ID" },
            { status: 401 }
        );
    }

    try {
        const body = await req.json();
        const { id, name, slug } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, message: "Permission ID is required" },
                { status: 400 }
            );
        }

        if (!name?.trim()) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Permission name is required",
                    field: "name",
                },
                { status: 400 }
            );
        }

        if (!slug?.trim()) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Permission slug is required",
                    field: "slug",
                },
                { status: 400 }
            );
        }

        const existingPermission = await db.permission.findUnique({
            where: { id },
        });

        if (!existingPermission) {
            return NextResponse.json(
                { success: false, message: "Permission not found" },
                { status: 404 }
            );
        }

        if (existingPermission.userId !== userId) {
            return NextResponse.json(
                { success: false, message: "Unauthorized access" },
                { status: 403 }
            );
        }

        if (slug !== existingPermission.slug) {
            const slugExists = await db.permission.findUnique({
                where: { slug },
            });

            if (slugExists) {
                return NextResponse.json(
                    {
                        success: false,
                        message: `Permission with slug "${slug}" already exists`,
                        field: "slug",
                    },
                    { status: 409 }
                );
            }
        }

        const permission = await db.permission.update({
            where: { id },
            data: { name, slug },
        });

        return NextResponse.json(
            { success: true, permission },
            { status: 200 }
        );
    } catch (error) {
        console.error("PUT /permission error:", error);

        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Permission with this slug already exists",
                    field: "slug",
                },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}


// DELETE
export async function DELETE(req) {
    try {
        const url = new URL(req.url);
        const id = url.searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { success: false, message: "Permission ID is required" },
                { status: 400 }
            );
        }

        // Optional: check if permission exists before deleting
        const permission = await db.permission.findUnique({ where: { id } });
        if (!permission) {
            return NextResponse.json(
                { success: false, message: "Permission not found" },
                { status: 404 }
            );
        }

        await db.permission.delete({
            where: { id },
        });

        return NextResponse.json({
            success: true,
            message: "Permission deleted successfully",
        });
    } catch (error) {
        console.error("DELETE /permissions error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
