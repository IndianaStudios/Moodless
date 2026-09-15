import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getFirebaseAdmin, verifyAuth } from './_utils/verifyAuth.js';

const RECENT_AUTH_MAX_AGE_SECONDS = 5 * 60;

async function deleteSupportTicketsForUser(db: ReturnType<typeof getFirestore>, userId: string) {
  const tickets = await db.collection('support_tickets')
    .where('userId', '==', userId)
    .get();

  const writer = db.bulkWriter();
  for (const ticket of tickets.docs) {
    writer.delete(ticket.ref);
  }
  await writer.close();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authUser = await verifyAuth(req);
  if (!authUser || 'error' in authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!authUser.authTime || nowSeconds - authUser.authTime > RECENT_AUTH_MAX_AGE_SECONDS) {
    return res.status(401).json({ error: 'Recent authentication required' });
  }

  try {
    const adminApp = getFirebaseAdmin();
    const db = getFirestore(adminApp);

    // Borrar el documento del usuario y todas sus subcolecciones antes de
    // invalidar Auth. Así no quedan datos emocionales ni de salud huérfanos.
    await db.recursiveDelete(db.collection('users').doc(authUser.uid));
    await deleteSupportTicketsForUser(db, authUser.uid);

    // Eliminar los contadores de cuota asociados al usuario, sin tocar los
    // contadores globales de tickets que preservan la secuencia de IDs.
    const rateLimitKeys = ['ticket', 'ai', 'youtube', 'email'];
    const writer = db.bulkWriter();
    rateLimitKeys.forEach((key) => writer.delete(db.collection('_rate_limits').doc(`${key}:${authUser.uid}`)));
    await writer.close();

    await getAuth(adminApp).deleteUser(authUser.uid);
    return res.status(204).end();
  } catch (error) {
    console.error('[delete-account] Failed to delete account data:', error);
    return res.status(500).json({ error: 'Unable to delete account' });
  }
}
