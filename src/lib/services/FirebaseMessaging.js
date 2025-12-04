import { getMessaging, getToken } from "firebase/messaging";

const messaging = getMessaging();

const fcmToken = await getToken(messaging, {
  vapidKey: process.env.FIREBASE_VAPID_KEY,
});

console.log("FCM Token:", fcmToken);
