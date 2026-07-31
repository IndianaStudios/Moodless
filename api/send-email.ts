import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { verifyAuth } from './_utils/verifyAuth.js';
import { escapeHtml } from './_utils/escapeHtml.js';
import { checkRateLimit } from './_utils/rateLimit.js';

const ADMIN_EMAIL = 'indianasainzpalacios@gmail.com';

const categoryLabels: Record<string, string> = {
  bug: '🐛 Bug / Error',
  suggestion: '💡 Sugerencia',
  help: '❓ Duda / Ayuda',
  other: '💬 Otro',
};

function buildAdminEmailHtml(category: string, userName: string, userEmail: string, ticketId: string, message: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0b0911; border-radius: 32px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08);">
      <div style="padding: 14px 24px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 26px; height: 26px; border-radius: 8px; background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,0.18);"></div>
          <span style="color: rgba(255,255,255,0.92); font-size: 13px; font-weight: 600; letter-spacing: -0.01em;">Moodless · Soporte</span>
        </div>
        <span style="color: rgba(255,255,255,0.45); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;">Nuevo ticket</span>
      </div>

      <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.4) 50%, transparent 100%);"></div>

      <div style="padding: 36px 32px 8px;">
        <p style="color: rgba(255,255,255,0.5); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.16em; margin: 0 0 8px;">Asunto</p>
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; line-height: 1.2;">${escapeHtml(category)}</h1>
        <p style="color: rgba(255,255,255,0.55); font-size: 14px; line-height: 1.5; margin: 8px 0 0;">Un usuario ha enviado un nuevo ticket de soporte.</p>
      </div>

      <div style="padding: 24px 32px 8px;">
        <p style="color: rgba(255,255,255,0.5); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.16em; margin: 0 0 10px;">Detalles del usuario</p>
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 18px; padding: 16px 18px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: rgba(255,255,255,0.45); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; width: 90px;">Nombre</td><td style="padding: 6px 0; color: #ffffff; font-size: 14px; font-weight: 500;">${escapeHtml(userName)}</td></tr>
            <tr><td style="padding: 6px 0; color: rgba(255,255,255,0.45); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;">Email</td><td style="padding: 6px 0; color: #ffffff; font-size: 14px;"><a href="mailto:${escapeHtml(userEmail)}" style="color: #c4b5fd; text-decoration: none;">${escapeHtml(userEmail)}</a></td></tr>
            <tr><td style="padding: 6px 0; color: rgba(255,255,255,0.45); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;">Ticket</td><td style="padding: 6px 0; color: rgba(255,255,255,0.55); font-family: 'SF Mono', ui-monospace, monospace; font-size: 12px;">${escapeHtml(ticketId)}</td></tr>
          </table>
        </div>
      </div>

      <div style="padding: 8px 32px 32px;">
        <p style="color: rgba(255,255,255,0.5); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.16em; margin: 0 0 10px;">Mensaje</p>
        <div style="background: linear-gradient(180deg, rgba(124,58,237,0.08) 0%, rgba(255,255,255,0.02) 100%); border: 1px solid rgba(167,139,250,0.18); border-left: 3px solid #a78bfa; border-radius: 18px; padding: 18px 20px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);">
          <p style="color: rgba(255,255,255,0.92); font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${escapeHtml(message)}</p>
        </div>
      </div>

      <div style="padding: 18px 32px 32px;">
        <a href="https://moodless.vercel.app/app/admin" style="display: inline-block; padding: 12px 28px; background: #ffffff; color: #0b0911; border-radius: 999px; font-weight: 600; font-size: 13px; text-decoration: none; letter-spacing: -0.005em; box-shadow: 0 4px 18px rgba(255,255,255,0.18);">Abrir en el panel de admin →</a>
      </div>

      <div style="padding: 16px 32px 24px; border-top: 1px solid rgba(255,255,255,0.05);">
        <p style="font-size: 10px; color: rgba(255,255,255,0.3); margin: 0; letter-spacing: 0.02em;">Enviado automáticamente · ${new Date().toISOString()}</p>
      </div>
    </div>`;
}

function buildUserConfirmationHtml(userName: string, category: string, ticketId: string, message: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0b0911; border-radius: 32px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08);">
      <div style="padding: 14px 24px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 26px; height: 26px; border-radius: 8px; background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,0.18);"></div>
          <span style="color: rgba(255,255,255,0.92); font-size: 13px; font-weight: 600; letter-spacing: -0.01em;">Moodless</span>
        </div>
        <span style="color: rgba(255,255,255,0.45); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;">Tu mensaje</span>
      </div>

      <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(94,234,212,0.4) 50%, transparent 100%);"></div>

      <div style="padding: 36px 32px 8px; text-align: center;">
        <div style="width: 64px; height: 64px; border-radius: 22px; background: linear-gradient(135deg, rgba(94,234,212,0.22) 0%, rgba(94,234,212,0.08) 100%); border: 1px solid rgba(94,234,212,0.32); margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 28px rgba(94,234,212,0.18), inset 0 1px 0 rgba(255,255,255,0.1);">
          <span style="font-size: 28px;">✓</span>
        </div>
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; line-height: 1.2;">Recibimos tu mensaje</h1>
        <p style="color: rgba(255,255,255,0.6); font-size: 14px; line-height: 1.5; margin: 8px 0 0;">Hola ${escapeHtml(userName)}, gracias por escribirnos.</p>
      </div>

      <div style="padding: 24px 32px 8px;">
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 18px; padding: 18px 20px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);">
          <p style="color: rgba(255,255,255,0.5); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.16em; margin: 0 0 12px;">Resumen</p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px;">
            <tr><td style="padding: 4px 0; color: rgba(255,255,255,0.45); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; width: 90px;">Categoría</td><td style="padding: 4px 0; color: #ffffff; font-size: 13px; font-weight: 500;">${escapeHtml(category)}</td></tr>
            <tr><td style="padding: 4px 0; color: rgba(255,255,255,0.45); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;">Ticket</td><td style="padding: 4px 0; color: rgba(255,255,255,0.55); font-family: 'SF Mono', ui-monospace, monospace; font-size: 11px;">${escapeHtml(ticketId)}</td></tr>
          </table>
          <div style="height: 1px; background: rgba(255,255,255,0.06); margin: 12px 0;"></div>
          <p style="color: rgba(255,255,255,0.45); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.16em; margin: 0 0 8px;">Tu mensaje</p>
          <p style="color: rgba(255,255,255,0.85); font-size: 13px; line-height: 1.55; margin: 0; white-space: pre-wrap;">${escapeHtml(message)}</p>
        </div>
      </div>

      <div style="padding: 24px 32px 12px; text-align: center;">
        <p style="color: rgba(255,255,255,0.55); font-size: 13px; line-height: 1.5; margin: 0;">
          Revisaremos tu caso en menos de 48 horas. Te responderemos a este mismo correo si necesitamos más información.
        </p>
      </div>

      <div style="padding: 12px 32px 32px; text-align: center;">
        <a href="https://moodless.vercel.app" style="display: inline-block; padding: 12px 28px; background: #ffffff; color: #0b0911; border-radius: 999px; font-weight: 600; font-size: 13px; text-decoration: none; letter-spacing: -0.005em; box-shadow: 0 4px 18px rgba(255,255,255,0.18);">Abrir Moodless</a>
      </div>

      <div style="padding: 16px 32px 24px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
        <p style="font-size: 10px; color: rgba(255,255,255,0.3); margin: 0; letter-spacing: 0.02em;">Moodless — Tu diario emocional visual con IA</p>
      </div>
    </div>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verificar autenticación
  const authUser = await verifyAuth(req);
  if (!authUser || 'error' in authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { category, message, userEmail, userName, ticketId } = req.body;

  if (!category || typeof category !== 'string' || !message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid required fields' });
  }

  if (message.length > 5000) {
    return res.status(400).json({ error: 'Message is too long (limit: 5000 characters)' });
  }

  // Aplicar Rate Limit: 5 peticiones por hora (3600 segundos) por usuario
  const isAllowed = await checkRateLimit(`email:${authUser.uid}`, 5, 3600);
  if (!isAllowed) {
    return res.status(429).json({ error: 'Demasiados correos de soporte enviados. Vuelve a intentarlo más tarde.' });
  }

  const { GMAIL_USER, GMAIL_PASS } = process.env;

  if (!GMAIL_USER || !GMAIL_PASS) {
    console.error('[send-email] GMAIL_USER or GMAIL_PASS not configured in env vars.');
    return res.status(500).json({ error: 'Server configuration error: email service not configured.' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS, // Contraseña de aplicación
    },
  });

  // Verificar conectividad con SMTP antes de enviar (falla rápido si la config está mal)
  try {
    await transporter.verify();
    console.log('[send-email] SMTP connection OK');
  } catch (verifyError: any) {
    console.error('[send-email] SMTP verify failed:', verifyError?.message || verifyError);
    return res.status(500).json({ error: 'SMTP configuration error', detail: verifyError?.message });
  }

  const FROM_EMAIL = `"Moodless" <${GMAIL_USER}>`;

  try {
    // 1. Email de notificación al admin
    console.log(`[send-email] Sending admin email to ${ADMIN_EMAIL} for ticket ${ticketId}...`);
    const adminInfo = await transporter.sendMail({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `Nuevo ticket · ${categoryLabels[category] || category} · Moodless`,
      html: buildAdminEmailHtml(
        categoryLabels[category] || escapeHtml(category),
        escapeHtml(userName || 'Anónimo'),
        escapeHtml(userEmail || 'No proporcionado'),
        escapeHtml(ticketId || 'N/A'),
        escapeHtml(message)
      ),
      headers: {
        'Importance': 'High',
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
      },
    });
    console.log(`[send-email] Admin email sent: messageId=${adminInfo.messageId}`);

    // 2. Email de confirmación al usuario
    if (userEmail) {
      try {
        await transporter.sendMail({
          from: FROM_EMAIL,
          to: userEmail,
          subject: `Recibimos tu mensaje · Moodless`,
          html: buildUserConfirmationHtml(
            escapeHtml(userName || 'usuario'),
            categoryLabels[category] || escapeHtml(category),
            escapeHtml(ticketId || 'N/A'),
            escapeHtml(message)
          ),
          headers: {
            'Importance': 'High',
            'X-Priority': '1',
            'X-MSMail-Priority': 'High',
          },
        });
        console.log(`[send-email] Confirmation email sent to user ${userEmail}`);
      } catch (userEmailError: any) {
        // Si falla el email al usuario, no bloqueamos (el del admin ya se envió)
        console.error('[send-email] Failed to send confirmation to user:', userEmailError?.message || userEmailError);
      }
    }

    return res.status(200).json({ success: true, id: adminInfo.messageId });
  } catch (error: any) {
    console.error('[send-email] Nodemailer error:', error?.message || error);
    return res.status(500).json({ error: 'Internal server error', detail: error?.message });
  }
}
