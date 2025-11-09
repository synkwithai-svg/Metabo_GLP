import { db } from "@/lib/db";
import { generateAccessToken } from "@/lib/utils/jwt";
import type { AccessToken } from "@/lib/types/auth.types";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  16
);

/**
 * Store a new access token for a user
 */
export async function storeAccessToken(
  userId: string,
  email: string,
  userAgent?: string | null,
  ipAddress?: string | null,
  role = "user"
): Promise<AccessToken> {
  const { token, expiresAt } = await generateAccessToken(userId, email, role);
  const tokenId = `${userId}-${nanoid()}`;
  const now = new Date();

  const accessTokenData = await db.accessToken.create({
    data: {
      id: tokenId,
      userId,
      token,
      expiresAt: new Date(expiresAt),
      createdAt: now,
      userAgent: userAgent ?? undefined,
      ipAddress: ipAddress ?? undefined,
    },
  });

  // Map null -> undefined to satisfy AccessToken interface
  return {
    ...accessTokenData,
    userAgent: accessTokenData.userAgent ?? undefined,
    ipAddress: accessTokenData.ipAddress ?? undefined,
  };
}

/**
 * Revoke a single access token by its ID
 */
export async function revokeAccessToken(tokenId: string): Promise<void> {
  await db.accessToken.delete({
    where: { id: tokenId },
  });
}

/**
 * Revoke all access tokens for a specific user
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  await db.accessToken.deleteMany({
    where: { userId },
  });
}

/**
 * Get a single access token by its ID
 */
export async function getAccessToken(
  tokenId: string
): Promise<AccessToken | null> {
  const token = await db.accessToken.findUnique({
    where: { id: tokenId },
  });

  if (!token) return null;

  // Convert nulls from DB to undefined for optional fields
  return {
    ...token,
    userAgent: token.userAgent ?? undefined,
    ipAddress: token.ipAddress ?? undefined,
  };
}

/**
 * Check if a token is still valid
 */
export async function isTokenValid(tokenId: string): Promise<boolean> {
  const token = await getAccessToken(tokenId);
  if (!token) return false;

  const expiresAtTime = new Date(token.expiresAt).getTime();
  return expiresAtTime > Date.now();
}
