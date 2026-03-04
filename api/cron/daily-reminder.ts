import { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

function getFirebaseAdmin() {
    const existingApps = admin.apps ?? [];
    if (existingApps.length > 0) return admin;

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            `Missing Firebase env vars. ` +
            `FIREBASE_PROJECT_ID: ${projectId ? 'SET' : 'MISSING'}, ` +
            `FIREBASE_CLIENT_EMAIL: ${clientEmail ? 'SET' : 'MISSING'}, ` +
            `FIREBASE_PRIVATE_KEY: ${privateKey ? 'SET (' + privateKey.length + ' chars)' : 'MISSING'}`
        );
    }

    // Manejar diferentes formatos de la clave privada
    if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
    }

    // Si la clave viene rodeada de comillas, quitarlas
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
    }

    console.log('Initializing Firebase Admin...');
    console.log('Project ID:', projectId);
    console.log('Client Email:', clientEmail);
    console.log('Private Key starts with:', privateKey.substring(0, 30));

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });

    console.log('Firebase Admin initialized OK');
    return admin;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('Cron Job triggered: /api/cron/daily-reminder');

    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const adminApp = getFirebaseAdmin();
        const db = adminApp.firestore();
        const messaging = adminApp.messaging();

        // 1. Get all users
        const usersSnapshot = await db.collection('users').get();
        const today = new Date().toISOString().split('T')[0];

        console.log(`Checking ${usersSnapshot.size} users for today: ${today}`);

        let notificationsSent = 0;
        let usersChecked = 0;
        let usersSkipped = 0;
        let errors = 0;

        for (const userDoc of usersSnapshot.docs) {
            usersChecked++;
            const userData = userDoc.data();
            const userId = userDoc.id;

            // 2. Check if user wants notifications and has a device token
            const notificationsEnabled = userData.preferences?.notificationsEnabled;
            const fcmTokens = userData.fcmTokens as string[] | undefined;

            if (notificationsEnabled !== true || !fcmTokens || fcmTokens.length === 0) {
                usersSkipped++;
                continue;
            }

            // 3. Check if user already logged an entry today
            const entriesSnapshot = await db.collection(`users/${userId}/entries`)
                .where('date', '==', today)
                .limit(1)
                .get();

            if (!entriesSnapshot.empty) {
                // Already logged today, skip
                continue;
            }

            // 4. User hasn't logged today -> send Push Notification
            console.log(`Sending reminder to user ${userId} (${fcmTokens.length} tokens)...`);

            try {
                const response = await messaging.sendEachForMulticast({
                    notification: {
                        title: 'Tu Diario Moodless te espera',
                        body: 'Tómate un minuto para registrar cómo te sientes hoy. 🌈',
                    },
                    tokens: fcmTokens,
                });

                notificationsSent += response.successCount;
                if (response.failureCount > 0) {
                    errors += response.failureCount;
                    // Log specific token errors
                    response.responses.forEach((resp, idx) => {
                        if (!resp.success) {
                            console.error(`Token ${idx} failed for user ${userId}:`, resp.error?.message);
                        }
                    });
                }
            } catch (sendError: any) {
                errors++;
                console.error(`Error sending to user ${userId}:`, sendError.message);
            }
        }

        const result = {
            success: true,
            message: 'Cron job executed',
            stats: { usersChecked, usersSkipped, notificationsSent, errors }
        };

        console.log('Cron result:', JSON.stringify(result));
        return res.status(200).json(result);

    } catch (error: any) {
        console.error('CRON FATAL ERROR:', error.message);
        return res.status(500).json({
            error: error.message || 'Internal Server Error',
            hint: 'Check Firebase environment variables in Vercel'
        });
    }
}
