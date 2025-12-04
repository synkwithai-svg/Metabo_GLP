import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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
    // 🔥 ALWAYS ALLOW THIS ROUTE (bypass permission system)
    // ------------------------------------------------------------------
    if (pathname === "/api/v1/protected/family/message") {
        const res = NextResponse.next();
        res.headers.set("x-auth-type", "family");
        res.headers.set("x-family-id", familyMember.id);
        res.headers.set("x-family-name", familyMember.name ?? "");
        res.headers.set("x-user-id", familyMember.userId);
        return res;
    }

    // ------------------------------------------------------------------
    // NORMAL PERMISSION CHECK FOR ALL OTHER ROUTES
    // ------------------------------------------------------------------
    const hasPermission = familyMember.permissions.some(
        (perm) => perm.slug === pathname
    );

    if (!hasPermission) {
        return new NextResponse(
            JSON.stringify({ success: false, message: "Forbidden: No permission" }),
            { status: 400 }
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
