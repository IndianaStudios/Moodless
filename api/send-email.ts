import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Solo permitir POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { category, message, userEmail, userName, ticketId } = req.body;

    // Validar datos
    if (!category || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const ADMIN_EMAIL = 'indianasainzpalacios@gmail.com'; // Tu email de admin

    if (!RESEND_API_KEY) {
        console.error('RESEND_API_KEY not configured');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Moodless Support <onboarding@resend.dev>', // Usa el dominio de Resend por defecto
                to: [ADMIN_EMAIL],
                subject: `🎫 Nuevo Ticket [${category}] - Moodless`,
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6366f1;">Nuevo Ticket de Soporte</h2>
            <hr style="border: 1px solid #e2e8f0;" />
            <p><strong>Categoría:</strong> ${category}</p>
            <p><strong>Usuario:</strong> ${userName || 'Anónimo'} (${userEmail || 'No proporcionado'})</p>
            <p><strong>ID del Ticket:</strong> ${ticketId || 'N/A'}</p>
            <hr style="border: 1px solid #e2e8f0;" />
            <h3 style="color: #334155;">Mensaje:</h3>
            <p style="background: #f1f5f9; padding: 16px; border-radius: 8px;">${message}</p>
            <hr style="border: 1px solid #e2e8f0;" />
            <p style="font-size: 12px; color: #94a3b8;">Este correo fue enviado automáticamente desde Moodless.</p>
          </div>
        `,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Resend API error:', errorData);
            return res.status(500).json({ error: 'Failed to send email', details: errorData });
        }

        const data = await response.json();
        return res.status(200).json({ success: true, id: data.id });
    } catch (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
