import { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    try {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (!projectId || !clientEmail || !privateKey) {
            console.warn('Firebase Admin is not configured. Missing environment variables.');
        } else {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    // Reemplazar saltos de línea literales \n por saltos de línea reales
                    privateKey: privateKey.replace(/\\n/g, '\n'),
                }),
            });
            console.log('Firebase Admin initialized successfully.');
        }
    } catch (error) {
        console.error('Failed to initialize Firebase Admin:', error);
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('Cron Job trigged: /api/cron/daily-reminder');

    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        if (!admin.apps.length) {
            throw new Error('Firebase Admin not initialized. Check credentials.');
        }

        const db = admin.firestore();
        const messaging = admin.messaging();

        // 1. Get all users
        const usersSnapshot = await db.collection('users').get();
        const today = new Date().toISOString().split('T')[0];

        let notificationsSent = 0;
        let usersChecked = 0;
        let errors = 0;

        // Utilizamos Promise.all para procesar los usuarios en paralelo y que el cron no tarde mucho
        const promises = usersSnapshot.docs.map(async (userDoc) => {
            usersChecked++;
            const userData = userDoc.data();
            const userId = userDoc.id;

            // 2. Check if user wants notifications and has a device token
            const notificationsEnabled = userData.preferences?.notificationsEnabled;
            const fcmTokens = userData.fcmTokens as string[] | undefined;

            if (notificationsEnabled === true && fcmTokens && fcmTokens.length > 0) {
                // 3. Check if user already logged an entry today
                const entriesSnapshot = await db.collection(`users/${userId}/entries`)
                    .where('date', '==', today)
                    .limit(1)
                    .get();

                if (entriesSnapshot.empty) {
                    // User hasn't logged today. Send them a Push Notification
                    console.log(`Sending reminder to user ${userId}...`);

                    const message = {
                        notification: {
                            title: 'Tu Diario Moodless te espera',
                            body: 'Tómate un minuto para registrar cómo te sientes hoy. 🌈',
                        },
                        tokens: fcmTokens,
                    };

                    try {
                        const response = await messaging.sendEachForMulticast(message);
                        notificationsSent += response.successCount;
                        if (response.failureCount > 0) {
                            errors += response.failureCount;
                            console.error(`Failed to send to ${response.failureCount} tokens for user ${userId}.`);

                            // Opcional: limpiar tokens inválidos aquí
                            // response.responses.forEach((resp, idx) => {
                            //    if (!resp.success) console.error(resp.error);
                            // });
                        }
                    } catch (sendError) {
                        errors++;
                        console.error(`Error sending message to user ${userId}:`, sendError);
                    }
                }
            }
        });

        await Promise.all(promises);

        return res.status(200).json({
            success: true,
            message: 'Cron job executed successfully',
            stats: {
                usersChecked,
                notificationsSent,
                errors
            }
        });

    } catch (error: any) {
        console.error('Error in cron job:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
