"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { TokenManager, type UserData } from "@/lib/auth/token-manager";

interface AuthContextType {
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load user data on mount
    const userData = TokenManager.getUserData();
    setUser(userData);
    setIsLoading(false);

    // Set up token rotation interval for protected routes
    // Check every 5 minutes if we're on a protected route
    const interval = setInterval(() => {
      const currentPath = window.location.pathname;
      const isProtectedRoute =
        currentPath.startsWith("/dashboard") ||
        currentPath.startsWith("/admin") ||
        currentPath.includes("/api/v1/protected/admin");

      if (isProtectedRoute && TokenManager.isAuthenticated()) {
        // Silently refresh token
        TokenManager.refreshAccessToken().catch(() => {
          // If refresh fails, logout
          logout();
        });
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  const logout = async () => {
    await TokenManager.clearTokens();
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: TokenManager.isAuthenticated(),
        isLoading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
