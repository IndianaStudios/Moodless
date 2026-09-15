import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdmin, verifyAuth } from './_utils/verifyAuth.js';
import { isAdmin } from './_utils/isAdmin.js';
import { getFirestore, FieldValue, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

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

  const { title, content, version, silent = false } = req.body;

  if (!version || String(version).trim().length > 50) {
    return res.status(400).json({ error: 'Missing required field: version' });
  }

  const finalTitle = (title && String(title).trim()) || (silent ? 'Actualización de seguridad y mantenimiento' : '');
  const finalContent = (content && String(content).trim()) || (silent ? 'Mejoras internas de rendimiento y parches de seguridad.' : '');

  if (!silent && (!finalTitle || !finalContent)) {
    return res.status(400).json({ error: 'Missing required fields (title, content) for public announcements' });
  }
  if (finalTitle.length > 120 || finalContent.length > 1_000) {
    return res.status(400).json({ error: 'Changelog content is too long' });
  }

  try {
    const adminApp = getFirebaseAdmin();
    const db = getFirestore(adminApp);

    // Guardar el changelog en Firestore
    const changelogRef = db.collection('changelogs').doc();
    const changelogData = {
      version: String(version).trim(),
      title: finalTitle,
      content: finalContent,
      silent: Boolean(silent),
      createdAt: FieldValue.serverTimestamp()
    };
    await changelogRef.set(changelogData);

    // Si es actualización silenciosa, no enviamos Push a nadie
    if (silent) {
      return res.status(200).json({
        success: true,
        silent: true,
        notified: 0,
        version: String(version).trim(),
        changelogId: changelogRef.id,
        message: 'Versión actualizada silenciosamente (sin notificaciones Push ni modal automático).'
      });
    }

    // Obtener todos los tokens FCM de los usuarios que tengan notificaciones activadas
    const usersSnapshot = await db.collection('users')
      .where('preferences.notificationsEnabled', '==', true)
      .select('fcmTokens')
      .get();

    const tokens: string[] = [];
    usersSnapshot.forEach((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      // La consulta ya filtra por consentimiento de notificaciones.
      if (data.fcmTokens && Array.isArray(data.fcmTokens) && data.fcmTokens.length > 0) {
        tokens.push(...data.fcmTokens.filter((token: unknown): token is string => typeof token === 'string' && token.length > 0));
      }
    });

    if (tokens.length === 0) {
      return res.status(200).json({ success: true, message: 'Changelog saved, but no users to notify.' });
    }

    // Enviar notificaciones push en lotes de 500 (límite de FCM)
    let successCount = 0;
    let failureCount = 0;

    const messaging = getMessaging(adminApp);

    // Chunk array in sizes of 500
    const chunkSize = 500;
    for (let i = 0; i < tokens.length; i += chunkSize) {
      const chunk = tokens.slice(i, i + chunkSize);

      const message = {
        notification: {
          title: `¡Nueva versión ${version}!`,
          body: finalContent,
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

      const invalidTokens = chunk.filter((_, index) => {
        const code = response.responses[index]?.error?.code;
        return code === 'messaging/invalid-registration-token'
          || code === 'messaging/registration-token-not-registered';
      });
      if (invalidTokens.length > 0) {
        for (const token of invalidTokens) {
          const owners = await db.collection('users')
            .where('fcmTokens', 'array-contains', token)
            .get();
          await Promise.all(owners.docs.map((doc: QueryDocumentSnapshot) =>
            doc.ref.update({ fcmTokens: FieldValue.arrayRemove(token) })
          ));
        }
      }
    }

    return res.status(200).json({
      success: true,
      notified: successCount,
      failed: failureCount,
      changelogId: changelogRef.id
    });

  } catch (error: any) {
    console.error('Error in send-changelog-push:', error);
    return res.status(500).json({ error: 'Unable to publish changelog' });
  }
}
