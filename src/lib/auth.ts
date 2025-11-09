import { verifyAccessToken, extractTokenFromHeader } from "@/lib/utils/jwt";
import { getUserById } from "@/lib/services/auth-service";
import type { TokenPayload, User } from "@/lib/types/auth.types";

export async function verifyAuth(
  authHeader: string | null | undefined
): Promise<{ user: User | null; token: TokenPayload | null; error?: string }> {
  try {
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return {
        user: null,
        token: null,
        error: "No token provided",
      };
    }

    const payload = await verifyAccessToken(token);

    if (!payload) {
      return {
        user: null,
        token: null,
        error: "Invalid token",
      };
    }

    const user = await getUserById(payload.uid);

    if (!user) {
      return {
        user: null,
        token: null,
        error: "User not found",
      };
    }

    return {
      user,
      token: payload as TokenPayload,
    };
  } catch (error) {
    return {
      user: null,
      token: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
