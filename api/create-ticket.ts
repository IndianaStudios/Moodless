import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore, FieldValue, Transaction } from 'firebase-admin/firestore';
import { getFirebaseAdmin, verifyAuth } from './_utils/verifyAuth.js';
import { checkRateLimit } from './_utils/rateLimit.js';

type SupportCategory = 'bug' | 'suggestion' | 'help' | 'other';

const CATEGORY_PREFIX: Record<SupportCategory, string> = {
  bug: 'B',
  suggestion: 'S',
  help: 'A',
  other: 'O',
};

const formatTicketId = (category: SupportCategory, n: number): string => {
  // Padding a 2 dígitos mínimo (01, 02, ..., 99, 100, 101, ...).
  const padded = n < 10 ? `0${n}` : `${n}`;
  return `${CATEGORY_PREFIX[category]}${padded}`;
};

// Mapeo inverso por si el cliente envía el prefijo directamente.
const PREFIX_TO_CATEGORY: Record<string, SupportCategory> = {
  B: 'bug',
  S: 'suggestion',
  A: 'help',
  O: 'other',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authUser = await verifyAuth(req);
  if (!authUser || 'error' in authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { category, message, userName } = req.body || {};

  if (!category || typeof category !== 'string' || !PREFIX_TO_CATEGORY[category]) {
    return res.status(400).json({ error: 'Invalid category' });
  }
  const cat = PREFIX_TO_CATEGORY[category];
  if (!message || typeof message !== 'string' || message.trim().length < 10) {
    return res.status(400).json({ error: 'Message too short' });
  }
  if (message.length > 5000) {
    return res.status(400).json({ error: 'Message too long' });
  }
  const safeUserName = typeof userName === 'string'
    ? userName.trim().slice(0, 100) || 'Anónimo'
    : 'Anónimo';

  const isAllowed = await checkRateLimit(`ticket:${authUser.uid}`, 5, 3600);
  if (!isAllowed) {
    return res.status(429).json({ error: 'Demasiados tickets creados. Vuelve a intentarlo más tarde.' });
  }

  const adminApp = getFirebaseAdmin();
  const db = getFirestore(adminApp);

  try {
    // Transacción atómica con Admin SDK: incrementa counter y crea ticket.
    const counterRef = db.collection('support_ticket_counters').doc(CATEGORY_PREFIX[cat]);
    const newTicketId = await db.runTransaction(async (tx: Transaction) => {
      const snap = await tx.get(counterRef);
      const current = snap.exists ? Number((snap.data() as any)?.n) || 0 : 0;
      const next = current + 1;
      const id = formatTicketId(cat, next);
      const ticketRef = db.collection('support_tickets').doc(id);
      tx.set(counterRef, { n: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      tx.set(ticketRef, {
        userId: authUser.uid,
        // La identidad de contacto procede siempre del token verificado, nunca
        // del cuerpo manipulable de la petición.
        userName: safeUserName,
        userEmail: authUser.email || '',
        category: cat,
        message: message.trim(),
        createdAt: FieldValue.serverTimestamp(),
        status: 'new',
        ticketRef: false,
      });
      return id;
    });

    return res.status(200).json({ success: true, ticketId: newTicketId, category: cat });
  } catch (err: any) {
    console.error('[create-ticket] Error:', err?.message || err);
    return res.status(500).json({ error: 'Failed to create ticket' });
  }
}
