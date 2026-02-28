import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

const ADMIN_EMAIL = 'indianasainzpalacios@gmail.com';

const categoryLabels: Record<string, string> = {
  bug: '🐛 Bug / Error',
  suggestion: '💡 Sugerencia',
  help: '❓ Duda / Ayuda',
  other: '💬 Otro',
};

function buildAdminEmailHtml(category: string, userName: string, userEmail: string, ticketId: string, message: string) {
  return `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #7c3aed, #6366f1); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">🎫 Nuevo Ticket de Soporte</h1>
      </div>
      <div style="padding: 32px; color: #e2e8f0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #94a3b8; width: 120px;">Categoría</td><td style="padding: 8px 0; font-weight: bold;">${categoryLabels[category] || category}</td></tr>
          <tr><td style="padding: 8px 0; color: #94a3b8;">Usuario</td><td style="padding: 8px 0;">${userName || 'Anónimo'}</td></tr>
          <tr><td style="padding: 8px 0; color: #94a3b8;">Email</td><td style="padding: 8px 0;">${userEmail || 'No proporcionado'}</td></tr>
          <tr><td style="padding: 8px 0; color: #94a3b8;">ID Ticket</td><td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${ticketId || 'N/A'}</td></tr>
        </table>
        <hr style="border: 1px solid #1e293b; margin: 20px 0;" />
        <h3 style="color: #a78bfa; margin-bottom: 12px;">Mensaje:</h3>
        <div style="background: #1e293b; padding: 20px; border-radius: 12px; border-left: 4px solid #7c3aed; line-height: 1.6;">
          ${message}
        </div>
      </div>
      <div style="padding: 16px 32px; text-align: center; border-top: 1px solid #1e293b;">
        <p style="font-size: 11px; color: #64748b; margin: 0;">Enviado automáticamente desde Moodless</p>
      </div>
    </div>`;
}

function buildUserConfirmationHtml(userName: string, category: string, ticketId: string, message: string) {
  return `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #7c3aed, #6366f1); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">✅ Ticket Recibido</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Hemos recibido tu mensaje correctamente</p>
      </div>
      <div style="padding: 32px; color: #e2e8f0;">
        <p style="font-size: 16px; line-height: 1.6;">Hola <strong>${userName || 'usuario'}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
          Tu ticket de soporte ha sido registrado y nuestro equipo lo revisará lo antes posible. 
          A continuación tienes un resumen:
        </p>
        <div style="background: #1e293b; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #94a3b8; width: 120px;">Categoría</td><td style="padding: 8px 0; font-weight: bold;">${categoryLabels[category] || category}</td></tr>
            <tr><td style="padding: 8px 0; color: #94a3b8;">ID Ticket</td><td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${ticketId || 'N/A'}</td></tr>
          </table>
          <hr style="border: 1px solid #334155; margin: 12px 0;" />
          <p style="color: #94a3b8; font-size: 12px; margin-bottom: 8px;">Tu mensaje:</p>
          <p style="margin: 0; line-height: 1.6; font-size: 14px;">${message}</p>
        </div>
        <p style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
          Si necesitas añadir más información, puedes enviar otro ticket desde la app. 
          Te responderemos a este mismo correo si necesitamos más datos.
        </p>
      </div>
      <div style="padding: 16px 32px; text-align: center; border-top: 1px solid #1e293b;">
        <p style="font-size: 11px; color: #64748b; margin: 0;">Moodless — Tu diario visual</p>
      </div>
    </div>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { category, message, userEmail, userName, ticketId } = req.body;

  if (!category || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
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

  try {
    // 1. Email de notificación al admin
    const adminInfo = await transporter.sendMail({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `🎫 Nuevo Ticket [${categoryLabels[category] || category}] - Moodless`,
      html: buildAdminEmailHtml(category, userName, userEmail, ticketId, message),
    });

    // 2. Email de confirmación al usuario
    if (userEmail) {
      try {
        await transporter.sendMail({
          from: FROM_EMAIL,
          to: userEmail,
          subject: `✅ Tu ticket ha sido recibido — Moodless`,
          html: buildUserConfirmationHtml(userName, category, ticketId, message),
        });
      } catch (userEmailError) {
        // Si falla el email al usuario, no bloqueamos (el del admin ya se envió)
        console.error('Failed to send confirmation to user:', userEmailError);
      }
    }

    return res.status(200).json({ success: true, id: adminInfo.messageId });
  } catch (error) {
    console.error('Error sending email with Nodemailer:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
