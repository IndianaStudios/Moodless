import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { getFirebaseAdmin, verifyAuth } from './_utils/verifyAuth.js';
import { isAdmin } from './_utils/isAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verificar autenticación
  const authUser = await verifyAuth(req);
  if (!authUser || 'error' in authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Verificar que sea ADMIN (AUTHZ fix)
  if (!isAdmin('email' in authUser ? authUser.email : undefined)) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  const { title, content, version } = req.body;

  if (!title || !content || !version) {
    return res.status(400).json({ error: 'Missing required fields (title, content, version)' });
  }

  try {
    const adminApp = getFirebaseAdmin();
    const db = adminApp.firestore();

    // Guardar el changelog en Firestore (esto también podría hacerse desde el cliente, pero aquí garantizamos coherencia)
    const changelogRef = db.collection('changelogs').doc();
    const changelogData = {
      version,
      title,
      content,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await changelogRef.set(changelogData);

    // Obtener todos los tokens FCM de los usuarios que tengan notificaciones activadas
    const usersSnapshot = await db.collection('users').get();

    const tokens: string[] = [];
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      // Si el usuario tiene tokens y (no tiene preferencias o notificationsEnabled es true)
      if (data.fcmTokens && Array.isArray(data.fcmTokens) && data.fcmTokens.length > 0) {
        if (!data.preferences || data.preferences.notificationsEnabled !== false) {
          tokens.push(...data.fcmTokens);
        }
      }
    });

    if (tokens.length === 0) {
      return res.status(200).json({ success: true, message: 'Changelog saved, but no users to notify.' });
    }

    // Enviar notificaciones push en lotes de 500 (límite de FCM)
    let successCount = 0;
    let failureCount = 0;

    const messaging = adminApp.messaging();

    // Chunk array in sizes of 500
    const chunkSize = 500;
    for (let i = 0; i < tokens.length; i += chunkSize) {
      const chunk = tokens.slice(i, i + chunkSize);

      const message = {
        notification: {
          title: `¡Nueva versión ${version}!`,
          body: title,
        },
        tokens: chunk,
        webpush: {
          notification: {
            icon: 'https://moodless.vercel.app/logo.jpg',
            badge: 'https://moodless.vercel.app/badge.png',
          },
          fcmOptions: {
            link: 'https://moodless.vercel.app/'
          }
        }
      };

      const response = await messaging.sendEachForMulticast(message);
      successCount += response.successCount;
      failureCount += response.failureCount;

      // Opcional: limpiar tokens inválidos si response.failureCount > 0
    }

    return res.status(200).json({
      success: true,
      notified: successCount,
      failed: failureCount,
      changelogId: changelogRef.id
    });

  } catch (error: any) {
    console.error('Error in send-changelog-push:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
