'use client';

/**
 * FUSARIUM Launchpad — authenticated workspace shell.
 *
 * Middleware guarantees "signed in" (AUTH_REQUIRED_PREFIXES); this gate asks
 * the BFF who the tenant is and routes:
 *   needs_onboarding → /app/launchpad/onboarding
 *   ok               → renders the sidebar shell (boundary strip, workspace
 *                      header, grouped nav)
 *   401              → /login with redirect back
 *
 * Security note: this is UX routing only. Every BFF route re-derives the tenant
 * server-side via requireTenant(); RLS enforces at the database.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Loader2, AlertTriangle, LayoutDashboard, ClipboardCheck, Gauge, ListChecks,
  FolderLock, FileText, Radar, Building2, CreditCard, ScrollText, Menu, X, Rocket, ShieldCheck, KeyRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { COMMERCIAL_NON_CUI_BANNER } from '@/lib/launchpad/constants';
import { LiquidFilters } from '@/components/launchpad/liquid';

interface TenantInfo {
  state: 'ok' | 'needs_onboarding';
  tenant?: { id: string; name: string; status: string };
  role?: string;
  user?: { email: string };
}

type NavItem = { label: string; href: string; icon: LucideIcon };
const NAV_GROUPS: Array<{ group: string; items: NavItem[] }> = [
  {
    group: 'Overview',
    items: [{ label: 'Dashboard', href: '/app/launchpad/dashboard', icon: LayoutDashboard }],
  },
  {
    group: 'Readiness',
    items: [
      { label: 'Requirements', href: '/app/launchpad/readiness/controls', icon: ClipboardCheck },
      { label: 'Score', href: '/app/launchpad/readiness/score', icon: Gauge },
      { label: 'POA&M', href: '/app/launchpad/readiness/poam', icon: ListChecks },
      { label: 'Evidence', href: '/app/launchpad/evidence', icon: FolderLock },
      { label: 'Documents', href: '/app/launchpad/documents', icon: FileText },
    ],
  },
  {
    group: 'Operations',
    items: [{ label: 'Contract Radar', href: '/app/launchpad/opportunities', icon: Radar }],
  },
  {
    group: 'Account',
    items: [
      { label: 'Company', href: '/app/launchpad/company', icon: Building2 },
      { label: 'Billing', href: '/app/launchpad/billing', icon: CreditCard },
      { label: 'API keys', href: '/app/launchpad/settings/keys', icon: KeyRound },
      { label: 'Audit', href: '/app/launchpad/settings/audit', icon: ScrollText },
    ],
  },
];

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'W';
}

export default function TenantGate({ children }: { children: React.ReactNode }) {
  const [info, setInfo] = useState<TenantInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
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
      if (d.state === 'needs_onboarding' && !isOnboarding) router.replace('/app/launchpad/onboarding');
    } catch {
      setErr('Could not reach Launchpad.');
    }
  }, [router, pathname, isOnboarding]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setMobileOpen(false); }, [pathname]);

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
  // Onboarding: render bare (its own centered layout), just under the boundary strip.
  if (isOnboarding || info.state === 'needs_onboarding') {
    return (
      <div className="launchpad-glass-page min-h-dvh flex flex-col">
        <BoundaryStrip />
        <main className="flex-1">{info.state === 'needs_onboarding' && !isOnboarding ? null : children}</main>
      </div>
    );
  }

  const tenant = info.tenant!;
  const Sidebar = (
    <nav className="flex flex-col h-full">
      <Link href="/app/launchpad/dashboard" className="flex items-center gap-2.5 px-5 h-16 border-b border-border/60 shrink-0">
        <div className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
          <Rocket className="h-4.5 w-4.5 text-emerald-500" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-tight">Launchpad</div>
          <div className="text-[10px] text-muted-foreground">Contractor Readiness OS</div>
        </div>
      </Link>

      {/* Workspace identity */}
      <div className="px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {initials(tenant.name)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{tenant.name}</div>
            <div className="text-[11px] text-muted-foreground capitalize">{info.role} · {tenant.status}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {NAV_GROUPS.map((g) => (
          <div key={g.group}>
            <div className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{g.group}</div>
            <div className="space-y-0.5">
              {g.items.map((it) => {
                const active = pathname === it.href || pathname?.startsWith(it.href + '/');
                return (
                  <Link key={it.href} href={it.href}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                      active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium'
                             : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                    <it.icon className="h-4 w-4 shrink-0" />
                    {it.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-border/60">
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
          <ShieldCheck className="h-3 w-3" /> {COMMERCIAL_NON_CUI_BANNER}
        </div>
      </div>
    </nav>
  );

  return (
    // House glass/neumorphic template (same as Apps, Devices, NatureOS):
    // frosted card + button surfaces, light/dark aware.
    <div className="launchpad-glass-page min-h-dvh flex flex-col">
      {/* Gooey filter defs — one set per document; every liquid control below
          references them by id. */}
      <LiquidFilters />
      <BoundaryStrip tenant={tenant} role={info.role} />

      {tenant.status === 'grace' && (
        <StatusBanner tone="amber">Payment issue — workspace in grace period. Update billing to avoid read/export mode.</StatusBanner>
      )}
      {tenant.status === 'read_export' && (
        <StatusBanner tone="red">Read/export mode — new changes are disabled until billing is resolved. Your data remains exportable.</StatusBanner>
      )}

      <div className="flex-1 flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-60 shrink-0 border-r border-border/60 flex-col sticky top-0 h-dvh">
          {Sidebar}
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
            <aside className="relative w-64 bg-background border-r border-border h-full">{Sidebar}</aside>
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Mobile top bar */}
          <div className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-border/60 sticky top-0 bg-background/95 backdrop-blur z-40">
            <button onClick={() => setMobileOpen(true)} className="p-1.5 -ml-1.5 rounded-md hover:bg-muted" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold truncate">{tenant.name}</span>
          </div>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}

function BoundaryStrip({ tenant, role }: { tenant?: { name: string }; role?: string }) {
  return (
    <div className="bg-slate-950 text-center py-1.5 px-4 sticky top-0 z-[60]">
      <span className="text-[11px] tracking-widest font-semibold text-emerald-400">{COMMERCIAL_NON_CUI_BANNER}</span>
      {tenant && <span className="text-[11px] text-slate-400 ml-3 hidden sm:inline">{tenant.name} · {role}</span>}
    </div>
  );
}

function StatusBanner({ tone, children }: { tone: 'amber' | 'red'; children: React.ReactNode }) {
  const cls = tone === 'amber'
    ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
    : 'bg-red-500/15 border-red-500/30 text-red-500';
  return <div className={`border-b text-center py-1.5 px-4 text-xs ${cls}`}>{children}</div>;
}
