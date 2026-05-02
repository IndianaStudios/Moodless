
const ADMIN_EMAILS = ['indianasainzpalacios@gmail.com'];

export function isAdmin(email?: string): boolean {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase());
}
