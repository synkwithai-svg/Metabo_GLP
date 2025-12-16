import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const DEFAULT_ALLOWED_ROUTES = [
    "/api/v1/protected/family/message",
    "/api/v1/protected/family/get-my-profile",
    "/api/v1/protected/family/notification",
];

export async function familyProxy(payload, pathname) {
    if (!payload.familyId) {
        return new NextResponse(
            JSON.stringify({ success: false, message: "Invalid family token" }),
            { status: 401 }
        );
    }

    // Fetch family with permissions
    const familyMember = await db.family.findUnique({
        where: { id: payload.familyId },
        include: {
            user: true,
            permissions: true,
        },
    });

    if (!familyMember) {
        return new NextResponse(
            JSON.stringify({ success: false, message: "Family member not found" }),
            { status: 401 }
        );
    }

    // ------------------------------------------------------------------
    // 🔥 ALWAYS ALLOW DEFAULT ROUTES (NO PERMISSION CHECK)
    // ------------------------------------------------------------------
    if (DEFAULT_ALLOWED_ROUTES.includes(pathname)) {
        const res = NextResponse.next();
        res.headers.set("x-auth-type", "family");
        res.headers.set("x-family-id", familyMember.id);
        res.headers.set("x-family-name", familyMember.name ?? "");
        res.headers.set("x-user-id", familyMember.userId);
        return res;
    }

    // ------------------------------------------------------------------
    // NORMAL PERMISSION CHECK
    // ------------------------------------------------------------------
    const hasPermission = familyMember.permissions.some(
        (perm) => perm.slug === pathname
    );

    if (!hasPermission) {
        return new NextResponse(
            JSON.stringify({ success: false, message: "Forbidden: No permission" }),
            { status: 403 }
        );
    }

    // Allow with headers
    const res = NextResponse.next();
    res.headers.set("x-auth-type", "family");
    res.headers.set("x-family-id", familyMember.id);
    res.headers.set("x-family-name", familyMember.name ?? "");
    res.headers.set("x-user-id", familyMember.userId);

    return res;
}
