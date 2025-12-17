import { db } from "@/lib/db";
import OpenAI from "openai";

export async function getOpenAIClient() {
    // 1. Fetch all available API keys from DB
    const apiKeys = await db.apiKey.findMany({
        where: {
            provider: "openai",
            OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
            ],
            tokens: null, // include keys without token limits
        },
        orderBy: { createdAt: "asc" },
    });

    if (!apiKeys || apiKeys.length === 0) {
        throw new Error("No available API keys found in the database");
    }

    let client = null;

    for (const apiKeyRecord of apiKeys) {
        try {
            // Create OpenAI client
            client = new OpenAI({ apiKey: apiKeyRecord.key });

            // Optional: test the key by making a lightweight request
            await client.models.list(); // will throw if key is invalid

            // If successful, break the loop
            return client;
        } catch (err) {
            console.warn(`API key ${apiKeyRecord.id} failed, trying next...`);
            continue;
        }
    }

    throw new Error("All API keys failed");
}
