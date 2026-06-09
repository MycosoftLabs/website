/**
 * Server-side role derivation.
 *
 * SECURITY: Privileged roles must NEVER be read from `user_metadata`, because
 * that field is writable by the user themselves via the public anon key
 * (`supabase.auth.updateUser({ data: { role: 'superuser' } })`). Doing so allows
 * any signed-up user to self-promote to admin/owner.
 *
 * The source of truth for elevated roles is the Supabase-verified email checked
 * against a hardcoded company allowlist. Email is provider-verified (OAuth is
 * domain-restricted to mycosoft.org; credential signups require confirmation),
 * so it cannot be spoofed the way metadata can.
 *
 * Keep this list in sync with lib/auth/api-auth.ts (OWNER_EMAILS / ADMIN_EMAILS).
 */

const OWNER_EMAILS = ['morgan@mycosoft.org', 'morgan@mycosoft.com']

const ADMIN_EMAILS = [
  'morgan@mycosoft.org', 'morgan@mycosoft.com',
  'garret@mycosoft.org', 'garret@mycosoft.com',
  'rj@mycosoft.org', 'rj@mycosoft.com',
  'admin@mycosoft.org', 'admin@mycosoft.com',
]

/** Map a verified email to a server-trusted role. Defaults to the lowest role. */
export function deriveServerRoleFromEmail(email: string | null | undefined): string {
  const normalized = String(email || '').toLowerCase().trim()
  if (!normalized) return 'user'
  if (OWNER_EMAILS.includes(normalized)) return 'owner'
  if (ADMIN_EMAILS.includes(normalized)) return 'admin'
  return 'user'
}

/**
 * Derive a server-trusted role from a Supabase user object.
 * Reads ONLY the verified email — never user_metadata.
 */
export function deriveServerRole(user: { email?: string | null } | null | undefined): string {
  return deriveServerRoleFromEmail(user?.email)
}
