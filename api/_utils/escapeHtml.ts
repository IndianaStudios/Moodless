/**
 * Escapa caracteres HTML especiales para prevenir inyección HTML/XSS en templates de email.
 * Debe aplicarse a TODO contenido generado por el usuario antes de insertarlo en HTML.
 */
export function escapeHtml(str: string): string {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
