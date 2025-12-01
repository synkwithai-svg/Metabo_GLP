// lib/jwt.js
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// -------------------------------------------------------------------
// Generate ACCESS TOKEN (NOT stored in DB)
// -------------------------------------------------------------------
export async function generateAccessToken(userId, deviceId = null, familyId = null) {
  const isFamily = Boolean(familyId);

  const payload = {
    userId,
    type: isFamily ? "FAMILY_ACCESS" : "ACCESS",
  };

  if (deviceId) payload.deviceId = deviceId;
  if (familyId) payload.familyId = familyId;

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${process.env.ACCESS_TOKEN_TIME || "1"}d`)
    .sign(JWT_SECRET);


  // // Store token in database
  // await db.token.create({
  //   data: {
  //     id: `${userId}-${Date.now()}-access`,
  //     userId,
  //     token,
  //     type: "ACCESS_TOKEN",
  //     expiresAt: new Date(
  //       Date.now() +
  //       Number.parseInt(process.env.ACCESS_TOKEN_TIME || "1") *
  //       24 *
  //       60 *
  //       60 *
  //       1000
  //     ),
  //   },
  // });

  return token;
}



// -------------------------------------------------------------------
// Generate REFRESH TOKEN (Stored in DB)
// -------------------------------------------------------------------
export async function generateRefreshToken(userId, deviceId = null, familyId = null) {
  const isFamily = Boolean(familyId);

  const tokenType = isFamily ? "FAMILY_REFRESH_TOKEN" : "REFRESH_TOKEN";

  const payload = {
    userId,
    type: isFamily ? "FAMILY_REFRESH" : "REFRESH",
  };

  if (deviceId) payload.deviceId = deviceId;
  if (familyId) payload.familyId = familyId;

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${process.env.REFRESH_TOKEN_TIME || "7"}d`)
    .sign(JWT_SECRET);

  // Store refresh token in database
  await db.token.create({
    data: {
      id: `${userId}-${Date.now()}-${isFamily ? "family-refresh" : "refresh"}`,
      userId,
      token,
      type: tokenType,
      expiresAt: new Date(
        Date.now() +
        Number.parseInt(process.env.REFRESH_TOKEN_TIME || "7") *
        24 *
        60 *
        60 *
        1000
      ),
    },
  });

  return token;
}



// -------------------------------------------------------------------
// VERIFY ANY TOKEN
// -------------------------------------------------------------------
export async function verifyToken(token) {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload;
  } catch (error) {
    return null;
  }
}
