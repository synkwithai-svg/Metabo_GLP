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
            OR: [
                { tokens: null },        // unlimited (admin / premium)
                { tokens: { gt: 0 } },   // limited but available
            ],
            isDisabled: false,
        },
        orderBy: { createdAt: "asc" }, // round-robin
    });

    if (!apiKeys.length) {
        throw new Error("No usable OpenAI API keys available");
    }

    let lastError = null;

    for (const key of apiKeys) {
        const openai = new OpenAI({ apiKey: key.key });

        try {
            const completion = await openai.chat.completions.create({
                model,
                messages,
            });

            return completion;
        } catch (err) {
            lastError = err;

            // 🔴 QUOTA EXHAUSTED → disable key
            if (err?.code === "insufficient_quota") {
                console.warn(`Quota exhausted for key ${key.id}`);

                await db.apiKey.update({
                    where: { id: key.id },
                    data: { isDisabled: true },
                });

                continue;
            }

            // 🟠 RATE LIMIT → try next key
            if (err?.status === 429) {
                console.warn(`Rate limited key ${key.id}, trying next`);
                continue;
            }

            // 🔥 REAL ERROR → stop immediately
            throw err;
        }
    }

    throw new Error(
        lastError?.message || "All OpenAI API keys are exhausted"
    );
}
