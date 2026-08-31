import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLaunchpadEnabled } from '@/lib/launchpad/flags';
import TenantGate from '@/components/launchpad/TenantGate';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Launchpad Workspace | FUSARIUM | Mycosoft',
  description: 'FUSARIUM Launchpad tenant workspace — commercial, non-CUI.',
  robots: { index: false, follow: false }, // authenticated app: never indexed
};

/**
 * /app/launchpad/* — the authenticated Launchpad workspace.
 *
 * Server-side: the runtime kill switch. When LAUNCHPAD_ENABLED is off the
 * entire subtree 404s regardless of build. Middleware already requires a
 * signed-in user (AUTH_REQUIRED_PREFIXES); TenantGate resolves the tenant and
 * every BFF route independently re-derives it via requireTenant().
 *
 * `dynamic = 'force-dynamic'` is required for that contract: flags.ts is
 * request-time env. Without it, Next can prerender this layout and a slot
 * env flip does nothing until rebuild.
 */
export default function LaunchpadAppLayout({ children }: { children: React.ReactNode }) {
  if (!isLaunchpadEnabled()) notFound();
  return <TenantGate>{children}</TenantGate>;
}
