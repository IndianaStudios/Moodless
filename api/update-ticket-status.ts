import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdmin, verifyAuth } from './_utils/verifyAuth.js';
import { isAdmin } from './_utils/isAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
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

  const { ticketId, status, adminReply } = req.body;

  if (!ticketId || !status) {
    return res.status(400).json({ error: 'Missing ticketId or status' });
  }

  try {
    const adminApp = getFirebaseAdmin();
    const db = adminApp.firestore();

    // 3. Actualizar el ticket en Firestore
    const ticketRef = db.collection('support_tickets').doc(ticketId);
    
    const updateData: any = {
      status,
      updatedAt: new Date().toISOString()
    };
    
    if (adminReply) {
      updateData.adminReply = adminReply;
    }

    await ticketRef.update(updateData);

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error updating ticket status in API:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
