// import { NextResponse } from "next/server";
// import { db } from "@/lib/db";
// import { notificationTypes } from "@/lib/enums";

// export async function POST(req) {
//     try {
//         const body = await req.json();

//         // Extract headers
//         const userId = req.headers.get("x-user-id");
//         const familyId = req.headers.get("x-family-id");

//         const { message } = body;

//         // Validation
//         if (!message) {
//             return NextResponse.json(
//                 { success: false, message: "Message is required" },
//                 { status: 400 }
//             );
//         }

//         if (!userId) {
//             return NextResponse.json(
//                 { success: false, message: "Recipient user ID header is required" },
//                 { status: 400 }
//             );
//         }

//         if (!familyId) {
//             return NextResponse.json(
//                 { success: false, message: "Sender family ID header is required" },
//                 { status: 400 }
//             );
//         }

//         // Check if the recipient exists
//         const recipient = await db.user.findUnique({
//             where: { id: userId },
//             include: { fcmTokens: true }, // Include all devices / FCM tokens
//         });

//         if (!recipient) {
//             return NextResponse.json(
//                 { success: false, message: "Recipient user not found" },
//                 { status: 404 }
//             );
//         }

//         // Create the notification
//         const notification = await db.notification.create({
//             data: {
//                 type: notificationTypes.FAMILY_MESSAGE,
//                 title: "Message from Family",
//                 body: message,
//                 recipientId: userId,
//                 senderFamilyId: familyId,
//                 // deliveredTo: {
//                 //     connect: recipient.fcmTokens.map((token) => ({ id: token.id })),
//                 // },
//             },
//             // include: { deliveredTo: true }, // Return connected FCM tokens
//         });

//         return NextResponse.json({ success: true, notification });
//     } catch (error) {
//         console.error("Error creating notification:", error);
//         return NextResponse.json(
//             { success: false, message: "Internal server error" },
//             { status: 500 }
//         );
//     }
// }



import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notificationTypes } from "@/lib/enums";
import { sendPushNotification } from "@/lib/services/sendPushNotification";

export async function POST(req) {
    try {
        const body = await req.json();

        const userId = req.headers.get("x-user-id");
        const familyId = req.headers.get("x-family-id");

        const { message } = body;

        if (!message) {
            return NextResponse.json(
                { success: false, message: "Message is required" },
                { status: 400 }
            );
        }

        if (!userId) {
            return NextResponse.json(
                { success: false, message: "Recipient user ID header is required" },
                { status: 400 }
            );
        }

        if (!familyId) {
            return NextResponse.json(
                { success: false, message: "Sender family ID header is required" },
                { status: 400 }
            );
        }

        // Fetch user & FCM tokens
        const recipient = await db.user.findUnique({
            where: { id: userId },
            include: { fcmTokens: true },
        });

        if (!recipient) {
            return NextResponse.json(
                { success: false, message: "Recipient user not found" },
                { status: 404 }
            );
        }

        // Create notification entry
        const notification = await db.notification.create({
            data: {
                type: notificationTypes.FAMILY_MESSAGE,
                title: "Message from your Family Member",
                body: message,
                recipientId: userId,
                senderFamilyId: familyId,
                deliveredTo: {
                    connect: recipient.fcmTokens.map((t) => ({ id: t.id })),
                },
            },
        });

        // Extract FCM tokens
        const fcmTokens = recipient.fcmTokens.map((t) => t.fcmToken);

        // Send FCM Push
        await sendPushNotification(fcmTokens, {
            title: "Message from Family",
            body: message,
            data: {
                notificationId: notification.id,
                type: notificationTypes.FAMILY_MESSAGE,
            },
        });

        return NextResponse.json({
            success: true,
            notification,
        });
    } catch (error) {
        console.error("Error creating notification:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
