import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/token";
import { db } from "@/lib/db";
import { Role } from "@/lib/enums";

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/profile",
  "/settings",
  "/api/v1/protected",
  "/api/v1/protected/admin",
];

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Get token from Authorization header (Bearer) or cookie
  let token = null;
  const authHeader = request.headers.get("authorization");
  const cookieToken = request.cookies.get("accessToken")?.value;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (cookieToken) {
    token = cookieToken;
  }

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify token
  const payload = await verifyToken(token);

  if (!payload) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Fetch user from database
  const user = await db.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based admin check for /api/v1/protected/admin
  if (pathname.startsWith("/api/v1/protected/admin")) {
    if (user.role !== Role.ADMIN && user.role !== Role.SUPERADMIN) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Token verified and user exists, set headers
  const response = NextResponse.next();
  response.headers.set("x-user-id", user.id);
  response.headers.set("x-user-email", user.email ?? "");
  response.headers.set("x-user-role", user.role);
  response.headers.set("x-user-token", token);
  response.headers.set("x-user-deviceid", payload.deviceId ?? "");

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon(?:\\.\\w+)?\\.(?:svg|png)).*)",
    "/api/v1/protected/:path*",
    "/api/v1/protected/admin/:path*",
  ],
};
