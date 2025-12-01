import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/token";
import { db } from "@/lib/db";
import { Role } from "@/lib/enums";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

const userProtectedRoutes = ["/api/v1/protected", "/api/v1/protected/admin"];
const familyProtectedRoutes = ["/api/v1/protected/family"];
const protectedPages = ["/dashboard", "/profile", "/settings"];

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // -----------------------------------------------------
  //  FRONTEND PAGES (session-based)
  // ----------------------------------------------------- 
  if (protectedPages.some((route) => pathname.startsWith(route))) {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // -----------------------------------------------------
  // CHECK IF API ROUTES NEED AUTH
  // -----------------------------------------------------
  const isUserProtected = userProtectedRoutes.some((r) =>
    pathname.startsWith(r)
  );

  const isFamilyProtected = familyProtectedRoutes.some((r) =>
    pathname.startsWith(r)
  );

  // If route is not protected → continue
  if (!isUserProtected && !isFamilyProtected) {
    return NextResponse.next();
  }

  // -----------------------------------------------------
  // GET TOKEN
  // -----------------------------------------------------
  let token = null;
  const authHeader = request.headers.get("authorization");
  const cookieToken = request.cookies.get("accessToken")?.value;

  if (authHeader?.startsWith("Bearer ")) token = authHeader.split(" ")[1];
  else if (cookieToken) token = cookieToken;

  if (!token) {
    return new NextResponse(
      JSON.stringify({ success: false, message: "No token provided" }),
      { status: 401 }
    );
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return new NextResponse(
      JSON.stringify({ success: false, message: "Invalid or expired token" }),
      { status: 401 }
    );
  }

  // -----------------------------------------------------
  // FAMILY TOKEN LOGIC
  // -----------------------------------------------------
  const isFamilyToken = payload.type === "FAMILY_ACCESS";

  if (isFamilyToken) {
    // ❌ If family tries to access NON-family routes → BLOCK
    if (!isFamilyProtected) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          message: "Forbidden: Family access not allowed for this route",
        }),
        { status: 401 }
      );
    }

    if (!payload.familyId) {
      return new NextResponse(
        JSON.stringify({ success: false, message: "Invalid family token" }),
        { status: 401 }
      );
    }

    const familyMember = await db.family.findUnique({
      where: { id: payload.familyId },
      include: { user: true },
    });

    if (!familyMember) {
      return new NextResponse(
        JSON.stringify({ success: false, message: "Family member not found" }),
        { status: 401 }
      );
    }

    const res = NextResponse.next();
    res.headers.set("x-auth-type", "family");
    res.headers.set("x-family-id", familyMember.id);
    res.headers.set("x-family-name", familyMember.name ?? "");
    res.headers.set("x-user-id", familyMember.userId);

    return res;
  }

  // -----------------------------------------------------
  // NORMAL USER TOKEN LOGIC
  // -----------------------------------------------------
  const user = await db.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user) {
    return new NextResponse(
      JSON.stringify({ success: false, message: "User not found" }),
      { status: 401 }
    );
  }

  // Admin-only check
  if (pathname.startsWith("/api/v1/protected/admin")) {
    if (user.role !== Role.ADMIN && user.role !== Role.SUPERADMIN) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          message: "Forbidden: Insufficient role",
        }),
        { status: 403 }
      );
    }
  }

  const res = NextResponse.next();
  res.headers.set("x-auth-type", "user");
  res.headers.set("x-user-id", user.id);
  res.headers.set("x-user-email", user.email ?? "");
  res.headers.set("x-user-role", user.role);
  res.headers.set("x-user-deviceid", payload.deviceId ?? "");

  return res;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon(?:\\.\\w+)?\\.(?:svg|png)).*)",
    "/api/v1/protected/:path*",
    "/api/v1/protected/admin/:path*",
    "/api/v1/protected/family/:path*",
  ],
};
