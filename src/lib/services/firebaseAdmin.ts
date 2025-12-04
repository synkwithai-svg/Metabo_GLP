import admin from "firebase-admin";

let app;

if (!admin.apps.length) {
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (!serviceAccountString) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY env variable is not set");
  }

  const serviceAccount = JSON.parse(serviceAccountString);

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const firebaseAdmin = admin;
