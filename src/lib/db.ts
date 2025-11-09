// lib/db.ts

import { PrismaClient } from "@prisma/client";

// Avoid re-creating the Prisma client during hot reloads in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["warn", "error"], // Optional: add 'query' for debugging
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export default db;
