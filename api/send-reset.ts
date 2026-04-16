import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { escapeHtml } from './_utils/escapeHtml';
import { checkRateLimit } from './_utils/rateLimit';
import { getFirebaseAdmin } from './_utils/verifyAuth';

function buildResetEmailHtml(userName: string, resetLink: string) {
    return `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #7c3aed, #6366f1); padding: 40px 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800;">🔑 Recupera tu contraseña</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 12px 0 0; font-size: 14px;">Hemos recibido tu solicitud de restablecimiento</p>
      </div>
      <div style="padding: 36px 32px; color: #e2e8f0;">
        <p style="font-size: 16px; line-height: 1.7; margin-top: 0;">
          Hola <strong>${escapeHtml(userName)}</strong>,
        </p>
        <p style="font-size: 14px; line-height: 1.7; color: #cbd5e1;">
          Alguien (esperamos que tú) ha solicitado restablecer la contraseña de tu cuenta en Moodless. 
          Haz clic en el botón de abajo para crear una nueva contraseña:
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #6366f1); color: white; padding: 16px 40px; border-radius: 100px; text-decoration: none; font-weight: 700; font-size: 16px;">
            Restablecer contraseña
          </a>
        </div>

        <div style="background: #1e293b; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0 0 8px; font-weight: 600;">⚠️ Información de seguridad</p>
          <ul style="font-size: 13px; color: #94a3b8; margin: 0; padding-left: 16px; line-height: 1.8;">
            <li>Este enlace caduca en <strong style="color: #e2e8f0;">1 hora</strong>.</li>
            <li>Si no has solicitado este cambio, ignora este email sin preocuparte.</li>
            <li>Tu contraseña actual seguirá funcionando hasta que la cambies.</li>
          </ul>
        </div>

        <p style="font-size: 12px; color: #64748b; line-height: 1.6; margin-top: 24px;">
          Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
          <a href="${resetLink}" style="color: #a78bfa; word-break: break-all; font-size: 11px;">${resetLink}</a>
        </p>
      </div>
      <div style="padding: 20px 32px; text-align: center; border-top: 1px solid #1e293b;">
        <p style="font-size: 11px; color: #64748b; margin: 0;">Moodless — Entiende tu mente. Transforma tu energía.</p>
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
            const userRecord = await adminApp.auth().getUserByEmail(email);
            userName = userRecord.displayName || email.split('@')[0];
        } catch {
            // Si no existe el usuario, devolvemos éxito igualmente para no filtrar info
            return res.status(200).json({ success: true });
        }

        // Generar el enlace de reset con Firebase Admin
        const firebaseResetLink = await adminApp.auth().generatePasswordResetLink(email);

        // Extraer el oobCode del enlace de Firebase y redirigir a nuestra app
        const url = new URL(firebaseResetLink);
        const oobCode = url.searchParams.get('oobCode');
        const appResetLink = `https://moodless.vercel.app?mode=resetPassword&oobCode=${oobCode}`;

        // Enviar email personalizado
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: GMAIL_USER, pass: GMAIL_PASS },
        });

        await transporter.sendMail({
            from: `"Moodless" <${GMAIL_USER}>`,
            to: email,
            subject: '🔑 Restablece tu contraseña — Moodless',
            html: buildResetEmailHtml(userName, appResetLink),
        });

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('Password reset error:', error.message);
        // No revelamos detalles del error al cliente por seguridad
        return res.status(200).json({ success: true });
    }
}
