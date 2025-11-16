import admin from "@/lib/services/firebaseAdmin";

export async function POST(req) {
    try {
        // Try to parse body
        let body = {};
        try {
            body = await req.json();
        } catch (e) {
            return new Response(
                JSON.stringify({ error: "Invalid or missing JSON body" }),
                { status: 400 }
            );
        }

        const { uid } = body;

        if (!uid) {
            return new Response(
                JSON.stringify({ error: "UID is required" }),
                { status: 400 }
            );
        }

        // 1. Generate custom token
        const customToken = await admin.auth().createCustomToken(uid);

        // 2. Exchange custom token -> ID token
        const firebaseResp = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.FIREBASE_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: customToken,
                    returnSecureToken: true,
                }),
            }
        ).then((r) => r.json());

        if (!firebaseResp.idToken) {
            console.log("Firebase response error:", firebaseResp);
            return new Response(
                JSON.stringify({ error: "Failed to exchange custom token" }),
                { status: 500 }
            );
        }

        return Response.json({
            success: true,
            uid,
            idToken: firebaseResp.idToken,
            refreshToken: firebaseResp.refreshToken,
            expiresIn: firebaseResp.expiresIn,
        });

    } catch (error) {
        console.error("Server error:", error);
        return new Response(
            JSON.stringify({ error: "Failed to generate token" }),
            { status: 500 }
        );
    }
}
