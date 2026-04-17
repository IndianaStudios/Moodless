import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { escapeHtml } from './_utils/escapeHtml.js';
import { checkRateLimit } from './_utils/rateLimit.js';

function buildWelcomeHtml(userName: string) {
  return `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #7c3aed, #6366f1); padding: 40px 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">¡Bienvenid@ a Moodless!</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 12px 0 0; font-size: 15px;">Tu diario emocional visual te espera</p>
      </div>
      <div style="padding: 36px 32px; color: #e2e8f0;">
        <p style="font-size: 16px; line-height: 1.7; margin-top: 0;">
          Hola <strong>${escapeHtml(userName)}</strong>,
        </p>
        <p style="font-size: 14px; line-height: 1.7; color: #cbd5e1;">
          Nos alegra mucho que te hayas unido a Moodless. A partir de ahora tienes un espacio seguro y privado para explorar tus emociones día a día.
        </p>

        <div style="background: #1e293b; border-radius: 12px; padding: 24px; margin: 24px 0;">
          <h3 style="color: #a78bfa; margin: 0 0 16px; font-size: 15px;">✨ ¿Qué puedes hacer?</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; vertical-align: top; width: 32px; font-size: 18px;">🎨</td>
              <td style="padding: 10px 0; vertical-align: top;">
                <strong style="color: #e2e8f0;">Registra tu estado de ánimo</strong>
                <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Usa el canvas visual para expresar cómo te sientes sin necesidad de escribir.</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; vertical-align: top; font-size: 18px;">🧠</td>
              <td style="padding: 10px 0; vertical-align: top;">
                <strong style="color: #e2e8f0;">Recibe reflexiones con IA</strong>
                <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Nuestro psicólogo de inteligencia artificial te ayudará a entender tus patrones emocionales.</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; vertical-align: top; font-size: 18px;">🎮</td>
              <td style="padding: 10px 0; vertical-align: top;">
                <strong style="color: #e2e8f0;">Juega y relájate</strong>
                <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Explora los juegos canvas terapéuticos que se adaptan a tu estado de ánimo.</p>
              </td>
            </tr>
          </table>
        </div>

        <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">
          Tu primer paso: abre la app y registra cómo te sientes hoy. ¡Solo te tomará un momento!
        </p>

        <div style="text-align: center; margin: 32px 0 16px;">
          <a href="https://moodless.vercel.app" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #6366f1); color: white; padding: 14px 36px; border-radius: 100px; text-decoration: none; font-weight: 700; font-size: 15px;">
            Abrir Moodless
          </a>
        </div>
      </div>
      <div style="padding: 20px 32px; text-align: center; border-top: 1px solid #1e293b;">
        <p style="font-size: 11px; color: #64748b; margin: 0;">Moodless — Entiende tu mente. Transforma tu energía.</p>
        <p style="font-size: 10px; color: #475569; margin: 8px 0 0;">Recibes este email porque acabas de crear una cuenta en Moodless.</p>
      </div>
    </div>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userName, userEmail } = req.body;

  if (!userName || !userEmail || typeof userName !== 'string' || typeof userEmail !== 'string') {
    return res.status(400).json({ error: 'Missing userName or userEmail' });
  }

  // Rate limit por IP para evitar spam de emails de bienvenida
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const isAllowed = await checkRateLimit(`welcome:${clientIp}`, 3, 3600);
  if (!isAllowed) {
    return res.status(429).json({ error: 'Too many requests' });
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
      pass: GMAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Moodless" <${GMAIL_USER}>`,
      to: userEmail,
      subject: '🎉 ¡Bienvenid@ a Moodless!',
      html: buildWelcomeHtml(userName),
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return res.status(500).json({ error: 'Failed to send welcome email' });
  }
}
