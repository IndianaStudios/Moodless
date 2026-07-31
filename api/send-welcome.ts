import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
    console.warn('[send-welcome] No se pudo cargar public/logo.jpg:', (e as Error).message);
    return null;
  }
};

function buildWelcomeHtml(userName: string) {
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
                  <td style="font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.92); letter-spacing: -0.01em; vertical-align: middle;">Moodless</td>
                </tr>
              </table>
            </td>
            <td align="right" valign="middle" style="padding: 0 0 0 16px;">
              <span style="display: inline-block; padding: 4px 10px; border-radius: 999px; background: rgba(94,234,212,0.10); border: 1px solid rgba(94,234,212,0.25); color: #5eead4; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; white-space: nowrap;">Bienvenida</span>
            </td>
          </tr>
        </table>
      </div>

      <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.5) 50%, transparent 100%);"></div>

      <div style="padding: 48px 32px 8px; text-align: center;">
        <div style="width: 76px; height: 76px; border-radius: 26px; background: linear-gradient(135deg, rgba(167,139,250,0.28) 0%, rgba(167,139,250,0.08) 100%); border: 1px solid rgba(167,139,250,0.42); margin: 0 auto 22px; box-shadow: 0 12px 36px rgba(167,139,250,0.22), inset 0 1px 0 rgba(255,255,255,0.12); position: relative;">
          <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          </div>
        </div>
        <p style="color: rgba(167,139,250,0.85); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.16em; margin: 0 0 12px;">¡Bienvenid@!</p>
        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.025em; line-height: 1.2;">Tu diario emocional te espera</h1>
        <p style="color: rgba(255,255,255,0.6); font-size: 14px; line-height: 1.5; margin: 10px 0 0;">Hola <strong style="color: rgba(255,255,255,0.92); font-weight: 600;">${escapeHtml(userName)}</strong>, tu espacio seguro y privado está listo.</p>
      </div>

      <div style="padding: 28px 32px 8px;">
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 18px; padding: 22px 20px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);">
          <p style="color: rgba(255,255,255,0.5); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.16em; margin: 0 0 14px;">Lo que puedes hacer</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
            <tr>
              <td width="36" valign="top" style="padding: 6px 12px 6px 0; font-size: 18px; line-height: 1;">🎨</td>
              <td valign="top" style="padding: 6px 0;">
                <p style="margin: 0; color: #ffffff; font-size: 13px; font-weight: 600;">Registra tu estado de ánimo</p>
                <p style="margin: 4px 0 0; color: rgba(255,255,255,0.55); font-size: 12px; line-height: 1.45;">Usa el canvas visual para expresar cómo te sientes sin necesidad de escribir.</p>
              </td>
            </tr>
            <tr><td colspan="2" style="height: 1px; padding: 8px 0;"><div style="height: 1px; background: rgba(255,255,255,0.06);"></div></td></tr>
            <tr>
              <td width="36" valign="top" style="padding: 6px 12px 6px 0; font-size: 18px; line-height: 1;">🧠</td>
              <td valign="top" style="padding: 6px 0;">
                <p style="margin: 0; color: #ffffff; font-size: 13px; font-weight: 600;">Recibe reflexiones con IA</p>
                <p style="margin: 4px 0 0; color: rgba(255,255,255,0.55); font-size: 12px; line-height: 1.45;">Nuestro asistente emocional te ayuda a entender tus patrones día a día.</p>
              </td>
            </tr>
            <tr><td colspan="2" style="height: 1px; padding: 8px 0;"><div style="height: 1px; background: rgba(255,255,255,0.06);"></div></td></tr>
            <tr>
              <td width="36" valign="top" style="padding: 6px 12px 6px 0; font-size: 18px; line-height: 1;">🎮</td>
              <td valign="top" style="padding: 6px 0;">
                <p style="margin: 0; color: #ffffff; font-size: 13px; font-weight: 600;">Juega y relájate</p>
                <p style="margin: 4px 0 0; color: rgba(255,255,255,0.55); font-size: 12px; line-height: 1.45;">Explora los juegos canvas terapéuticos adaptados a tu estado.</p>
              </td>
            </tr>
          </table>
        </div>
      </div>

      <div style="padding: 16px 32px 12px; text-align: center;">
        <p style="color: rgba(255,255,255,0.55); font-size: 13px; line-height: 1.5; margin: 0;">
          Tu primer paso: abre la app y registra cómo te sientes hoy. Solo te tomará un momento.
        </p>
      </div>

      <div style="padding: 12px 32px 32px; text-align: center;">
        <a href="https://moodless.vercel.app" style="display: inline-block; padding: 12px 28px; background: #ffffff; color: #0b0911; border-radius: 999px; font-weight: 600; font-size: 13px; text-decoration: none; letter-spacing: -0.005em; box-shadow: 0 4px 18px rgba(255,255,255,0.18);">Abrir Moodless</a>
      </div>

      <div style="padding: 16px 32px 24px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
        <p style="font-size: 10px; color: rgba(255,255,255,0.3); margin: 0; letter-spacing: 0.02em;">Moodless — Entiende tu mente. Transforma tu energía.</p>
        <p style="font-size: 10px; color: rgba(255,255,255,0.2); margin: 8px 0 0;">Recibes este email porque acabas de crear una cuenta en Moodless.</p>
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
    const logoBuffer = getLogoBuffer();
    const logoAttachment = logoBuffer
      ? [{ filename: 'logo.jpg', content: logoBuffer, cid: 'logo@moodless', contentType: 'image/jpeg' }]
      : [];
    await transporter.sendMail({
      from: `"Moodless" <${GMAIL_USER}>`,
      to: userEmail,
      subject: '🎉 ¡Bienvenid@ a Moodless!',
      html: buildWelcomeHtml(userName),
      attachments: logoAttachment,
      headers: {
        'Importance': 'High',
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
      },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return res.status(500).json({ error: 'Failed to send welcome email' });
  }
}
