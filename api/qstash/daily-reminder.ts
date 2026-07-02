import { VercelRequest, VercelResponse } from '@vercel/node';
import { Receiver } from '@upstash/qstash';
import { getFirebaseAdmin } from '../_utils/verifyAuth.js';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

async function runReminderTask(res: VercelResponse) {
    const adminApp = getFirebaseAdmin();
    const db = getFirestore(adminApp);
    const messaging = getMessaging(adminApp);

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
                    },
                    fcmOptions: {
                        link: 'https://moodless.vercel.app/'
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
}

export const config = {
    api: {
        bodyParser: false,
    },
};

async function getRawBody(req: VercelRequest): Promise<string> {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });
        req.on('end', () => {
            resolve(body);
        });
        req.on('error', reject);
    });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // --- 1. Verificar que la petición viene de QStash ---
    const signature = req.headers['upstash-signature'] as string;
    if (!signature) {
        console.error('daily-reminder: Missing upstash-signature header');
        return res.status(401).json({ error: 'Missing Upstash Signature' });
    }

    const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;

    if (!currentKey || !nextKey) {
        console.error('daily-reminder: QSTASH_CURRENT_SIGNING_KEY or QSTASH_NEXT_SIGNING_KEY not set in env vars!');
        return res.status(500).json({ error: 'Server misconfiguration: QStash signing keys missing' });
    }

    // --- 2. Leer body crudo para verificación exacta ---
    let bodyForVerification = '';
    try {
        bodyForVerification = await getRawBody(req);
    } catch (e: any) {
        console.error('daily-reminder: Error reading raw body', e.message);
        return res.status(500).json({ error: 'Failed to read request body' });
    }

    // --- 3. Verificar firma ---
    try {
        const receiver = new Receiver({ currentSigningKey: currentKey, nextSigningKey: nextKey });
        const url = `https://${req.headers.host}/api/qstash/daily-reminder`;

        console.log(`daily-reminder: Verifying signature. URL=${url}, bodyLength=${bodyForVerification.length}`);

        await receiver.verify({
            signature,
            body: bodyForVerification,
            url,
        });

        console.log('daily-reminder: Signature verified OK. Running task...');
    } catch (verifyErr: any) {
        console.error('daily-reminder: Signature verification failed:', verifyErr.message);
        return res.status(401).json({ error: 'Invalid QStash signature' });
    }

    // --- 4. Ejecutar tarea ---
    try {
        return await runReminderTask(res);
    } catch (taskErr: any) {
        console.error('daily-reminder: Task execution failed:', taskErr.message);
        return res.status(500).json({ error: taskErr.message });
    }
}
