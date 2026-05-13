import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdmin, verifyAuth } from './_utils/verifyAuth.js';
import { isAdmin } from './_utils/isAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Verificar autenticación
  const authUser = await verifyAuth(req);
  if (!authUser || 'error' in authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. Verificar que sea ADMIN
  if (!isAdmin('email' in authUser ? authUser.email : undefined)) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  try {
    const adminApp = getFirebaseAdmin();
    const db = adminApp.firestore();

    // 3. Obtener los tickets ordenados por fecha de creación (desc)
    const ticketsSnapshot = await db.collection('support_tickets')
      .orderBy('createdAt', 'desc')
      .get();

    const tickets = ticketsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null
      };
    });

    return res.status(200).json(tickets);
  } catch (error: any) {
    console.error('Error fetching support tickets in API:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
