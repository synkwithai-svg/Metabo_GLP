export interface User {
  id: string;
  email: string;
  isOnboarded: boolean;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccessToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date; 
  createdAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export interface TokenPayload {
  id: string;
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
  type: "access";
}

export interface LoginResponse {
  id: string;
  email: string;
  isOnboarded: boolean;
  role: string;
}

export interface AuthResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string | string[] | Record<string, any>;
}
