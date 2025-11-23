import { defineConfig } from "@prisma/config";
import dotenv from "dotenv";

dotenv.config(); // Load .env
export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL!,
    // shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL, // optional
  },
});
