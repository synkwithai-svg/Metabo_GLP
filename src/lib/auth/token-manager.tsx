/**
 * Token Manager - Handles token storage, retrieval, and automatic refresh
 * UPDATED: Uses localStorage for both tokens for consistency
 */

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_DATA_KEY = "userData";

export interface UserData {
  isAnonymous: boolean;
  isOnboarded: boolean;
  role: string;
  provider?: string;
}

const isBrowser = () => typeof window !== "undefined";

export class TokenManager {
  /**
   * Store tokens after successful login
   */
  static setTokens(
    accessToken: string,
    refreshToken: string,
    userData?: UserData
  ) {
    if (!isBrowser()) return;

    // Store tokens in localStorage for API calls
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

    // ALSO store in cookies so middleware can access them
    document.cookie = `accessToken=${accessToken}; path=/; max-age=${
      60 * 15
    }; SameSite=Strict`; // 15 min
    document.cookie = `refreshToken=${refreshToken}; path=/; max-age=${
      60 * 60 * 24 * 7
    }; SameSite=Strict`; // 7 days

    // Store user data
    if (userData) {
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    }
  }

  /**
   * Get access token
   */
  static getAccessToken(): string | null {
    if (!isBrowser()) return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  /**
   * Get refresh token
   */
  static getRefreshToken(): string | null {
    if (!isBrowser()) return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Get user data
   */
  static getUserData(): UserData | null {
    if (!isBrowser()) return null;
    const data = localStorage.getItem(USER_DATA_KEY);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Clear all tokens and user data (logout)
   */
  static async clearTokens() {
    if (!isBrowser()) return;

    const accessToken = this.getAccessToken();

    if (accessToken) {
      try {
        await fetch("/api/v1/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
      } catch (error) {
        console.error("Logout API call failed:", error);
      }
    }

    // Clear localStorage
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);

    // Clear cookies
    document.cookie = "accessToken=; path=/; max-age=0";
    document.cookie = "refreshToken=; path=/; max-age=0";
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(): Promise<string | null> {
    if (!isBrowser()) return null;

    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${refreshToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        this.clearTokens();
        return null;
      }

      const data = await response.json();

      if (data.success && data.data.accessToken) {
        // Update localStorage
        localStorage.setItem(ACCESS_TOKEN_KEY, data.data.accessToken);

        // Update cookie
        document.cookie = `accessToken=${
          data.data.accessToken
        }; path=/; max-age=${60 * 15}; SameSite=Strict`;

        return data.data.accessToken;
      }

      return null;
    } catch (error) {
      console.error("Token refresh failed:", error);
      this.clearTokens();
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    if (!isBrowser()) return false;
    return !!this.getAccessToken() && !!this.getRefreshToken();
  }
}
