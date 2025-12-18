import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/token";
import { db } from "@/lib/db";
import { Role } from "@/lib/enums";
import { familyProxy } from "./middleware/family-proxy";

// ROUTE CONFIG
const protectedPages = ["/dashboard", "/profile", "/settings"];
const authPages = ["/login", "/register"];

const userProtectedRoutes = ["/api/v1/protected", "/api/v1/protected/admin"];

const familyProtectedRoutes = ["/api/v1/protected/family"];

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  const isProtectedPage = protectedPages.some((r) => pathname.startsWith(r));

  const isAuthPage = authPages.some((r) => pathname.startsWith(r));

  const isUserProtectedApi = userProtectedRoutes.some((r) =>
    pathname.startsWith(r)
  );

  const isFamilyProtectedApi = familyProtectedRoutes.some((r) =>
    pathname.startsWith(r)
  );

  // If route is not protected at all → allow
  if (
    !isProtectedPage &&
    !isUserProtectedApi &&
    !isFamilyProtectedApi &&
    !isAuthPage
  ) {
    return NextResponse.next();
  }

  /* ----------------------------------------
     GET TOKEN (Bearer OR Cookie)
  ---------------------------------------- */
  let token = null;

  const authHeader = request.headers.get("authorization");
  const cookieToken = request.cookies.get("accessToken")?.value;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (cookieToken) {
    token = cookieToken;
  }

  /* ----------------------------------------
     AUTH PAGE LOGIC (LOGIN / REGISTER)
     If token exists → redirect to dashboard
  ---------------------------------------- */
  if (isAuthPage) {
    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  /* ----------------------------------------
     NO TOKEN HANDLING
  ---------------------------------------- */
  if (!token) {
    if (isProtectedPage) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  /* ----------------------------------------
     VERIFY TOKEN
  ---------------------------------------- */
  const payload = await verifyToken(token);

  if (!payload) {
    if (isProtectedPage) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.json(
      { success: false, message: "Invalid or expired token" },
      { status: 401 }
    );
  }

  /* ----------------------------------------
     FAMILY TOKEN HANDLING
  ---------------------------------------- */
  if (payload.type === "FAMILY_ACCESS") {
    if (!isFamilyProtectedApi) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Family token not allowed",
        },
        { status: 403 }
      );
    }

    return familyProxy(payload, pathname);
  }

  /* ----------------------------------------
     NORMAL USER TOKEN
  ---------------------------------------- */
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  if (!user || user.isDisabled) {
    if (isProtectedPage) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.json(
      {
        success: false,
        message: "User not found or disabled",
      },
      { status: 401 }
    );
  }

  /* ----------------------------------------
     ADMIN ROUTE CHECK
  ---------------------------------------- */
  if (pathname.startsWith("/api/v1/protected/admin")) {
    if (user.role !== Role.ADMIN && user.role !== Role.SUPERADMIN) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Admin access required",
        },
        { status: 403 }
      );
    }
  }

  /* ----------------------------------------
     PASS USER CONTEXT
  ---------------------------------------- */
  const res = NextResponse.next();

  res.headers.set("x-auth-type", "user");
  res.headers.set("x-user-id", String(user.id));
  res.headers.set("x-user-email", user.email ?? "");
  res.headers.set("x-user-role", user.role);
  res.headers.set("x-user-deviceid", payload.deviceId ?? "");

  return res;
}

/* ----------------------------------------
   MIDDLEWARE MATCHER
---------------------------------------- */
export const config = {
  matcher: [
    "/login",
    "/register",
    "/dashboard/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/api/v1/protected/:path*",
    "/api/v1/protected/admin/:path*",
    "/api/v1/protected/family/:path*",
  ],
};
