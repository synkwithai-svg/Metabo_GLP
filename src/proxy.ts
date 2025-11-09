// import { type NextRequest, NextResponse } from "next/server";
// import { verifyAuth } from "@/lib/auth";
// import { Role } from "@/lib/enums";

// // Routes that require authentication
// const protectedRoutes = [
//   "/dashboard",
//   "/profile",
//   "/settings",
//   "/api/v1/protected",
// ];

// export async function proxy(request: NextRequest) {
//   const { pathname } = request.nextUrl;

//   const isProtectedRoute = protectedRoutes.some((route) =>
//     pathname.startsWith(route)
//   );

//   if (!isProtectedRoute) return NextResponse.next();

//   // Get token from header or cookie
//   const authHeader = request.headers.get("authorization");
//   const cookieToken = request.cookies.get("accessToken")?.value;
//   const token = authHeader?.replace("Bearer ", "") ?? cookieToken ?? "";

//   if (!token) {
//     const loginUrl = new URL("/login", request.url);
//     loginUrl.searchParams.set("redirect", pathname);
//     return NextResponse.redirect(loginUrl);
//   }

//   const { user, error } = await verifyAuth(token);

//   if (!user || error) {
//     const loginUrl = new URL("/login", request.url);
//     loginUrl.searchParams.set("redirect", pathname);
//     return NextResponse.redirect(loginUrl);
//   }

//   // Restrict API access to admin or superadmin
//   if (pathname.startsWith("/api/v1/protected")) {
//     if (user.role !== Role.ADMIN && user.role !== Role.SUPERADMIN) {
//       return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
//         status: 403,
//         headers: { "Content-Type": "application/json" },
//       });
//     }
//   }

//   // Set user info in headers (can be read in API route or frontend)
//   const response = NextResponse.next();
//   response.headers.set("x-user-id", user.id);
//   response.headers.set("x-user-email", user.email ?? "");
//   response.headers.set("x-user-role", user.role);
//   response.headers.set("x-user-token", token);

//   return response;
// }

// export const config = {
//   matcher: [
//     "/((?!api|_next/static|_next/image|favicon.ico|icon(?:\\.\\w+)?\\.(?:svg|png)).*)",
//     "/api/v1/protected/:path*",
//   ],
// };

import { type NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { Role } from "@/lib/enums";

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/profile",
  "/settings",
  "/api/v1/protected",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // console.log("[Middleware] Requested path:", pathname);

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtectedRoute) {
    // console.log("[Middleware] Not a protected route, passing through");
    return NextResponse.next();
  }

  // Get token from header or cookie
  const authHeader = request.headers.get("authorization");
  const cookieToken = request.cookies.get("accessToken")?.value;
  const token = authHeader ?? cookieToken;

  // console.log("[Middleware] Authorization header:", authHeader);
  // console.log("[Middleware] Cookie token:", cookieToken);
  // console.log("[Middleware] Final token used:", token);

  if (!token) {
    // console.log("[Middleware] No token found, redirecting to login");
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { user, token: payload, error } = await verifyAuth(token);
  // console.log("[Middleware] verifyAuth result:", { user, error });

  if (!user || error) {
    // console.log("[Middleware] Invalid token, redirecting to login");
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Restrict API access to admin or superadmin
  if (pathname.startsWith("/api/v1/protected")) {
    if (user.role !== Role.ADMIN && user.role !== Role.SUPERADMIN) {
      // console.log("[Middleware] User role not allowed:", user.role);
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Set user info in headers (can be read in API route or frontend)
  const response = NextResponse.next();
  response.headers.set("x-user-id", user.id);
  response.headers.set("x-user-email", user.email ?? "");
  response.headers.set("x-user-role", user.role);
  response.headers.set("x-user-token", token);

  // console.log("[Middleware] Headers set for request:", {
  //   "x-user-id": user.id,
  //   "x-user-email": user.email,
  //   "x-user-role": user.role,
  // });

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon(?:\\.\\w+)?\\.(?:svg|png)).*)",
    "/api/v1/protected/:path*",
  ],
};
