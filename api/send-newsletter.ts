import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { verifyAuth, getFirebaseAdmin } from './_utils/verifyAuth.js';
import { escapeHtml } from './_utils/escapeHtml.js';
import { checkRateLimit } from './_utils/rateLimit.js';

// Reemplazar con el email real del admin
const ADMIN_EMAILS = ['indianasainzpalacios@gmail.com'];

function buildNewsletterHtml(subject: string, content: string) {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 24px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05);">
      <div style="background: linear-gradient(135deg, #7c3aed, #2dd4bf); padding: 48px 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.02em;">Moodless News</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 12px 0 0; font-size: 16px;">Descubre las últimas novedades</p>
      </div>
      <div style="padding: 40px 32px; color: #e2e8f0;">
        <h2 style="color: white; font-size: 20px; margin-bottom: 24px;">${escapeHtml(subject)}</h2>
        <div style="line-height: 1.8; color: #94a3b8; font-size: 15px; white-space: pre-wrap;">
          ${escapeHtml(content)}
        </div>
        <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid #1e293b;">
          <a href="https://moodless.vercel.app" style="display: inline-block; background: white; color: #0f172a; padding: 14px 28px; border-radius: 14px; font-weight: bold; text-decoration: none; font-size: 14px;">Probar novedades ahora</a>
        </div>
      </div>
      <div style="padding: 32px; text-align: center; background: #1e293b50;">
        <p style="font-size: 12px; color: #64748b; margin: 0;">Recibes este correo porque eres usuario de Moodless.</p>
        <p style="font-size: 11px; color: #475569; margin: 8px 0 0;">© 2026 Moodless. Diario Visual con IA.</p>
      </div>
    </div>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Verificar autenticación
  const authUser = await verifyAuth(req);
  if (!authUser || 'error' in authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. Verificar que es ADMIN
  if (!ADMIN_EMAILS.includes(authUser.email || '')) {
    return res.status(403).json({ error: 'Forbidden: Admin access only' });
  }

  const { subject, content } = req.body;

  if (!subject || !content) {
    return res.status(400).json({ error: 'Subject and content are required' });
  }

  // 3. Aplicar Rate Limit estricto para newsletters (1 por hora)
  const isAllowed = await checkRateLimit(`newsletter:${authUser.uid}`, 1, 3600);
  if (!isAllowed) {
    return res.status(429).json({ error: 'Límite de newsletter alcanzado. Solo puedes enviar una por hora.' });
  }

  // 4. Obtener todos los usuarios de Firestore
  const adminApp = getFirebaseAdmin();
  const dbAdmin = adminApp.firestore();
  
  try {
    const usersSnapshot = await dbAdmin.collection('users').get();
    const emails: string[] = [];
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.email) emails.push(data.email);
    });

    if (emails.length === 0) {
      return res.status(200).json({ success: true, message: 'No users to send to' });
    }

    const { GMAIL_USER, GMAIL_PASS } = process.env;
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });

    const FROM_EMAIL = `"Moodless Updates" <${GMAIL_USER}>`;

    // 5. Enviar correos (Usamos Bcc para privacidad y eficiencia en un solo envío si la lista es pequeña, 
    // o bucle si es muy grande. Para este caso, enviamos uno a uno o en bloques pequeños)
    // Para mayor privacidad y evitar ser marcado como spam, enviamos individualmente o en grupos de 50
    const results = {
      total: emails.length,
      sent: 0,
      failed: 0
    };

    for (const email of emails) {
      try {
        await transporter.sendMail({
          from: FROM_EMAIL,
          to: email,
          subject: `${subject} — Moodless News`,
          html: buildNewsletterHtml(subject, content),
        });
        results.sent++;
      } catch (err) {
        console.error(`Failed to send to ${email}:`, err);
        results.failed++;
      }
    }

    return res.status(200).json({ success: true, results });
  } catch (error) {
    console.error('Newsletter error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
