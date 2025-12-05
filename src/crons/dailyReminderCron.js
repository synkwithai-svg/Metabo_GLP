import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/services/fcm";
import { firebaseAdmin } from "@/lib/services/firebaseAdmin";

// Run every day at 7 AM
cron.schedule("0 7 * * *", async () => {
  console.log("Running morning reminder cron...");

  const users = await prisma.user.findMany({
    include: {
      fcmTokens: true,
    },
  });

  const today = new Date();

  for (const user of users) {
    const createdAt = new Date(user.createdAt);
    const diffDays =
      Math.floor((today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    const tokens = user.fcmTokens.map((t) => t.fcmToken);

    // =============== 1. DAILY MORNING REMINDER ===============
    await createNotification({
      user,
      tokens,
      title: "Good morning!",
      body: "Here is your next schedule reminder.",
    });

    // =============== 2. ANONYMOUS USER RULES ===============
    if (user.isAnonymous) {
      // From 25 to 30 days: Daily upgrade reminder
      if (diffDays >= 25 && diffDays < 30) {
        await createNotification({
          user,
          tokens,
          title: "Upgrade your account",
          body: "You are using a temporary account. Please upgrade to avoid losing data.",
        });
      }

      // After 30 days: Forced upgrade alert
      if (diffDays === 30) {
        await createNotification({
          user,
          tokens,
          title: "Action Required",
          body: "Your account is still anonymous. Please upgrade immediately.",
        });
      }

      // After 90 days: Delete user and data
      if (diffDays >= 90) {
        await prisma.user.delete({
          where: { id: user.id },
        });

        console.log(`Deleted anonymous user: ${user.id}`);
      }
    }
  }
});
