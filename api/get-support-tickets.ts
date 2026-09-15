import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdmin, verifyAuth } from './_utils/verifyAuth.js';
import { isAdmin } from './_utils/isAdmin.js';
import { getFirestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

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
    const db = getFirestore(adminApp);

    const requestedLimit = Number(req.query.limit);
    const pageSize = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
    const afterId = typeof req.query.after === 'string' ? req.query.after : undefined;

    let ticketsQuery = db.collection('support_tickets')
      .orderBy('createdAt', 'desc')
      .limit(pageSize + 1);

    if (afterId) {
      const cursor = await db.collection('support_tickets').doc(afterId).get();
      if (!cursor.exists) {
        return res.status(400).json({ error: 'Invalid page cursor' });
      }
      ticketsQuery = ticketsQuery.startAfter(cursor);
    }

    const ticketsSnapshot = await ticketsQuery.get();
    const pageDocs = ticketsSnapshot.docs.slice(0, pageSize);

    const tickets = pageDocs.map((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null
      };
    });

    return res.status(200).json({
      tickets,
      nextCursor: ticketsSnapshot.docs.length > pageSize ? pageDocs.at(-1)?.id ?? null : null,
    });
  } catch (error: any) {
    console.error('Error fetching support tickets in API:', error);
    return res.status(500).json({ error: 'Unable to fetch support tickets' });
  }
}
