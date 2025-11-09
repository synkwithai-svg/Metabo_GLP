// import admin from "firebase-admin";

// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert({
//       projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
//       clientEmail: process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL as string,
//       privateKey: process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY?.replace(
//         /\\n/g,
//         "\n"
//       )!,
//     }),
//   });
// }
// export const db = admin.firestore();

// export default admin;

import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")!,
    }),
  });
}

export const db = admin.firestore();
export default admin;
