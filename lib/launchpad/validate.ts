export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const SHA256_RE = /^[a-f0-9]{64}$/i;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function capText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

export function parseIsoDate(
  value: unknown,
): { ok: true; iso: string | null } | { ok: false } {
  if (value == null || value === '') return { ok: true, iso: null };
  if (typeof value !== 'string') return { ok: false };
  const t = Date.parse(value);
  if (Number.isNaN(t)) return { ok: false };
  return { ok: true, iso: new Date(t).toISOString() };
}

/** Credential shape guard used by registration writes. Emails and short IDs pass. */
export function looksLikeSecret(value: string): boolean {
  const s = value.trim();
  if (!s) return false;
  if (EMAIL_RE.test(s)) return false;
  if (/-----BEGIN/.test(s)) return true;
  if (/\b(sk|pk|rk|ghp|gho|glpat|xox[a-z]?|pplx|AIza|AKIA|eyJ)[A-Za-z0-9_.-]{10,}/.test(s)) {
    return true;
  }
  if (!/\s/.test(s) && s.length >= 12) {
    let classes = 0;
    if (/[a-z]/.test(s)) classes += 1;
    if (/[A-Z]/.test(s)) classes += 1;
    if (/\d/.test(s)) classes += 1;
    if (/[^A-Za-z0-9._-]/.test(s)) classes += 1;
    if (classes >= 3) return true;
  }
  return false;
}
