'use client';

/**
 * FUSARIUM Launchpad — guided-visit tour bar.
 *
 * The cross-page half of the app tour: when a guided visit is active
 * (sessionStorage GUIDED_TOUR_KEY holds the current step), this bar rides the
 * bottom of every workspace page. It navigates the REAL pages one by one —
 * Back/Next do full navigations so each section is seen live, not as a
 * facsimile — and highlights where you are twice over:
 *   1. the matching sidebar nav link pulses (`.lp-tour-highlight`),
 *   2. the page content gets a soft emerald ring (`.lp-tour-main-ring`).
 * Both classes live in globals.css and no-op under prefers-reduced-motion.
 *
 * Mounted once in TenantGate; renders nothing when no visit is active.
 */

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { GlassButton } from '@/components/ui/glass-button';
import { GUIDED_TOUR_KEY, TOUR_SLIDES } from '@/components/launchpad/app-tour';

export function TourBar() {
  const [step, setStep] = useState<number | null>(null);

  // Read once on mount — each guided-visit navigation is a full page load.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(GUIDED_TOUR_KEY);
      if (raw == null) return;
      const n = Number(raw);
      if (Number.isInteger(n) && n >= 0 && n < TOUR_SLIDES.length) setStep(n);
      else sessionStorage.removeItem(GUIDED_TOUR_KEY);
    } catch { /* storage unavailable */ }
  }, []);

  // Apply highlights for the active slide; clean up on unmount.
  useEffect(() => {
    if (step == null) return;
    const slide = TOUR_SLIDES[step];
    const nav = Array.from(document.querySelectorAll<HTMLAnchorElement>(`a[href="${slide.href}"]`));
    nav.forEach((a) => a.classList.add('lp-tour-highlight'));
    const main = document.querySelector('main');
    main?.classList.add('lp-tour-main-ring');
    nav[0]?.scrollIntoView({ block: 'nearest' });
    return () => {
      nav.forEach((a) => a.classList.remove('lp-tour-highlight'));
      main?.classList.remove('lp-tour-main-ring');
    };
  }, [step]);

  if (step == null) return null;
  const slide = TOUR_SLIDES[step];
  const isFirst = step === 0;
  const isLast = step === TOUR_SLIDES.length - 1;

  const go = (next: number) => {
    try { sessionStorage.setItem(GUIDED_TOUR_KEY, String(next)); } catch { /* ignore */ }
    window.location.assign(TOUR_SLIDES[next].href);
  };
  const end = () => {
    try { sessionStorage.removeItem(GUIDED_TOUR_KEY); } catch { /* ignore */ }
    setStep(null);
  };

  return (
    <div
      role="region"
      aria-label="Guided tour"
      className="myco-glass-surface fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] w-[min(640px,calc(100vw-2rem))] rounded-2xl border border-emerald-500/40 shadow-lg px-4 py-3"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Guided visit · {step + 1}/{TOUR_SLIDES.length}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{slide.group}</span>
          </div>
          <div className="text-sm font-semibold mt-0.5">{slide.label}</div>
          <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">{slide.blurb}</p>
        </div>
        <button
          type="button"
          onClick={end}
          aria-label="End guided tour"
          className="p-1.5 -mr-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center justify-between gap-2 mt-2.5">
        <GlassButton onClick={() => go(step - 1)} disabled={isFirst} dataAnalytics="launchpad-guided-back">
          Back
        </GlassButton>
        <div className="flex flex-wrap items-center justify-center gap-1" aria-hidden="true">
          {TOUR_SLIDES.map((s, i) => (
            <span key={s.href}
              className={`h-1 w-1 rounded-full ${i === step ? 'bg-emerald-500' : 'bg-muted-foreground/25'}`} />
          ))}
        </div>
        {isLast ? (
          <GlassButton onClick={end} dataAnalytics="launchpad-guided-done">Finish</GlassButton>
        ) : (
          <GlassButton onClick={() => go(step + 1)} dataAnalytics="launchpad-guided-next">Next</GlassButton>
        )}
      </div>
    </div>
  );
}
