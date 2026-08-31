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
  ListTodo, Crosshair, GraduationCap, FileCheck2, PenLine, Boxes, HardDrive, Library, Vault,
  Handshake, CalendarClock, Plug, ShieldAlert, Download, ClipboardList,
  Layers, FileSpreadsheet, FileSignature, Lightbulb, BookOpen, Map as MapIcon,
  UserCog,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { COMMERCIAL_NON_CUI_BANNER } from '@/lib/launchpad/constants';
import { LiquidFilters } from '@/components/launchpad/liquid';
import { EntitlementsProvider, PlanBadge, CreditMeter } from '@/components/launchpad/entitlements';
import { TourBar } from '@/components/launchpad/tour-bar';

interface TenantInfo {
  state: 'ok' | 'needs_onboarding';
  tenant?: { id: string; name: string; status: string };
  role?: string;
  user?: { email: string };
  isOperator?: boolean;
}

type NavItem = { label: string; href: string; icon: LucideIcon };
// The full Partner-Mesh-Pro surface. Lower tiers see the same map — locked
// screens render a FeatureGate plate, never a hidden nav item, so every
// customer can see what the product does above their plan.
const NAV_GROUPS: Array<{ group: string; items: NavItem[] }> = [
  {
    group: 'Overview',
    items: [
      { label: 'Dashboard', href: '/app/launchpad/dashboard', icon: LayoutDashboard },
      { label: 'Tasks & deadlines', href: '/app/launchpad/tasks', icon: ListTodo },
    ],
  },
  {
    group: 'Readiness',
    items: [
      { label: 'Scope', href: '/app/launchpad/readiness/scope', icon: Crosshair },
      { label: 'Requirements', href: '/app/launchpad/readiness/controls', icon: ClipboardCheck },
      { label: 'Score', href: '/app/launchpad/readiness/score', icon: Gauge },
      { label: 'POA&M', href: '/app/launchpad/readiness/poam', icon: ListChecks },
      { label: 'Closure Board', href: '/app/launchpad/readiness/closure', icon: Layers },
      { label: 'Tier-1 Turnkey', href: '/app/launchpad/readiness/tier1', icon: ClipboardList },
      { label: 'SSP', href: '/app/launchpad/readiness/ssp', icon: FileCheck2 },
      { label: 'Reports', href: '/app/launchpad/readiness/reports', icon: FileSpreadsheet },
      { label: 'Evidence', href: '/app/launchpad/evidence', icon: FolderLock },
      { label: 'Documents', href: '/app/launchpad/documents', icon: FileText },
      { label: 'Signatures', href: '/app/launchpad/signatures', icon: FileSignature },
      { label: 'Training', href: '/app/launchpad/training', icon: GraduationCap },
    ],
  },
  {
    group: 'Operations',
    items: [
      { label: 'Contract Radar', href: '/app/launchpad/opportunities', icon: Radar },
      { label: 'Proposals', href: '/app/launchpad/proposals', icon: PenLine },
      { label: 'Origin Graph', href: '/app/launchpad/origin-graph', icon: Boxes },
      { label: 'Local Agent', href: '/app/launchpad/local-agent', icon: HardDrive },
    ],
  },
  {
    group: 'Network',
    items: [
      { label: 'Resources', href: '/app/launchpad/resources', icon: Library },
      { label: 'Enclave Bridge', href: '/app/launchpad/enclave', icon: Vault },
      { label: 'Partner Mesh', href: '/app/launchpad/partner-mesh', icon: Handshake },
      { label: 'Advisory', href: '/app/launchpad/advisory', icon: CalendarClock },
    ],
  },
  {
    group: 'Learn',
    items: [
      { label: 'Learn hub', href: '/app/launchpad/learn', icon: Lightbulb },
      { label: 'Glossary', href: '/app/launchpad/learn/glossary', icon: BookOpen },
      { label: 'Walkthroughs', href: '/app/launchpad/learn/walkthroughs', icon: MapIcon },
    ],
  },
  {
    group: 'Account',
    items: [
      { label: 'Company', href: '/app/launchpad/company', icon: Building2 },
      { label: 'Billing', href: '/app/launchpad/billing', icon: CreditCard },
      { label: 'AI integrations', href: '/app/launchpad/settings/integrations', icon: Plug },
      { label: 'API keys', href: '/app/launchpad/settings/keys', icon: KeyRound },
      { label: 'Data boundary', href: '/app/launchpad/settings/data-boundary', icon: ShieldAlert },
      { label: 'Export', href: '/app/launchpad/settings/export', icon: Download },
      { label: 'Audit', href: '/app/launchpad/settings/audit', icon: ScrollText },
    ],
  },
];

/**
 * Sidebar navigation link.
 *
 * Neither plain option works here:
 *  - <Link> alone hits the App Router client-cache stall — the URL never moves,
 *    <main> never swaps, and the click reads as dead (the "everything takes two
 *    clicks" complaint).
 *  - a plain <a> always works but is a full document load, so the shell
 *    remounts and every section change flashes "Loading workspace…".
 *
 * So: keep a real <a href> (middle-click, open-in-new-tab, and copy-link all
 * behave), try the client-side push first, and if the router has not committed
 * shortly after, fall back to a real navigation. Healthy navigations are
 * instant and never reload; a stalled one self-heals instead of dying.
 */
function NavLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Modified clicks belong to the browser (new tab, new window, download).
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    e.preventDefault();

    // The failure mode is NOT a stuck URL — the URL commits fine and <main>
    // keeps rendering the previous route (verified live: path moved to
    // /dashboard while the heading still read "Evidence index"). So the only
    // reliable success signal is that the rendered content actually changed.
    const mainBefore = document.querySelector('main');
    const nodeBefore = mainBefore?.firstElementChild ?? null;
    const textBefore = (
      mainBefore instanceof HTMLElement ? mainBefore.innerText : mainBefore?.textContent ?? ''
    ).slice(0, 200);

    router.push(href);

    window.setTimeout(() => {
      const mainNow = document.querySelector('main');
      const nodeNow = mainNow?.firstElementChild ?? null;
      const textNow = (
        mainNow instanceof HTMLElement ? mainNow.innerText : mainNow?.textContent ?? ''
      ).slice(0, 200);
      const swapped = nodeNow !== nodeBefore || textNow !== textBefore;
      if (!swapped) window.location.assign(href);
    }, 1200);
  };

  return (
    <a
      href={href}
      className={className}
      onClick={onClick}
      // Warm the route so the client-side path usually wins the race.
      onMouseEnter={() => router.prefetch(href)}
    >
      {children}
    </a>
  );
}

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
  const isAdminPath = pathname?.startsWith('/app/launchpad/admin');

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/tenant', { cache: 'no-store' });
      if (r.status === 401) {
        window.location.replace(`/login?redirectTo=${encodeURIComponent(pathname ?? '/app/launchpad/dashboard')}`);
        return;
      }
      if (r.status === 404) { setErr('Launchpad is not enabled in this environment.'); return; }
      const d = await r.json();
      setInfo(d);
      if (
        d.state === 'needs_onboarding' &&
        !isOnboarding &&
        !(d.isOperator && isAdminPath)
      ) {
        router.replace('/app/launchpad/onboarding');
      }
    } catch {
      setErr('Could not reach Launchpad.');
    }
  }, [router, pathname, isOnboarding, isAdminPath]);

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
  if (isOnboarding || (info.state === 'needs_onboarding' && !(info.isOperator && isAdminPath))) {
    return (
      <div className="launchpad-glass-page min-h-dvh flex flex-col">
        <BoundaryStrip />
        <main className="flex-1">{info.state === 'needs_onboarding' && !isOnboarding ? null : children}</main>
      </div>
    );
  }

  if (info.state === 'needs_onboarding' && info.isOperator && isAdminPath) {
    return (
      <div className="launchpad-glass-page min-h-dvh flex flex-col">
        <BoundaryStrip />
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  const tenant = info.tenant!;
  const Sidebar = (
    <nav className="flex flex-col h-full">
      <NavLink href="/app/launchpad/dashboard" className="flex items-center gap-2.5 px-5 h-16 border-b border-border/60 shrink-0">
        <div className="myco-glass-tile h-8 w-8">
          <Rocket className="h-4.5 w-4.5 text-emerald-500" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-tight">Launchpad</div>
          <div className="text-[10px] text-muted-foreground">Contractor Readiness OS</div>
        </div>
      </NavLink>

      {/* Workspace identity */}
      <div className="px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="myco-glass-tile myco-glass-tile--accent h-9 w-9 text-xs font-bold shrink-0">
            {initials(tenant.name)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{tenant.name}</div>
            <div className="text-[11px] text-muted-foreground capitalize">{info.role} · {tenant.status}</div>
            <PlanBadge />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {(info.isOperator
          ? [{ group: 'Operator', items: [{ label: 'Operator', href: '/app/launchpad/admin', icon: UserCog }] }, ...NAV_GROUPS]
          : NAV_GROUPS
        ).map((g) => (
          <div key={g.group}>
            <div className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{g.group}</div>
            <div className="space-y-0.5">
              {g.items.map((it) => {
                const active = pathname === it.href || pathname?.startsWith(it.href + '/');
                return (
                  <NavLink key={it.href} href={it.href}
                    className={`myco-glass-navlink flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${
                      active ? 'is-active text-emerald-600 dark:text-emerald-400 font-medium'
                             : 'text-muted-foreground hover:text-foreground'}`}>
                    <it.icon className="h-4 w-4 shrink-0" />
                    {it.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-border/60 space-y-2">
        <CreditMeter />
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
          <ShieldCheck className="h-3 w-3" /> {COMMERCIAL_NON_CUI_BANNER}
        </div>
      </div>
    </nav>
  );

  return (
    // House glass/neumorphic template (same as Apps, Devices, NatureOS):
    // frosted card + button surfaces, light/dark aware.
    <EntitlementsProvider>
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
        <aside className="myco-glass-rail hidden lg:flex w-60 shrink-0 border-r border-border/60 flex-col sticky top-0 h-dvh">
          {Sidebar}
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
            <aside className="myco-glass-rail relative w-64 border-r border-border h-full">{Sidebar}</aside>
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

      {/* Guided-visit companion — renders only while a tour is active. */}
      <TourBar />
    </div>
    </EntitlementsProvider>
  );
}

function BoundaryStrip({ tenant, role }: { tenant?: { name: string }; role?: string }) {
  return (
    <div className="bg-slate-950 text-center py-1.5 px-4 sticky top-0 z-[60]">
      <span className="text-[11px] tracking-widest font-semibold text-emerald-400">{COMMERCIAL_NON_CUI_BANNER}</span>
      {tenant && <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-3 hidden sm:inline">{tenant.name} · {role}</span>}
    </div>
  );
}

function StatusBanner({ tone, children }: { tone: 'amber' | 'red'; children: React.ReactNode }) {
  const cls = tone === 'amber'
    ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
    : 'bg-red-500/15 border-red-500/30 text-red-500';
  return <div className={`border-b text-center py-1.5 px-4 text-xs ${cls}`}>{children}</div>;
}
