import { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySignature } from '@upstash/qstash/nextjs';
import { getFirebaseAdmin } from '../_utils/verifyAuth.js';

async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const adminApp = getFirebaseAdmin();
        const db = adminApp.firestore();
        const messaging = adminApp.messaging();

        const usersSnapshot = await db.collection('users').get();
        const today = new Date().toISOString().split('T')[0];

        let notificationsSent = 0;
        let errors = 0;

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;

            const notificationsEnabled = userData.preferences?.notificationsEnabled;
            const fcmTokens = userData.fcmTokens as string[] | undefined;
            const timeZone = userData.timeZone || 'UTC'; // Fallback a UTC si no tiene

            if (notificationsEnabled !== true || !fcmTokens || fcmTokens.length === 0) {
                continue;
            }

            // Comprobar la hora local en la zona horaria del usuario
            try {
                const userTimeOptions: Intl.DateTimeFormatOptions = {
                    timeZone,
                    hour: 'numeric',
                    hour12: false
                };
                const formatter = new Intl.DateTimeFormat('en-US', userTimeOptions);
                const userHour = parseInt(formatter.format(new Date()), 10);

                // Solo enviar si en LA HORA DEL USUARIO son las 14:xx o las 20:xx
                if (userHour !== 14 && userHour !== 20) {
                    continue;
                }
            } catch (tzError) {
                console.warn(`Timezone inválida para usuario ${userId}: ${timeZone}`);
                // Si la zona horaria falla por alguna razón, no enviamos por si acaso
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
                    errors += response.failureCount;
                }
            } catch (sendError: any) {
                errors++;
                console.error(`Error sending to user ${userId}:`, sendError.message);
            }
        }

        return res.status(200).json({ success: true, notificationsSent, errors });

    } catch (error: any) {
        console.error('QSTASH FATAL ERROR:', error.message);
        return res.status(500).json({ error: error.message });
    }
}

// Importante: No debe exportarse config = { runtime: 'edge' }
export const config = {
  api: {
    bodyParser: false, // Upstash nextjs/verifySignature lo requiere en false para poder leer el raw body en Next.js/Vercel Serverless
  },
};

export default verifySignature(handler);
