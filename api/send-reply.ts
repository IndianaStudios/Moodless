import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { verifyAuth } from './_utils/verifyAuth.js';
import { escapeHtml } from './_utils/escapeHtml.js';
import { checkRateLimit } from './_utils/rateLimit.js';

const statusLabels: Record<string, { emoji: string; label: string; color: string }> = {
  in_progress: { emoji: '🔄', label: 'En Progreso', color: '#eab308' },
  resolved: { emoji: '✅', label: 'Resuelto', color: '#22c55e' },
};

function buildReplyHtml(userName: string, ticketId: string, status: string, adminMessage: string, originalMessage: string) {
  const statusInfo = statusLabels[status] || { emoji: '📋', label: status, color: '#94a3b8' };

  return `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #7c3aed, #6366f1); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">${statusInfo.emoji} Actualización de tu Ticket</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Tu ticket ha sido actualizado</p>
      </div>
      <div style="padding: 32px; color: #e2e8f0;">
        <p style="font-size: 16px; line-height: 1.6;">Hola <strong>${userName}</strong>,</p>
        
        <div style="background: #1e293b; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid ${statusInfo.color};">
          <p style="margin: 0 0 8px; color: #94a3b8; font-size: 12px;">Estado actualizado a:</p>
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${statusInfo.color};">${statusInfo.emoji} ${statusInfo.label}</p>
        </div>

        <div style="background: #1e293b; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 8px; color: #a78bfa; font-size: 12px; font-weight: bold;">Mensaje del equipo:</p>
          <p style="margin: 0; line-height: 1.6; font-size: 14px; white-space: pre-wrap;">${adminMessage}</p>
        </div>

        <div style="background: #1e293b; border-radius: 12px; padding: 16px; margin: 20px 0; opacity: 0.6;">
          <p style="margin: 0 0 8px; color: #94a3b8; font-size: 11px;">Tu mensaje original:</p>
          <p style="margin: 0; line-height: 1.5; font-size: 13px; color: #94a3b8; white-space: pre-wrap;">${originalMessage}</p>
        </div>

        <p style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
          Si tienes más dudas, puedes enviar un nuevo ticket desde la app.
        </p>
      </div>
      <div style="padding: 16px 32px; text-align: center; border-top: 1px solid #1e293b;">
        <p style="font-size: 11px; color: #64748b; margin: 0;">Moodless — Tu diario visual</p>
      </div>
    </div>`;
}

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

  // Rate limit: 20 respuestas por hora por admin
  const isAllowed = await checkRateLimit(`reply:${authUser.uid}`, 20, 3600);
  if (!isAllowed) {
    return res.status(429).json({ error: 'Demasiadas respuestas enviadas. Inténtalo más tarde.' });
  }

  const { userEmail, userName, ticketId, status, adminMessage, originalMessage } = req.body;

  if (!userEmail || typeof userEmail !== 'string' || !adminMessage || typeof adminMessage !== 'string' || !status || typeof status !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid required fields' });
  }

  const { GMAIL_USER, GMAIL_PASS } = process.env;

  if (!GMAIL_USER || !GMAIL_PASS) {
    console.error('GMAIL_USER or GMAIL_PASS not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS, // Contraseña de aplicación
    },
  });

  const FROM_EMAIL = `"Moodless" <${GMAIL_USER}>`;
  const statusInfo = statusLabels[status] || { emoji: '📋', label: status, color: '#94a3b8' };

  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: userEmail,
      subject: `${statusInfo.emoji} Actualización de tu Ticket #${ticketId} — Moodless`,
      html: buildReplyHtml(
        escapeHtml(userName || 'usuario'),
        escapeHtml(ticketId || 'N/A'),
        escapeHtml(status),
        escapeHtml(adminMessage),
        escapeHtml(originalMessage || '')
      ),
      headers: {
        'Importance': 'High',
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
      },
    });

    return res.status(200).json({ success: true, id: info.messageId });
  } catch (error) {
    console.error('Error sending reply email with Nodemailer:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
