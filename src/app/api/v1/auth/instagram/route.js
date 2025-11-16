// import { NextResponse } from "next/server";

// export async function GET() {
//   const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${process.env.INSTAGRAM_CLIENT_ID}&redirect_uri=${process.env.INSTAGRAM_REDIRECT_URI}&response_type=code&scope=user_profile,user_media`;

//   return NextResponse.redirect(authUrl);
// }



import { NextResponse } from "next/server";

export async function GET(req) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    // STEP 1: First visit → redirect to Instagram
    if (!code) {
        const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${process.env.INSTAGRAM_CLIENT_ID}&redirect_uri=${process.env.INSTAGRAM_REDIRECT_URI}&response_type=code&scope=user_profile,user_media`;
        return NextResponse.redirect(authUrl);
    }

    // STEP 2: Instagram callback → exchange code for access token
    const tokenUrl = "https://api.instagram.com/oauth/access_token";

    const formData = new FormData();
    formData.append("client_id", process.env.INSTAGRAM_CLIENT_ID);
    formData.append("client_secret", process.env.INSTAGRAM_CLIENT_SECRET);
    formData.append("grant_type", "authorization_code");
    formData.append("redirect_uri", process.env.INSTAGRAM_REDIRECT_URI);
    formData.append("code", code);

    const res = await fetch(tokenUrl, {
        method: "POST",
        body: formData,
    });

    const data = await res.json();

    return NextResponse.json({
        message: "OAuth Success",
        instagram: data,
    });
}
