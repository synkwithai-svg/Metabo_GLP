import { NextResponse } from "next/server";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
        return NextResponse.json({ error: "Code not found" }, { status: 400 });
    }

    try {

        const response = await fetch("https://api.instagram.com/oauth/access_token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                client_id: process.env.INSTAGRAM_CLIENT_ID,
                client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
                grant_type: "authorization_code",
                redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
                code
            }).toString()
        });

        const data = await response.json();

        return NextResponse.json({
            success: true,
            access_token: data.access_token,
            raw: data
        });
    } catch (error) {
        return NextResponse.json(
            { error: "Authentication failed", details: error.message },
            { status: 500 }
        );
    }
}
