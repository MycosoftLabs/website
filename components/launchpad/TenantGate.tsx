'use client';

/**
 * Client-side tenant resolution for /app/launchpad/*.
 *
 * Middleware guarantees "signed in" (AUTH_REQUIRED_PREFIXES); this gate asks
 * the BFF who the tenant is and routes accordingly:
 *   needs_onboarding → /app/launchpad/onboarding
 *   ok               → renders the workspace shell (banner, nav, status strip)
 *   401              → /login with redirect back
 *
 * Security note: this is UX routing only. Every BFF route re-derives the
 * tenant server-side via requireTenant(); RLS enforces at the database.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { COMMERCIAL_NON_CUI_BANNER } from '@/lib/launchpad/constants';

interface TenantInfo {
  state: 'ok' | 'needs_onboarding';
  tenant?: { id: string; name: string; status: string };
  role?: string;
  user?: { email: string };
}

const NAV: Array<[string, string]> = [
  ['Dashboard', '/app/launchpad/dashboard'],
  ['Readiness', '/app/launchpad/readiness/controls'],
  ['Score', '/app/launchpad/readiness/score'],
  ['POA&M', '/app/launchpad/readiness/poam'],
  ['Evidence', '/app/launchpad/evidence'],
  ['Documents', '/app/launchpad/documents'],
  ['Opportunities', '/app/launchpad/opportunities'],
  ['Company', '/app/launchpad/company'],
  ['Billing', '/app/launchpad/billing'],
  ['Audit', '/app/launchpad/settings/audit'],
];

export default function TenantGate({ children }: { children: React.ReactNode }) {
  const [info, setInfo] = useState<TenantInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const isOnboarding = pathname?.startsWith('/app/launchpad/onboarding');

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/tenant', { cache: 'no-store' });
      if (r.status === 401) {
        router.replace(`/login?redirectTo=${encodeURIComponent(pathname ?? '/app/launchpad/dashboard')}`);
        return;
      }
      if (r.status === 404) { setErr('Launchpad is not enabled in this environment.'); return; }
      const d = await r.json();
      setInfo(d);
      if (d.state === 'needs_onboarding' && !isOnboarding) {
        router.replace('/app/launchpad/onboarding');
      }
    } catch {
      setErr('Could not reach Launchpad.');
    }
  }, [router, pathname, isOnboarding]);

  useEffect(() => { load(); }, [load]);

  if (err) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{err}</p>
        </div>
      </div>
    );
  }
  if (!info) {
    return (
      <div className="min-h-dvh flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading workspace…
      </div>
    );
  }
  if (info.state === 'needs_onboarding' && !isOnboarding) return null; // redirecting

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Persistent boundary banner — a compliance control, not décor */}
      <div className="bg-slate-950 text-center py-1.5 px-4 sticky top-0 z-50">
        <span className="text-[11px] tracking-widest font-semibold text-emerald-400">
          {COMMERCIAL_NON_CUI_BANNER}
        </span>
        {info.tenant && (
          <span className="text-[11px] text-slate-400 ml-3">
            {info.tenant.name} · {info.role}
          </span>
        )}
      </div>

      {info.tenant?.status === 'grace' && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-center py-1.5 px-4 text-xs text-amber-600 dark:text-amber-400">
          Payment issue — workspace in grace period. Update billing to avoid read/export mode.
        </div>
      )}
      {info.tenant?.status === 'read_export' && (
        <div className="bg-red-500/15 border-b border-red-500/30 text-center py-1.5 px-4 text-xs text-red-500">
          Read/export mode — new changes are disabled until billing is resolved. Your data remains exportable.
        </div>
      )}

      {!isOnboarding && info.tenant && (
        <nav className="border-b border-border/60 bg-background/95 sticky top-[26px] z-40 overflow-x-auto">
          <div className="container max-w-7xl mx-auto px-4 flex gap-1 py-1.5 min-w-max">
            {NAV.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className={`text-sm px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
                  pathname?.startsWith(href)
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
      )}

      <main className="flex-1">{children}</main>
    </div>
  );
}
