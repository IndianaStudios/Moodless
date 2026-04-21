import { VercelRequest, VercelResponse } from '@vercel/node';
import { Receiver } from '@upstash/qstash';
import { getFirebaseAdmin } from '../_utils/verifyAuth.js';

const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
});

async function runReminderTask(req: VercelRequest, res: VercelResponse) {
    try {
        const adminApp = getFirebaseAdmin();
        const db = adminApp.firestore();
        const messaging = adminApp.messaging();

        const usersSnapshot = await db.collection('users').get();
        const today = new Date().toISOString().split('T')[0];

        let notificationsSent = 0;
        let errorsCount = 0;

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;

            const notificationsEnabled = userData.preferences?.notificationsEnabled;
            const fcmTokens = userData.fcmTokens as string[] | undefined;
            const timeZone = userData.timeZone || 'UTC';

            if (notificationsEnabled !== true || !fcmTokens || fcmTokens.length === 0) {
                continue;
            }

            try {
                const userTimeOptions: Intl.DateTimeFormatOptions = {
                    timeZone,
                    hour: 'numeric',
                    hour12: false
                };
                const formatter = new Intl.DateTimeFormat('en-US', userTimeOptions);
                const userHour = parseInt(formatter.format(new Date()), 10);

                if (userHour !== 14 && userHour !== 20) {
                    continue;
                }
            } catch (tzError) {
                console.warn(`Timezone inválida para usuario ${userId}: ${timeZone}`);
                continue;
            }

            const entriesSnapshot = await db.collection(`users/${userId}/entries`)
                .where('date', '==', today)
                .limit(1)
                .get();

            if (!entriesSnapshot.empty) {
                continue;
            }

            try {
                const response = await messaging.sendEachForMulticast({
                    notification: {
                        title: 'Tu Diario Moodless te espera',
                        body: 'Tómate un minuto para registrar cómo te sientes hoy. 🌈',
                    },
                    webpush: {
                        notification: {
                            icon: 'https://moodless.vercel.app/logo.jpg',
                            badge: 'https://moodless.vercel.app/badge.png',
                        }
                    },
                    android: {
                        notification: {
                            icon: 'https://moodless.vercel.app/logo.jpg',
                            color: '#0f172a'
                        }
                    },
                    tokens: fcmTokens,
                });

                notificationsSent += response.successCount;
                if (response.failureCount > 0) {
                    errorsCount += response.failureCount;
                }
            } catch (sendError: any) {
                errorsCount++;
                console.error(`Error sending to user ${userId}:`, sendError.message);
            }
        }

        return res.status(200).json({ success: true, notificationsSent, errors: errorsCount });

    } catch (error: any) {
        console.error('QSTASH TASK ERROR:', error.message);
        return res.status(500).json({ error: error.message });
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const signature = req.headers['upstash-signature'] as string;
    if (!signature) {
        return res.status(401).json({ error: 'Missing Upstash Signature' });
    }

    // En Vercel Node, el body ya suele venir parseado si es JSON.
    // QStash verify espera el string original. 
    // Si res.body es un objeto, lo re-serializamos (esto puede fallar si el espaciado original era distinto, 
    // pero es la mejor aproximación si no tenemos acceso al raw body stream).
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    try {
        const url = `https://${req.headers.host}/api/qstash/daily-reminder`;
        const isValid = await receiver.verify({
            signature,
            body: rawBody,
            url,
        });

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid Upstash Signature' });
        }

        return await runReminderTask(req, res);
    } catch (err: any) {
        console.error('Verification failed:', err.message);
        return res.status(500).json({ error: `Signature verification error: ${err.message}` });
    }
}
