import type { VercelRequest, VercelResponse } from '@vercel/node';

const FROM_EMAIL = 'Moodless <onboarding@resend.dev>';

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
        <p style="font-size: 16px; line-height: 1.6;">Hola <strong>${userName || 'usuario'}</strong>,</p>
        
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
          <p style="margin: 0; line-height: 1.5; font-size: 13px; color: #94a3b8;">${originalMessage}</p>
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userEmail, userName, ticketId, status, adminMessage, originalMessage } = req.body;

  if (!userEmail || !adminMessage || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const statusInfo = statusLabels[status] || { emoji: '📋', label: status };

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [userEmail],
        subject: `${statusInfo.emoji} Tu ticket ha sido ${statusInfo.label.toLowerCase()} — Moodless`,
        html: buildReplyHtml(userName, ticketId, status, adminMessage, originalMessage || ''),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Resend API error:', errorData);
      return res.status(500).json({ error: 'Failed to send reply email', details: errorData });
    }

    const data = await response.json();
    return res.status(200).json({ success: true, id: data.id });
  } catch (error) {
    console.error('Error sending reply email:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
