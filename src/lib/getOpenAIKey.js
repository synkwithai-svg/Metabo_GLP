// import { db } from "@/lib/db";
// import OpenAI from "openai";

// export async function getOpenAIClient() {
//     const apiKeys = await db.apiKey.findMany({
//         where: {
//             OR: [
//                 { expiresAt: null },
//                 { expiresAt: { gt: new Date() } },
//             ],
//             OR: [
//                 { tokens: null },        // unlimited (premium/admin)
//                 { tokens: { gt: 0 } },   // limited but available
//             ],
//         },
//         orderBy: { createdAt: "asc" }, // simple rotation
//     });

//     if (!apiKeys.length) {
//         throw new Error("No usable OpenAI API keys available");
//     }

//     for (const key of apiKeys) {
//         try {
//             return new OpenAI({ apiKey: key.key });
//         } catch (err) {
//             console.warn(`Failed to initialize key ${key.id}`);
//         }
//     }

//     throw new Error("Failed to initialize any OpenAI client");
// }



import OpenAI from "openai";
import { db } from "@/lib/db";

export async function createChatCompletion({
    messages,
    model = "gpt-4o-mini",
}) {
    const apiKeys = await db.apiKey.findMany({
        where: {
            OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
            ],
            OR: [{ tokens: null }, { tokens: { gt: 0 } }],
            isDisabled: false,
        },
        orderBy: { createdAt: "asc" },
    });

    if (!apiKeys.length) {
        throw new Error("No usable OpenAI API keys available");
    }

    let lastError = null;

    for (const key of apiKeys) {
        const openai = new OpenAI({ apiKey: key.key });

        try {
            return await openai.chat.completions.create({
                model,
                messages,
            });
        } catch (err) {
            lastError = err;

            const status = err?.status;
            const code = err?.code;

            // 🔴 INVALID / REVOKED KEY
            if (status === 401 || code === "invalid_api_key") {
                console.warn(`Invalid API key ${key.id}, disabling`);

                await db.apiKey.update({
                    where: { id: key.id },
                    data: { isDisabled: true },
                });

                continue;
            }

            // 🔴 QUOTA EXHAUSTED
            if (code === "insufficient_quota") {
                console.warn(`Quota exhausted for key ${key.id}`);

                await db.apiKey.update({
                    where: { id: key.id },
                    data: { isDisabled: true },
                });

                continue;
            }

            // 🟠 RATE LIMITED
            if (status === 429) {
                console.warn(`Rate limited key ${key.id}, trying next`);
                continue;
            }

            // 🔥 REAL FAILURE → stop everything
            throw err;
        }
    }

    throw new Error(
        lastError?.message || "All OpenAI API keys are invalid or exhausted"
    );
}

