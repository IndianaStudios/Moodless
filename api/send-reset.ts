import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { escapeHtml } from './_utils/escapeHtml.js';
import { checkRateLimit } from './_utils/rateLimit.js';
import { getFirebaseAdmin } from './_utils/verifyAuth.js';
import { getAuth } from 'firebase-admin/auth';

const LOGO_PATH = join(process.cwd(), 'public', 'logo.jpg');
let _logoBuffer: Buffer | null = null;
const getLogoBuffer = (): Buffer | null => {
  if (_logoBuffer) return _logoBuffer;
  try {
    _logoBuffer = readFileSync(LOGO_PATH);
    return _logoBuffer;
  } catch (e) {
    console.warn('[send-reset] No se pudo cargar public/logo.jpg:', (e as Error).message);
    return null;
  }
};

function buildResetEmailHtml(userName: string, resetLink: string) {
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
                  <td style="font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.92); letter-spacing: -0.01em; vertical-align: middle;">Moodless · Seguridad</td>
                </tr>
              </table>
            </td>
            <td align="right" valign="middle" style="padding: 0 0 0 16px;">
              <span style="display: inline-block; padding: 4px 10px; border-radius: 999px; background: rgba(234,179,8,0.10); border: 1px solid rgba(234,179,8,0.30); color: #fbbf24; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; white-space: nowrap;">Restablecer</span>
            </td>
          </tr>
        </table>
      </div>

      <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(234,179,8,0.45) 50%, transparent 100%);"></div>

      <div style="padding: 48px 32px 8px; text-align: center;">
        <div style="width: 76px; height: 76px; border-radius: 26px; background: linear-gradient(135deg, rgba(234,179,8,0.22) 0%, rgba(234,179,8,0.06) 100%); border: 1px solid rgba(234,179,8,0.32); margin: 0 auto 22px; box-shadow: 0 12px 36px rgba(234,179,8,0.18), inset 0 1px 0 rgba(255,255,255,0.12); position: relative;">
          <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
        </div>
        <p style="color: rgba(251,191,36,0.85); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.16em; margin: 0 0 12px;">Recuperación de contraseña</p>
        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.025em; line-height: 1.2;">Restaura tu acceso</h1>
        <p style="color: rgba(255,255,255,0.6); font-size: 14px; line-height: 1.5; margin: 10px 0 0;">Hola <strong style="color: rgba(255,255,255,0.92); font-weight: 600;">${escapeHtml(userName)}</strong>, alguien (esperamos que tú) ha solicitado restablecer tu contraseña.</p>
      </div>

      <div style="padding: 20px 32px 12px; text-align: center;">
        <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background: #ffffff; color: #0b0911; border-radius: 999px; font-weight: 600; font-size: 14px; text-decoration: none; letter-spacing: -0.005em; box-shadow: 0 4px 18px rgba(255,255,255,0.18);">Restablecer contraseña</a>
      </div>

      <div style="padding: 24px 32px 8px;">
        <div style="background: rgba(234,179,8,0.06); border: 1px solid rgba(234,179,8,0.18); border-left: 3px solid #fbbf24; border-radius: 18px; padding: 18px 20px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);">
          <p style="color: rgba(251,191,36,0.85); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.16em; margin: 0 0 10px;">Información de seguridad</p>
          <ul style="color: rgba(255,255,255,0.85); font-size: 13px; line-height: 1.6; margin: 0; padding-left: 18px;">
            <li style="margin-bottom: 6px;">Este enlace caduca en <strong style="color: #fbbf24;">1 hora</strong>.</li>
            <li style="margin-bottom: 6px;">Si no has solicitado este cambio, ignora este email sin preocuparte.</li>
            <li>Tu contraseña actual seguirá funcionando hasta que la cambies.</li>
          </ul>
        </div>
      </div>

      <div style="padding: 16px 32px 12px; text-align: center;">
        <p style="font-size: 11px; color: rgba(255,255,255,0.35); margin: 0; line-height: 1.5;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
        <p style="font-size: 10px; color: rgba(167,139,250,0.7); margin: 8px 0 0; word-break: break-all; line-height: 1.5;">${resetLink}</p>
      </div>

      <div style="padding: 16px 32px 24px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
        <p style="font-size: 10px; color: rgba(255,255,255,0.3); margin: 0; letter-spacing: 0.02em;">Moodless — Tu diario emocional visual con IA</p>
      </div>
    </div>`;
}
      </div>
    </div>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email } = req.body;

    if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email is required' });
    }

    // Rate limit por IP (no hay auth porque el usuario olvidó su contraseña)
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    const isAllowed = await checkRateLimit(`reset:${clientIp}`, 3, 3600);
    if (!isAllowed) {
        // Devolvemos 200 igualmente para no revelar que hemos bloqueado
        return res.status(200).json({ success: true });
    }

    const { GMAIL_USER, GMAIL_PASS } = process.env;

    if (!GMAIL_USER || !GMAIL_PASS) {
        return res.status(500).json({ error: 'Server email configuration error' });
    }

    try {
        const adminApp = getFirebaseAdmin();

        // Obtener info del usuario para personalizar el email
        let userName = 'usuario';
        try {
            const userRecord = await getAuth(adminApp).getUserByEmail(email);
            userName = userRecord.displayName || email.split('@')[0];
        } catch {
            // Si no existe el usuario, devolvemos éxito igualmente para no filtrar info
            return res.status(200).json({ success: true });
        }

        // Generar el enlace de reset con Firebase Admin
        const firebaseResetLink = await getAuth(adminApp).generatePasswordResetLink(email);

        // Extraer el oobCode del enlace de Firebase y redirigir a nuestra app
        const url = new URL(firebaseResetLink);
        const oobCode = url.searchParams.get('oobCode');
        const appResetLink = `https://moodless.vercel.app?mode=resetPassword&oobCode=${oobCode}`;

        // Enviar email personalizado
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: GMAIL_USER, pass: GMAIL_PASS },
        });

        const logoBuffer = getLogoBuffer();
        const logoAttachment = logoBuffer
          ? [{ filename: 'logo.jpg', content: logoBuffer, cid: 'logo@moodless', contentType: 'image/jpeg' }]
          : [];

        await transporter.sendMail({
            from: `"Moodless" <${GMAIL_USER}>`,
            to: email,
            subject: '🔑 Restablece tu contraseña — Moodless',
            html: buildResetEmailHtml(userName, appResetLink),
            attachments: logoAttachment,
            headers: {
              'Importance': 'High',
              'X-Priority': '1',
              'X-MSMail-Priority': 'High',
            },
        });

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('Password reset error:', error.message);
        // No revelamos detalles del error al cliente por seguridad
        return res.status(200).json({ success: true });
    }
}
