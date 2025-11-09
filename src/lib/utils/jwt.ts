import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-super-secret-key-change-this-in-production"
);

const JWT_EXPIRY = 24 * 60 * 60; // 24 hours in seconds

export async function generateAccessToken(
  uid: string,
  email: string,
  role = "user"
) {
  const token = await new SignJWT({ uid, email, role, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);

  return {
    token,
    expiresIn: JWT_EXPIRY,
    expiresAt: new Date(Date.now() + JWT_EXPIRY * 1000).toISOString(),
  };
}

export async function verifyAccessToken(token: string) {
  try {
    const verified = await jwtVerify(token, secret);
    return verified.payload as any;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

export function extractTokenFromHeader(
  authHeader: string | null | undefined
): string | null {
  if (!authHeader) {
    return null;
  }

  // If it's a Bearer token, extract it
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // Otherwise assume it's the raw token from a cookie
  return authHeader;
}
