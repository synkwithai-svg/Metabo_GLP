import { messaging } from "./firebase";
import { getToken } from "firebase/messaging";

export async function getFCMToken() {
  if (typeof window === "undefined") return null;
  if (!messaging) return null; // Browser not supported

  try {
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });

    console.log("Generated FCM Token:", token);
    return token;
  } catch (err) {
    console.error("FCM token error:", err);
    return null;
  }
}
