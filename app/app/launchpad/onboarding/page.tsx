'use client';

/**
 * Launchpad first-run onboarding.
 *
 * There are two ways a person can arrive here, and they need different work:
 *
 *  - ALREADY PROVISIONED (now the common case). The payment webhook — or
 *    POST billing/activate on the welcome page — created the tenant from the
 *    Stripe metadata before the buyer ever reached this screen. Nothing is
 *    left to name, so the wizard confirms what they bought and records the
 *    four policy acceptances via POST onboarding/accept-terms.
 *  - NO WORKSPACE YET. An authenticated user with no membership (a purchase
 *    that never provisioned, or an account created outside checkout). That
 *    path still names the company and calls POST onboarding, which creates
 *    the tenant atomically. It is kept because nothing else in the app can
 *    create a workspace.
 *
 * Which one runs is decided by the BFF (GET /tenant), never guessed here.
 * Neither path grants entitlements: those derive server-side from the
 * verified subscription, and this page can only ever write the ledger.
 *
 * The black COMMERCIAL // NON-CUI strip is rendered once by TenantGate for
 * this route, so the page carries the boundary as an inline chip rather than
 * stacking a second identical bar under the first.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageSquareQuote,
  Rocket,
  ShieldCheck,
} from 'lucide-react';
import { BLOCKED_DATA_CLASSES, COMMERCIAL_NON_CUI_BANNER } from '@/lib/launchpad/constants';
import { CATALOG, type PlanKey } from '@/lib/launchpad/catalog';
import { NeuBadge, NeuromorphicProvider } from '@/components/ui/neuromorphic';
import { GlassButton } from '@/components/ui/glass-button';
import { LiquidCheckbox, LiquidFilters } from '@/components/launchpad/liquid';

const DASHBOARD = '/app/launchpad/dashboard';

const field =
  'myco-glass-field w-full rounded-lg border border-border px-3 py-2.5 text-base ' +
  'focus:outline-none focus:ring-2 focus:ring-emerald-500/40';

type DocKey = 'terms' | 'privacy' | 'aup' | 'non_cui_policy';

/**
 * Four separate agreements, four separate consents. Bundling them into one
 * "I agree to everything" box would make the acceptance ledger unable to say
 * which document a customer actually consented to.
 */
const DOCS: Array<{ key: DocKey; accept: string; what: string; href: string; linkLabel: string }> = [
  {
    key: 'terms',
    accept: 'I accept the Launchpad Terms of Service',
    what:
      'The contract for this workspace: subscription and billing terms, cancellation, and the ' +
      'limits of the service — Launchpad organizes your own self-assessment and confers no ' +
      'certification, eligibility, or award.',
    href: '/fusarium/launchpad/legal/terms',
    linkLabel: 'Terms of Service',
  },
  {
    key: 'privacy',
    accept: 'I accept the Privacy Notice',
    what:
      'What we hold about you and your company, how it is used, and how you export or delete it.',
    href: '/fusarium/launchpad/legal/privacy',
    linkLabel: 'Privacy Notice',
  },
  {
    key: 'aup',
    accept: 'I accept the Acceptable Use & Anti-Fabrication Policy',
    what:
      'No fabricated evidence, no invented control statuses, and no presenting a Launchpad ' +
      'output as an assessment result or a government determination.',
    href: '/fusarium/launchpad/legal/aup',
    linkLabel: 'Acceptable Use & Anti-Fabrication Policy',
  },
  {
    key: 'non_cui_policy',
    accept: 'I accept the Non-CUI Data Policy',
    what:
      'This workspace is commercial and non-CUI. CUI, classified, and export-controlled material ' +
      'stays in your approved systems — Launchpad holds references, metadata, and hashes only.',
    // Was pointing at /trust, which is the marketing security page and not a
    // policy instrument — so acceptance was being recorded against a document
    // that did not exist. The real draft now lives alongside the other three.
    href: '/fusarium/launchpad/legal/non-cui',
    linkLabel: 'Non-CUI Data Policy',
  },
];

const ALL_DOC_KEYS: DocKey[] = DOCS.map((d) => d.key);

interface TenantInfo {
  state: 'ok' | 'needs_onboarding';
  tenant?: { id: string; name: string; status: string };
  role?: string;
  user?: { email: string };
  /** Present once the backend can say whether this (tenant, user) already
   *  accepted every doc at the current version. Optional so an older serving
   *  image just falls through to showing the wizard. */
  acceptance?: { termsVersion: string; accepted: boolean; docs: string[] };
}

/** One workspace offered by a 409 tenant_selection_required. */
interface Membership {
  id: string;
  name: string;
}

/** Echo of the purchase itself — only readable when we still hold the Stripe session id. */
interface PurchaseEcho {
  planName: string | null;
  company: string | null;
  applyReason: string | null;
}

/** Display name for a plan, taken from the catalog — never a string we made up here. */
function planNameForKey(planKey: string | null): string | null {
  if (!planKey) return null;
  return CATALOG.find((p) => p.planKey === (planKey as PlanKey))?.name ?? null;
}

/** Only ever follow a server redirect that stays inside the workspace. */
function safeWorkspacePath(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/app/launchpad/') ? value : DASHBOARD;
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<CenteredSpinner label="Loading your workspace…" />}>
      <OnboardingFlow />
    </Suspense>
  );
}

function OnboardingFlow() {
  const router = useRouter();
  const params = useSearchParams();
  // Present when the buyer came straight from Stripe's return URL. It is the
  // only handle we have on their checkout intake, and it is optional.
  const sessionId = params?.get('session_id') ?? '';

  const [mode, setMode] = useState<
    'loading' | 'provisioned' | 'create' | 'auth' | 'error' | 'choose'
  >('loading');
  const [info, setInfo] = useState<TenantInfo | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);
  const [echo, setEcho] = useState<PurchaseEcho | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [accepted, setAccepted] = useState<Set<DocKey>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [choosing, setChoosing] = useState<string | null>(null);

  // Held in a ref because choosing a workspace has to re-run the same load that
  // rejected us, and that function is declared below this one.
  const loadRef = useRef<(() => Promise<void>) | null>(null);

  /** Set the active workspace, then re-run the load that just 409'd. */
  const chooseWorkspace = useCallback(
    async (tenantId: string) => {
      setChoosing(tenantId);
      setError(null);
      try {
        const r = await fetch('/api/fusarium/launchpad/tenant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId }),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          setError(d?.error || 'Could not open that workspace.');
          setChoosing(null);
          return;
        }
        setMode('loading');
        setChoosing(null);
        void loadRef.current?.();
      } catch {
        setError('Network error — could not open that workspace.');
        setChoosing(null);
      }
    },
    [],
  );

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/tenant', { cache: 'no-store' });
      if (r.status === 401) {
        setMode('auth');
        return;
      }
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        // Someone in more than one workspace with no lp_tenant cookie gets 409
        // tenant_selection_required. Retrying is guaranteed to return the same
        // 409 forever, so the generic "Try again" card is a dead end — send them
        // somewhere that can actually set the cookie.
        if (d?.code === 'tenant_selection_required') {
          // The 409 now carries the workspaces this session can already see under
          // RLS, so the choice can be offered instead of described. Names come
          // from that payload only — never assembled here.
          const offered: Membership[] = Array.isArray(d.memberships)
            ? d.memberships
                .filter(
                  (m: unknown): m is Membership =>
                    !!m &&
                    typeof (m as Membership).id === 'string' &&
                    typeof (m as Membership).name === 'string',
                )
                .map((m: Membership) => ({ id: m.id, name: m.name }))
            : [];
          setMemberships(offered);
          setError(
            offered.length
              ? 'You belong to more than one workspace. Pick the one to open and we will remember it.'
              : 'You belong to more than one workspace, but we could not read the list.',
          );
          setMode('choose');
          return;
        }
        setError(
          d?.error ||
            (r.status === 404
              ? 'Launchpad is not enabled in this environment.'
              : 'Could not load your workspace.'),
        );
        setMode('error');
        return;
      }
      const tenantInfo = d as TenantInfo;
      setInfo(tenantInfo);
      // Already accepted every doc at this version? Then this is a back button,
      // a bookmark, or a second visit — not a first run. Showing the wizard
      // again would write four more rows into a ledger that cannot be edited or
      // deleted, leaving it unable to say when consent was actually given.
      if (tenantInfo?.state === 'ok' && tenantInfo.acceptance?.accepted) {
        router.replace(DASHBOARD);
        return;
      }
      setMode(tenantInfo?.state === 'ok' ? 'provisioned' : 'create');
    } catch {
      setError('Network error — could not reach Launchpad.');
      setMode('error');
    }
  }, [router]);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  // Plan comes from the subscription the webhook wrote. Best-effort: a missing
  // plan renders an honest blank, it never blocks acceptance.
  useEffect(() => {
    if (mode !== 'provisioned') return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/fusarium/launchpad/billing/state', { cache: 'no-store' });
        if (!r.ok) return;
        const d = await r.json().catch(() => ({}));
        const key = d?.subscription?.plan_key ?? d?.derived?.planKey ?? null;
        if (!cancelled) setPlanName(planNameForKey(typeof key === 'string' ? key : null));
      } catch {
        // Leave the plan blank rather than asserting one.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  // The buyer's own words from checkout, read back so they can see what we
  // received. Read-only, and skipped entirely without a session id.
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(
          `/api/fusarium/launchpad/billing/session/${encodeURIComponent(sessionId)}`,
          { cache: 'no-store' },
        );
        if (!r.ok) return;
        const d = await r.json().catch(() => ({}));
        if (cancelled) return;
        setEcho({
          planName: typeof d?.planName === 'string' ? d.planName : null,
          company: typeof d?.company === 'string' ? d.company : null,
          applyReason: typeof d?.applyReason === 'string' ? d.applyReason : null,
        });
      } catch {
        // Confirmation detail only — nothing here gates the wizard.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const toggle = (key: DocKey) =>
    setAccepted((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  const allAccepted = DOCS.every((d) => accepted.has(d.key));

  /** Record the four acceptances on a workspace that already exists. */
  const acceptTerms = useCallback(async (): Promise<boolean> => {
    const r = await fetch('/api/fusarium/launchpad/onboarding/accept-terms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accepted: ALL_DOC_KEYS }),
    });
    const d = await r.json().catch(() => ({}));

    if (r.ok) {
      router.replace(safeWorkspacePath(d?.redirectTo));
      return true;
    }
    // Already onboarded is the desired end state, not a failure — a double
    // submit or a re-visit should land on the dashboard like a first one.
    if (r.status === 409 && d?.code === 'already_onboarded') {
      router.replace(DASHBOARD);
      return true;
    }
    if (r.status === 401) {
      setMode('auth');
      return false;
    }
    if (r.status === 403 && d?.code === 'tenant_required') {
      // The workspace vanished between load and submit — fall back to the
      // path that can still create one instead of dead-ending.
      setMode('create');
      setNotice('We could not find a workspace on your account. Create it here to continue.');
      return false;
    }
    setError(d?.error || 'Could not record your acceptance. Please try again.');
    return false;
  }, [router]);

  const submitProvisioned = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allAccepted || busy) return;
    setBusy(true);
    setError(null);
    try {
      const done = await acceptTerms();
      if (!done) setBusy(false);
    } catch {
      setError('Network error — please try again.');
      setBusy(false);
    }
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (companyName.trim().length < 2 || !allAccepted || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: companyName.trim(), accepted: ALL_DOC_KEYS }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        router.replace(DASHBOARD);
        return;
      }
      // A workspace was provisioned for this account after all (webhook race):
      // the create route refuses, so record the acceptances against it instead.
      if (r.status === 409 && d?.code === 'already_onboarded') {
        const done = await acceptTerms();
        if (!done) setBusy(false);
        return;
      }
      if (r.status === 401) {
        setMode('auth');
        setBusy(false);
        return;
      }
      setError(d?.error || 'Could not create workspace');
      setBusy(false);
    } catch {
      setError('Network error — please try again');
      setBusy(false);
    }
  };

  if (mode === 'loading') return <CenteredSpinner label="Loading your workspace…" />;

  if (mode === 'auth') {
    return (
      <Shell>
        <div className="myco-glass-surface rounded-2xl border border-border/70 p-6 text-center">
          <h1 className="text-xl font-semibold mb-2">Sign in to finish setup</h1>
          <p className="text-sm text-muted-foreground mb-5">
            Use the same email address your purchase was made with — that is the address your
            workspace is attached to.
          </p>
          <GlassButton href={`/login?redirectTo=${encodeURIComponent('/app/launchpad/onboarding')}`}>
            Sign in
          </GlassButton>
        </div>
      </Shell>
    );
  }

  if (mode === 'choose') {
    // Deliberately offers no "Try again": the same request returns the same 409
    // until a workspace is selected, so a retry button loops forever.
    //
    // It offers no picker either. POST /api/fusarium/launchpad/tenant can set the
    // selection, but the 409 carries no membership list and there is no endpoint
    // to read one, so the client cannot name the choices. Saying so is better
    // than linking somewhere that cannot resolve it.
    return (
      <Shell>
        <div className="myco-glass-surface rounded-2xl border border-border/70 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h1 className="text-lg font-semibold mb-1">Choose a workspace</h1>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              {memberships.length > 0 ? (
                <ul className="space-y-2">
                  {memberships.map((m) => (
                    <li key={m.id}>
                      <GlassButton
                        onClick={() => void chooseWorkspace(m.id)}
                        disabled={choosing !== null}
                        className="myco-glass-button--block"
                      >
                        {choosing === m.id ? (
                          <>
                            <Loader2 className="h-4 w-4 text-current mr-2 animate-spin" /> Opening…
                          </>
                        ) : (
                          m.name
                        )}
                      </GlassButton>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Email{' '}
                  <a
                    href="mailto:support@mycosoft.org?subject=Launchpad%20workspace%20selection"
                    className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2"
                  >
                    support@mycosoft.org
                  </a>{' '}
                  and we will set your default workspace. Your purchase and your data are unaffected.
                </p>
              )}
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (mode === 'error') {
    return (
      <Shell>
        <div className="myco-glass-surface rounded-2xl border border-border/70 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h1 className="text-lg font-semibold mb-1">We could not load your workspace</h1>
              <p className="text-sm text-destructive mb-4">{error}</p>
              <GlassButton
                onClick={() => {
                  setError(null);
                  setMode('loading');
                  void load();
                }}
              >
                Try again
              </GlassButton>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  const provisioned = mode === 'provisioned';
  const workspaceName = info?.tenant?.name ?? '';
  const shownPlan = echo?.planName ?? planName;
  // Only worth surfacing when it disagrees with the workspace we created.
  const checkoutCompany =
    echo?.company && echo.company.trim().toLowerCase() !== workspaceName.trim().toLowerCase()
      ? echo.company
      : null;

  return (
    <Shell>
      {/* Liquid controls reference these filter defs by id. The workspace shell
          renders them only on its sidebar branch, which onboarding never takes. */}
      <LiquidFilters />

      <div className="text-center mb-8">
        <div className="myco-glass-tile p-3 w-fit mx-auto mb-4">
          <Rocket className="h-7 w-7 text-emerald-500" />
        </div>
        <NeuBadge variant="default" className="mb-4">
          {provisioned ? 'First run' : 'Create workspace'}
        </NeuBadge>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          {provisioned ? 'Your workspace is ready' : 'Create your Launchpad workspace'}
        </h1>
        <p className="text-muted-foreground">
          {provisioned
            ? 'Confirm what you bought and accept the four policies. That is the whole setup.'
            : 'One workspace per company. You will be its owner and can invite your team afterward.'}
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-widest text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5" /> {COMMERCIAL_NON_CUI_BANNER}
        </p>
      </div>

      {notice && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm mb-6">
          {notice}
        </div>
      )}

      {provisioned ? (
        <>
          {/* What the payment actually bought. Every value here is read from
              the BFF; a value we do not have is shown as absent, never guessed. */}
          <div className="myco-glass-surface rounded-2xl border-2 border-emerald-500/50 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <p className="text-[11px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-semibold">
                Workspace provisioned
              </p>
            </div>
            <dl className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground mb-1">Company</dt>
                <dd className="font-semibold text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  {workspaceName || <span className="text-muted-foreground font-normal">Not recorded</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground mb-1">Plan</dt>
                <dd className="font-semibold text-base">
                  {shownPlan ?? (
                    <span className="text-muted-foreground font-normal">
                      Not recorded yet —{' '}
                      <Link
                        href="/app/launchpad/billing"
                        className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2"
                      >
                        check billing
                      </Link>
                    </span>
                  )}
                </dd>
              </div>
              {info?.user?.email && (
                <div>
                  <dt className="text-xs text-muted-foreground mb-1">Signed in as</dt>
                  <dd className="font-medium break-all">{info.user.email}</dd>
                </div>
              )}
              {info?.role && (
                <div>
                  <dt className="text-xs text-muted-foreground mb-1">Your role</dt>
                  <dd className="font-medium capitalize">{info.role}</dd>
                </div>
              )}
            </dl>

            {checkoutCompany && (
              <p className="text-xs text-muted-foreground mt-4">
                Your checkout listed <span className="font-medium text-foreground">{checkoutCompany}</span>. If
                the workspace name is wrong, rename it in{' '}
                <Link
                  href="/app/launchpad/company"
                  className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2"
                >
                  Company settings
                </Link>{' '}
                after you are in.
              </p>
            )}
          </div>

          {echo?.applyReason && (
            <div className="myco-glass-surface rounded-2xl border border-border/70 p-6 mb-6">
              <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                <MessageSquareQuote className="h-4 w-4 text-emerald-500" /> What you told us at checkout
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {echo.applyReason}
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                Read-only — it came from your checkout form and is kept with your purchase record.
              </p>
            </div>
          )}

          <form onSubmit={submitProvisioned} className="space-y-6">
            <PolicyCard accepted={accepted} toggle={toggle} disabled={busy} />
            <BoundaryNote />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <GlassButton
              type="submit"
              disabled={!allAccepted || busy}
              className="myco-glass-button--block"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 text-current mr-2 animate-spin" /> Recording your acceptance…
                </>
              ) : (
                'Enter workspace'
              )}
            </GlassButton>
          </form>
        </>
      ) : (
        <form onSubmit={submitCreate} className="space-y-6">
          <div className="myco-glass-surface rounded-2xl border border-border/70 p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="myco-glass-tile h-7 w-7 text-xs font-bold">1</span>
              {/* A heading is not an accessible name — with only an <h2> above it
                  this field announced as an unlabelled edit box. */}
              <label htmlFor="lp-company-legal-name" className="text-lg font-semibold">
                Company legal name
              </label>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              This names the workspace and appears on the documents it generates. Public business
              facts only — never CUI, credentials, or proprietary technical data.
            </p>
            <input
              id="lp-company-legal-name"
              required
              minLength={2}
              maxLength={120}
              placeholder="Acme Robotics, Inc."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={field}
              autoComplete="organization"
              disabled={busy}
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="myco-glass-tile h-7 w-7 text-xs font-bold">2</span>
              <h2 className="text-lg font-semibold">Policy acceptance</h2>
            </div>
            <PolicyCard accepted={accepted} toggle={toggle} disabled={busy} />
          </div>

          <BoundaryNote />
          {error && <p className="text-sm text-destructive">{error}</p>}

          <GlassButton
            type="submit"
            disabled={companyName.trim().length < 2 || !allAccepted || busy}
            className="myco-glass-button--block"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 text-current mr-2 animate-spin" /> Creating workspace…
              </>
            ) : (
              'Create workspace'
            )}
          </GlassButton>
        </form>
      )}

      <p className="text-xs text-muted-foreground mt-6 flex items-start gap-2">
        <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
        Launchpad organizes your own self-assessment work. Your purchase confers no certification,
        eligibility, or award, and Mycosoft is itself pursuing CMMC Level 2 Self-Assessment — nothing
        here is a compliance determination.
      </p>
    </Shell>
  );
}

/* ---------------------------------------------------------------------------
 * Pieces shared by both paths.
 * ------------------------------------------------------------------------ */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <NeuromorphicProvider>
      <div className="container max-w-2xl mx-auto px-4 py-12">{children}</div>
    </NeuromorphicProvider>
  );
}

function CenteredSpinner({ label }: { label: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /> {label}
    </div>
  );
}

function PolicyCard({
  accepted,
  toggle,
  disabled,
}: {
  accepted: Set<DocKey>;
  toggle: (key: DocKey) => void;
  disabled: boolean;
}) {
  return (
    <div className="myco-glass-surface rounded-2xl border border-border/70 p-6">
      <div className="flex items-center gap-2 text-sm font-semibold mb-1">
        <ShieldCheck className="h-4 w-4 text-emerald-500" /> Accept each policy
      </div>
      <p className="text-xs text-muted-foreground mb-5">
        All four are required, and each is recorded separately — with its version — in your
        workspace&apos;s acceptance ledger.
      </p>

      <div className="space-y-4">
        {DOCS.map((d) => (
          <div key={d.key} className="border-t border-border/50 pt-4 first:border-t-0 first:pt-0">
            <LiquidCheckbox
              id={`accept-${d.key}`}
              checked={accepted.has(d.key)}
              onChange={() => toggle(d.key)}
              disabled={disabled}
              label={<span className="font-medium">{d.accept}</span>}
            />
            {/* The link sits outside the <label>: inside it, clicking through to
                the policy would also toggle the box the customer just read for. */}
            <p className="text-xs text-muted-foreground leading-relaxed mt-1.5 pl-8">
              {d.what}{' '}
              <Link
                href={d.href}
                target="_blank"
                className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2 inline-flex items-center gap-1 whitespace-nowrap"
              >
                Read the {d.linkLabel} <ExternalLink className="h-3 w-3" />
              </Link>
            </p>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-5">
        All four documents are published as drafts pending review by counsel — each page says so.
        Naming only some of them here would imply the rest were final. The exact version you accept
        today is what gets recorded.
      </p>
    </div>
  );
}

function BoundaryNote() {
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-muted-foreground">
      <span className="font-semibold text-foreground">This is a non-CUI workspace.</span> Never
      upload: {BLOCKED_DATA_CLASSES.slice(0, 4).join('; ')}; or any other protected content.
      Evidence lives in your systems — Launchpad stores references, metadata, and hashes.
    </div>
  );
}
