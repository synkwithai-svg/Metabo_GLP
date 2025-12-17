import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

const WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

/**
 * RevenueCat signature verification
 */
function verifySignature(rawBody, signature) {
  if (!signature) return false;

  const computed = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computed)
  );
}

export async function POST(req) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-revenuecat-signature");

    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json(
        { error: "Invalid RevenueCat signature" },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    if (!event) {
      return NextResponse.json({ received: true });
    }

    const {
      type: eventType,
      app_user_id,
      product_id,
      entitlement_ids,
      expiration_at_ms,
    } = event;

    // RevenueCat TEST event (webhook verification)
    if (eventType === "TEST") {
      return NextResponse.json({ received: true });
    }

    if (!app_user_id) {
      return NextResponse.json({ received: true });
    }

    const hasMetabPro = entitlement_ids?.includes("metab_pro");

    /* ===============================
       ACTIVATE / RENEW / RESTORE
       =============================== */
    if (
      eventType === "INITIAL_PURCHASE" ||
      eventType === "RENEWAL" ||
      eventType === "UNCANCELLATION" ||
      eventType === "NON_RENEWING_PURCHASE"
    ) {
      if (!hasMetabPro) {
        return NextResponse.json({ received: true });
      }

      await db.subscription.upsert({
        where: {
          revenueCatUserId: app_user_id,
        },
        update: {
          isActive: true,
          entitlement: "metab_pro",
          productId: product_id,
          expiresAt: expiration_at_ms
            ? new Date(expiration_at_ms)
            : null,
        },
        create: {
          userId: app_user_id, // MUST match your auth user id
          revenueCatUserId: app_user_id,
          entitlement: "metab_pro",
          productId: product_id,
          isActive: true,
          expiresAt: expiration_at_ms
            ? new Date(expiration_at_ms)
            : null,
        },
      });
    }

    /* ===============================
       EXPIRE / CANCEL / REFUND
       =============================== */
    if (
      eventType === "EXPIRATION" ||
      eventType === "CANCELLATION" ||
      eventType === "REFUND"
    ) {
      await db.subscription.updateMany({
        where: {
          revenueCatUserId: app_user_id,
        },
        data: {
          isActive: false,
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("RevenueCat Webhook Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
