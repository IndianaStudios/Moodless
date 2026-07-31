import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { verifyAuth } from './_utils/verifyAuth.js';
import { escapeHtml } from './_utils/escapeHtml.js';
import { checkRateLimit } from './_utils/rateLimit.js';

const LOGO_PATH = join(process.cwd(), 'public', 'logo.jpg');
let _logoBuffer: Buffer | null = null;
const getLogoBuffer = (): Buffer | null => {
  if (_logoBuffer) return _logoBuffer;
  try {
    _logoBuffer = readFileSync(LOGO_PATH);
    return _logoBuffer;
  } catch (e) {
    console.warn('[send-reply] No se pudo cargar public/logo.jpg:', (e as Error).message);
    return null;
  }
};

const statusLabels: Record<string, { emoji: string; label: string; color: string }> = {
  in_progress: { emoji: '🔄', label: 'En Progreso', color: '#eab308' },
  resolved: { emoji: '✅', label: 'Resuelto', color: '#22c55e' },
};

function buildReplyHtml(userName: string, ticketId: string, status: string, adminMessage: string, originalMessage: string) {
  const statusInfo = statusLabels[status] || { emoji: '📋', label: status, color: '#94a3b8' };
  const statusAccent = statusInfo.color || '#a78bfa';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0b0911; border-radius: 32px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08);">
      <div style="padding: 16px 28px; border-bottom: 1px solid rgba(255,255,255,0.06);">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
          <tr>
            <td align="left" valign="middle" style="padding: 0 16px 0 0; white-space: nowrap;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                <tr>
                  <td width="26" height="26" valign="middle" style="width: 26px; height: 26px; border-radius: 8px; overflow: hidden; box-shadow: inset 0 1px 0 rgba(255,255,255,0.18); vertical-align: middle; font-size: 0; line-height: 0;"><img src="cid:logo@moodless" alt="Moodless" width="26" height="26" style="display: block; width: 26px; height: 26px;" /></td>
                  <td width="10" style="width: 10px; font-size: 0; line-height: 0;">&nbsp;</td>
                  <td style="font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.92); letter-spacing: -0.01em; vertical-align: middle;">Moodless · Soporte</td>
                </tr>
              </table>
            </td>
            <td align="right" valign="middle" style="padding: 0 0 0 16px;">
              <span style="display: inline-block; padding: 4px 10px; border-radius: 999px; background: ${statusAccent}1A; border: 1px solid ${statusAccent}40; color: ${statusAccent}; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; white-space: nowrap;">${statusInfo.emoji} ${statusInfo.label}</span>
            </td>
          </tr>
        </table>
      </div>

      <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, ${statusAccent}66 50%, transparent 100%);"></div>

      <div style="padding: 40px 32px 8px;">
        <p style="color: rgba(255,255,255,0.5); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.16em; margin: 0 0 10px;">Tu ticket ha sido actualizado</p>
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; line-height: 1.2;">Hola ${escapeHtml(userName)}</h1>
        <p style="color: rgba(255,255,255,0.6); font-size: 14px; line-height: 1.5; margin: 8px 0 0;">Nuestro equipo ha revisado tu caso y queremos mantenerte al tanto.</p>
      </div>

      <div style="padding: 24px 32px 8px;">
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 18px; padding: 18px 20px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.04); border-left: 3px solid ${statusAccent};">
          <p style="color: rgba(255,255,255,0.5); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.16em; margin: 0 0 8px;">Estado</p>
          <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${statusAccent};">${statusInfo.emoji} ${statusInfo.label}</p>
        </div>
      </div>

      <div style="padding: 8px 32px 8px;">
        <div style="background: linear-gradient(180deg, rgba(124,58,237,0.08) 0%, rgba(255,255,255,0.02) 100%); border: 1px solid rgba(167,139,250,0.18); border-left: 3px solid #a78bfa; border-radius: 18px; padding: 18px 20px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);">
          <p style="color: rgba(167,139,250,0.85); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.16em; margin: 0 0 10px;">Mensaje del equipo</p>
          <p style="color: rgba(255,255,255,0.92); font-size: 14px; line-height: 1.55; margin: 0; white-space: pre-wrap;">${escapeHtml(adminMessage)}</p>
        </div>
      </div>

      ${originalMessage ? `
      <div style="padding: 8px 32px 8px;">
        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 18px; padding: 14px 18px;">
          <p style="color: rgba(255,255,255,0.35); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.16em; margin: 0 0 6px;">Tu mensaje original</p>
          <p style="color: rgba(255,255,255,0.55); font-size: 12px; line-height: 1.5; margin: 0; white-space: pre-wrap;">${escapeHtml(originalMessage)}</p>
        </div>
      </div>
      ` : ''}

      <div style="padding: 20px 32px 12px; text-align: center;">
        <p style="color: rgba(255,255,255,0.55); font-size: 13px; line-height: 1.5; margin: 0;">
          Si necesitas añadir más información, puedes responder a este correo o enviar un nuevo ticket desde la app.
        </p>
      </div>

      <div style="padding: 12px 32px 32px; text-align: center;">
        <a href="https://moodless.vercel.app/app/perfil" style="display: inline-block; padding: 12px 28px; background: #ffffff; color: #0b0911; border-radius: 999px; font-weight: 600; font-size: 13px; text-decoration: none; letter-spacing: -0.005em; box-shadow: 0 4px 18px rgba(255,255,255,0.18);">Abrir Moodless</a>
      </div>

      <div style="padding: 16px 32px 24px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
        <p style="font-size: 10px; color: rgba(255,255,255,0.3); margin: 0; letter-spacing: 0.02em;">Moodless — Tu diario emocional visual con IA</p>
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

  const logoBuffer = getLogoBuffer();
  const logoAttachment = logoBuffer
    ? [{ filename: 'logo.jpg', content: logoBuffer, cid: 'logo@moodless', contentType: 'image/jpeg' }]
    : [];

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
      attachments: logoAttachment,
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
