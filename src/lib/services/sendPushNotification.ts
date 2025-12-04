import { firebaseAdmin } from "@/lib/services/firebaseAdmin";

export async function sendPushNotification(
  fcmTokens: string[],
  payload: {
    title: string;
    body: string;
    data?: Record<string, string>;
    image?: string;
  }
) {
  if (!fcmTokens || fcmTokens.length === 0) {
    console.warn("No FCM tokens provided, skipping push.");
    return;
  }

  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
      image: payload.image || undefined,
    },
    data: payload.data || {},
    tokens: fcmTokens,
  };

  try {
    const res = await firebaseAdmin.messaging().sendEachForMulticast(message);
    console.log("FCM push sent:", res);
    return res;
  } catch (error) {
    console.error("Error sending FCM push:", error);
    throw error;
  }
}
