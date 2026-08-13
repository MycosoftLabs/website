'use client';

/**
 * FUSARIUM Launchpad — "Take the tour" guided overlay.
 *
 * A modal carousel (deliberately NOT DOM-spotlighting — no fragile selector
 * coupling to page internals) that walks the workspace sections in sidebar
 * nav order. Each slide: the section's icon, two sentences on what it's for,
 * and an "Open this section" link.
 *
 * Accessibility: role="dialog" + aria-modal, focus moves into the dialog on
 * open and returns on close, Tab is trapped inside, ArrowLeft/ArrowRight
 * navigate slides, Escape closes. The slide transition is a component-scoped
 * fade/slide that no-ops under prefers-reduced-motion.
 *
 * Exported pieces: <AppTourButton/> (a GlassButton that owns the open state)
 * and <AppTour/> (the modal itself) for callers that manage their own state.
 * Nothing here is auto-mounted — the dashboard wires the button in.
 */

import { useEffect, useRef, useState } from 'react';
import {
  BookOpen, Boxes, Building2, CalendarClock, ClipboardCheck, ClipboardList, Compass,
  CreditCard, Crosshair, Download, FileCheck2, FileSignature, FileSpreadsheet, FileText,
  FolderLock, Gauge, GraduationCap, Handshake, HardDrive, KeyRound, Layers,
  LayoutDashboard, Library, Lightbulb, ListChecks, ListTodo, Map as MapIcon, PenLine,
  Plug, Radar, ScrollText, ShieldAlert, Vault, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { GlassButton } from '@/components/ui/glass-button';

export interface TourSlide {
  group: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Exactly two sentences: what it's for. */
  blurb: string;
}

/** Stable per-page slug — shared by the tour screenshots and the capture
 * script (scripts/launchpad/capture-tour-screens.mjs). */
export function tourSlug(href: string): string {
  return href.replace('/app/launchpad/', '').replace(/\//g, '-') || 'dashboard';
}

// Sidebar nav order — keep in sync with TenantGate's NAV_GROUPS.
export const TOUR_SLIDES: TourSlide[] = [
  {
    group: 'Overview', label: 'Dashboard', href: '/app/launchpad/dashboard', icon: LayoutDashboard,
    blurb: 'Your workspace home: readiness posture, deadlines, and what needs attention, on one screen. Start here each session to see what changed since last time.',
  },
  {
    group: 'Overview', label: 'Tasks & deadlines', href: '/app/launchpad/tasks', icon: ListTodo,
    blurb: 'The operating calendar for renewals, training refreshes, and assessment milestones. Contracting runs on dates — a lapsed SAM registration alone can silently disqualify you from award.',
  },
  {
    group: 'Readiness', label: 'Scope', href: '/app/launchpad/readiness/scope', icon: Crosshair,
    blurb: 'Where you describe the boundary of the environment you assess: which machines, services, and people are in. Every requirement is judged against this boundary.',
  },
  {
    group: 'Readiness', label: 'Requirements', href: '/app/launchpad/readiness/controls', icon: ClipboardCheck,
    blurb: 'The register of all 110 NIST SP 800-171 security requirements, marked by you with honest states. AI never marks anything implemented on your behalf.',
  },
  {
    group: 'Readiness', label: 'Score', href: '/app/launchpad/readiness/score', icon: Gauge,
    blurb: 'Computes the DoD scoring methodology over your register — from +110 down to −203. It also shows the gates a conditional self-assessment has to pass.',
  },
  {
    group: 'Readiness', label: 'POA&M', href: '/app/launchpad/readiness/poam', icon: ListChecks,
    blurb: 'Plan of Action & Milestones for gaps that are eligible for deferred closure, with the 180-day clock in view. Eligibility comes from a deterministic rule pack, not an AI opinion.',
  },
  {
    group: 'Readiness', label: 'Closure Board', href: '/app/launchpad/readiness/closure', icon: Layers,
    blurb: 'Your open gaps sequenced into five waves, cheapest paper fixes first, with the points each wave recovers. Projections are labelled projections — nothing here claims a wave is already closed.',
  },
  {
    group: 'Readiness', label: 'Tier-1 Turnkey', href: '/app/launchpad/readiness/tier1', icon: ClipboardList,
    blurb: 'Human-entered operator records scanners cannot prove: training completions, screening, tabletop exercises, incident-reporting readiness. Each entry carries a person, a date, and an artifact reference.',
  },
  {
    group: 'Readiness', label: 'SSP', href: '/app/launchpad/readiness/ssp', icon: FileCheck2,
    blurb: 'Drafts your System Security Plan from your scope and register, always labelled DRAFT until a human reviews it. The SSP is itself a required document (requirement 3.12.4).',
  },
  {
    group: 'Readiness', label: 'Reports', href: '/app/launchpad/readiness/reports', icon: FileSpreadsheet,
    blurb: 'Deterministic report drafts assembled from your own data — self-assessment summary, SPRS score report, POA&M export, and educational worksheets. Every one ships DRAFT with placeholders where only you know the answer.',
  },
  {
    group: 'Readiness', label: 'Evidence', href: '/app/launchpad/evidence', icon: FolderLock,
    blurb: 'Index proof of your work — title, requirement links, and a SHA-256 hash computed in your browser. The file itself never leaves your systems.',
  },
  {
    group: 'Readiness', label: 'Documents', href: '/app/launchpad/documents', icon: FileText,
    blurb: 'Generates draft policies and reports with placeholders wherever only you know the answer. Everything ships watermarked DRAFT for customer review.',
  },
  {
    group: 'Readiness', label: 'Signatures', href: '/app/launchpad/signatures', icon: FileSignature,
    blurb: 'Route generated documents to your own DocuSign account and track envelopes to completion — a hundred policy signatures is a real sprint. Launchpad never signs anything; humans sign, the provider certifies.',
  },
  {
    group: 'Readiness', label: 'Training', href: '/app/launchpad/training', icon: GraduationCap,
    blurb: 'Tracks who was assigned which course, when it was completed, and when it expires. Certificates stay in your systems — Launchpad keeps references and hashes.',
  },
  {
    group: 'Operations', label: 'Contract Radar', href: '/app/launchpad/opportunities', icon: Radar,
    blurb: 'Official opportunity feeds filtered toward your profile. An empty list is honest — it is never padded with fake awards.',
  },
  {
    group: 'Operations', label: 'Proposals', href: '/app/launchpad/proposals', icon: PenLine,
    blurb: 'Workspaces for organizing a bid: checklist, portal, references. Launchpad never submits a bid for you — a human always does.',
  },
  {
    group: 'Operations', label: 'Origin Graph', href: '/app/launchpad/origin-graph', icon: Boxes,
    blurb: 'Load a bill of materials and screen parts for Section 889 and origin flags. You record replacement candidates yourself; nothing is auto-certified.',
  },
  {
    group: 'Operations', label: 'Local Agent', href: '/app/launchpad/local-agent', icon: HardDrive,
    blurb: 'Enroll devices to run checks locally; only the result, a one-line summary, and a hash reach the cloud. Raw logs stay on the machine.',
  },
  {
    group: 'Network', label: 'Resources', href: '/app/launchpad/resources', icon: Library,
    blurb: 'Vendor and process listings with compensation disclosures on every card. Listings are information, never endorsements or certifications.',
  },
  {
    group: 'Network', label: 'Enclave Bridge', href: '/app/launchpad/enclave', icon: Vault,
    blurb: 'Track your CUI enclave — provider, hardware, identity, logging — by reference and metadata only. CUI content never enters this workspace.',
  },
  {
    group: 'Network', label: 'Partner Mesh', href: '/app/launchpad/partner-mesh', icon: Handshake,
    blurb: 'Opt-in sharing of selected posture facts with teaming partners. No recorded consent means no data flows, ever.',
  },
  {
    group: 'Network', label: 'Advisory', href: '/app/launchpad/advisory', icon: CalendarClock,
    blurb: 'Book time with a human advisor when a step needs judgment rather than software. Scheduling lives here; the conversation stays between you and the advisor.',
  },
  {
    group: 'Learn', label: 'Learn hub', href: '/app/launchpad/learn', icon: Lightbulb,
    blurb: 'The education layer for founders who have never done government work. Three doors: the glossary, step-by-step walkthroughs, and this tour.',
  },
  {
    group: 'Learn', label: 'Glossary', href: '/app/launchpad/learn/glossary', icon: BookOpen,
    blurb: 'Thirty-seven defense-contracting terms in founder-plain language — NIPRNet, SIPRNet, DIBNet, CUI, clearances, classifications, and more. Every entry links its official source.',
  },
  {
    group: 'Learn', label: 'Walkthroughs', href: '/app/launchpad/learn/walkthroughs', icon: MapIcon,
    blurb: 'Workbook-style step-by-step paths: become a defense contractor, run your CMMC L2 self-assessment, stand up your enclave. One step at a time, with exactly what to click.',
  },
  {
    group: 'Account', label: 'Company', href: '/app/launchpad/company', icon: Building2,
    blurb: 'Non-restricted company facts: legal name, UEI, CAGE, registrations, and renewal dates. Never passwords, tax numbers, or credentials.',
  },
  {
    group: 'Account', label: 'Billing', href: '/app/launchpad/billing', icon: CreditCard,
    blurb: 'Your plan, entitlements, and AI credit balance. Downgrading never deletes data — locked features re-enable in place when you upgrade.',
  },
  {
    group: 'Account', label: 'AI integrations', href: '/app/launchpad/settings/integrations', icon: Plug,
    blurb: 'Connect your own AI provider keys or use managed credits. Bring-your-own-key actions never consume credits, on every tier.',
  },
  {
    group: 'Account', label: 'API keys', href: '/app/launchpad/settings/keys', icon: KeyRound,
    blurb: 'Create scoped keys for automations that work with your workspace. A key is shown once at creation and stored only as a hash.',
  },
  {
    group: 'Account', label: 'Data boundary', href: '/app/launchpad/settings/data-boundary', icon: ShieldAlert,
    blurb: 'The written rules of what this workspace stores and what it refuses — the COMMERCIAL // NON-CUI line. Ten minutes here explains most of the product’s deliberate “no”s.',
  },
  {
    group: 'Account', label: 'Export', href: '/app/launchpad/settings/export', icon: Download,
    blurb: 'Take everything out — your records, in open formats, whenever you want. Read/export mode keeps this working even if billing lapses.',
  },
  {
    group: 'Account', label: 'Audit', href: '/app/launchpad/settings/audit', icon: ScrollText,
    blurb: 'An append-only log of who changed what, and when, across the workspace. It is your evidence that the workspace itself is operated with discipline.',
  },
];

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** sessionStorage key for the cross-page guided visit (read by TourBar). */
export const GUIDED_TOUR_KEY = 'lp-guided-tour-step';

/**
 * Screenshot preview of the real page, captured by
 * scripts/launchpad/capture-tour-screens.mjs into public/assets/launchpad/tour/.
 * Screenshots are a build artifact (public/assets is the gitignored asset
 * pipeline) — if one is missing the preview simply collapses; the tour never
 * shows a broken-image glyph or a fake placeholder.
 */
function TourShot({ href, label }: { href: string; label: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  return (
    <div className="mb-4 rounded-xl border border-border/70 overflow-hidden bg-slate-950/40">
      {/* eslint-disable-next-line @next/next/no-img-element -- local asset, error-collapsed */}
      <img
        src={`/assets/launchpad/tour/${tourSlug(href)}.png`}
        alt={`Screenshot of the ${label} page`}
        loading="lazy"
        className="w-full h-auto block"
        onError={() => setBroken(true)}
      />
    </div>
  );
}

export function AppTour({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  // Focus management + scroll lock for the modal's lifetime.
  useEffect(() => {
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      restoreRef.current?.focus();
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === 'ArrowRight') {
      setIndex((i) => Math.min(i + 1, TOUR_SLIDES.length - 1));
      return;
    }
    if (e.key === 'ArrowLeft') {
      setIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Tab') {
      // Focus trap: cycle within the dialog.
      const root = dialogRef.current;
      if (!root) return;
      const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === root)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const slide = TOUR_SLIDES[index];
  const Icon = slide.icon;
  const isFirst = index === 0;
  const isLast = index === TOUR_SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Component-scoped transition; no-op under reduced motion. */}
      <style>{`
        @keyframes lp-tour-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .lp-tour-anim { animation: lp-tour-in 240ms cubic-bezier(0.25, 1, 0.5, 1) both; }
        @media (prefers-reduced-motion: reduce) { .lp-tour-anim { animation: none; } }
      `}</style>

      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Workspace tour"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="myco-glass-surface relative w-full max-w-lg rounded-2xl border border-border/70 p-6 outline-none max-h-[90dvh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close tour"
          className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        {/* One slide at a time — keyed so the enter animation re-runs. */}
        <div key={slide.href} className="lp-tour-anim text-center pt-2">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3">
            {slide.group}
          </div>
          <div className="myco-glass-tile h-12 w-12 mx-auto mb-3">
            <Icon className="h-6 w-6 text-emerald-500" />
          </div>
          <h2 className="text-lg font-bold tracking-tight">{slide.label}</h2>
          <TourShot href={slide.href} label={slide.label} />
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-md mx-auto">{slide.blurb}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <GlassButton href={slide.href} dataAnalytics={`launchpad-tour-open-${slide.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
              Open this section
            </GlassButton>
            <GlassButton
              onClick={() => {
                // Guided visit: walk the REAL pages one by one — TourBar takes
                // over from here, highlighting each section as you land on it.
                try { sessionStorage.setItem(GUIDED_TOUR_KEY, String(index)); } catch { /* private mode */ }
                window.location.assign(slide.href);
              }}
              dataAnalytics="launchpad-tour-guided-start"
            >
              Start guided visit
            </GlassButton>
          </div>
        </div>

        {/* Dots */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-1" role="group" aria-label="Tour slides">
          {TOUR_SLIDES.map((s, i) => (
            <button
              key={s.href}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}: ${s.label}`}
              aria-current={i === index ? 'true' : undefined}
              title={s.label}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === index ? 'bg-emerald-500' : 'bg-muted-foreground/25 hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>

        {/* Footer: Back · counter · Next */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <GlassButton onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={isFirst}
            dataAnalytics="launchpad-tour-back">
            Back
          </GlassButton>
          <span className="text-xs text-muted-foreground tabular-nums">
            {index + 1} / {TOUR_SLIDES.length}
          </span>
          {isLast ? (
            <GlassButton onClick={onClose} dataAnalytics="launchpad-tour-done">
              Done
            </GlassButton>
          ) : (
            <GlassButton onClick={() => setIndex((i) => Math.min(TOUR_SLIDES.length - 1, i + 1))}
              dataAnalytics="launchpad-tour-next">
              Next
            </GlassButton>
          )}
        </div>

        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          Arrow keys to move between slides · Esc to close
        </p>
      </div>
    </div>
  );
}

/** The "Take the tour" GlassButton, owning its own open/close state. */
export function AppTourButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <GlassButton onClick={() => setOpen(true)} className={className} dataAnalytics="launchpad-tour-start">
        <Compass className="h-4 w-4 text-current mr-2" /> Take the tour
      </GlassButton>
      {open && <AppTour onClose={() => setOpen(false)} />}
    </>
  );
}
