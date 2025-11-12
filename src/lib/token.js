import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function generateAccessToken(userId, deviceId) {
  const token = await new SignJWT({
    userId,
    deviceId,
    type: "ACCESS",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${process.env.ACCESS_TOKEN_TIME || "1"}d`)
    .sign(JWT_SECRET);

  // Store token in database
  await db.token.create({
    data: {
      id: `${userId}-${Date.now()}-access`,
      userId,
      token,
      type: "ACCESS_TOKEN",
      expiresAt: new Date(
        Date.now() +
        Number.parseInt(process.env.ACCESS_TOKEN_TIME || "1") *
        24 *
        60 *
        60 *
        1000
      ),
    },
  });

  return token;
}

export async function generateRefreshToken(userId, deviceId) {
  const token = await new SignJWT({
    userId,
    deviceId,
    type: "REFRESH",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${process.env.REFRESH_TOKEN_TIME || "7"}d`)
    .sign(JWT_SECRET);

  // Store token in database
  await db.token.create({
    data: {
      id: `${userId}-${Date.now()}-refresh`,
      userId,
      token,
      type: "REFRESH_TOKEN",
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

export async function verifyToken(token) {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload;
  } catch (error) {
    return null;
  }
}
