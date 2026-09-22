'use client';

/**
 * FUSARIUM Launchpad — guided-visit tour bar.
 *
 * Fixed to the viewport bottom (safe-area). Each step navigates to a real page,
 * scrolls the target into view, opens mobile nav when needed, and draws a
 * spotlight + callout on the matched section.
 */

import { useEffect, useLayoutEffect, useState } from 'react';
import { X } from 'lucide-react';
import { GlassButton } from '@/components/ui/glass-button';
import { GUIDED_TOUR_KEY, TOUR_SLIDES } from '@/components/launchpad/app-tour';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function readStep(): number | null {
  try {
    const raw = sessionStorage.getItem(GUIDED_TOUR_KEY);
    if (raw == null) return null;
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 0 && n < TOUR_SLIDES.length) return n;
    sessionStorage.removeItem(GUIDED_TOUR_KEY);
  } catch {
    /* private mode */
  }
  return null;
}

function findTourTarget(href: string, label: string): HTMLElement | null {
  const byData = document.querySelector<HTMLElement>(`[data-tour-target="${href}"]`);
  if (byData) return byData;

  const main = document.querySelector('main');
  if (!main) return null;

  const heading = Array.from(main.querySelectorAll('h1, h2')).find((el) => {
    const text = (el.textContent || '').trim().toLowerCase();
    return text.includes(label.toLowerCase().slice(0, 18).toLowerCase());
  });
  if (heading instanceof HTMLElement) {
    return heading.closest('section, article, [data-tour-section], .myco-glass-surface') as HTMLElement
      ?? heading;
  }

  const firstCard = main.querySelector<HTMLElement>(
    'section, article, [data-tour-section], .myco-glass-surface, form',
  );
  return firstCard ?? (main as HTMLElement);
}

export function TourBar() {
  const [step, setStep] = useState<number | null>(null);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);

  useEffect(() => {
    setStep(readStep());
  }, []);

  useLayoutEffect(() => {
    if (step == null) {
      setSpotlight(null);
      return;
    }
    const slide = TOUR_SLIDES[step];
    const openMobileNav = () => {
      const btn = document.querySelector<HTMLButtonElement>('button[aria-label="Open menu"]');
      const drawer = document.querySelector('.lg\\:hidden.fixed.inset-0');
      if (btn && !drawer && window.matchMedia('(max-width: 1023px)').matches) {
        btn.click();
      }
    };
    openMobileNav();

    const nav = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(`a[href="${slide.href}"]`),
    );
    nav.forEach((a) => a.classList.add('lp-tour-highlight'));

    const apply = () => {
      const target = findTourTarget(slide.href, slide.label);
      if (!target) {
        setSpotlight(null);
        return;
      }
      target.setAttribute('data-lp-tour-active', 'true');
      target.classList.add('lp-tour-section-highlight');
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      const rect = target.getBoundingClientRect();
      const pad = 8;
      setSpotlight({
        top: Math.max(8, rect.top - pad),
        left: Math.max(8, rect.left - pad),
        width: Math.min(window.innerWidth - 16, rect.width + pad * 2),
        height: Math.min(window.innerHeight - 120, rect.height + pad * 2),
      });
    };

    const t1 = window.setTimeout(apply, 80);
    const t2 = window.setTimeout(apply, 400);
    window.addEventListener('resize', apply);
    window.addEventListener('scroll', apply, { passive: true });

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', apply);
      window.removeEventListener('scroll', apply);
      nav.forEach((a) => a.classList.remove('lp-tour-highlight'));
      document.querySelectorAll('[data-lp-tour-active]').forEach((el) => {
        el.removeAttribute('data-lp-tour-active');
        el.classList.remove('lp-tour-section-highlight');
      });
    };
  }, [step]);

  if (step == null) return null;
  const slide = TOUR_SLIDES[step];
  const isFirst = step === 0;
  const isLast = step === TOUR_SLIDES.length - 1;

  const go = (next: number) => {
    try {
      sessionStorage.setItem(GUIDED_TOUR_KEY, String(next));
    } catch {
      /* ignore */
    }
    window.location.assign(TOUR_SLIDES[next].href);
  };
  const end = () => {
    try {
      sessionStorage.removeItem(GUIDED_TOUR_KEY);
    } catch {
      /* ignore */
    }
    setStep(null);
    setSpotlight(null);
  };

  return (
    <>
      {spotlight && (
        <div className="pointer-events-none fixed inset-0 z-[85]" aria-hidden="true">
          <div className="absolute inset-0 bg-black/45" />
          <div
            className="absolute rounded-xl border-2 border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] bg-transparent"
            style={{
              top: spotlight.top,
              left: spotlight.left,
              width: spotlight.width,
              height: spotlight.height,
            }}
          />
          <div
            className="absolute max-w-[min(320px,calc(100vw-2rem))] rounded-xl border border-emerald-500/50 bg-slate-950/95 text-slate-100 px-3 py-2 shadow-lg"
            style={{
              top: Math.min(spotlight.top + spotlight.height + 12, window.innerHeight - 200),
              left: Math.min(spotlight.left, window.innerWidth - 340),
            }}
          >
            <div className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
              {slide.group}
            </div>
            <div className="text-sm font-semibold mt-0.5">{slide.label}</div>
            <p className="text-xs text-slate-300 leading-snug mt-1">{slide.blurb}</p>
          </div>
        </div>
      )}

      <div
        role="region"
        aria-label="Guided tour"
        className="myco-glass-surface fixed left-1/2 -translate-x-1/2 z-[90] w-[min(640px,calc(100vw-1.5rem))] rounded-2xl border border-emerald-500/40 shadow-lg px-4 py-3"
        style={{
          bottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Guided visit · {step + 1}/{TOUR_SLIDES.length}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                {slide.group}
              </span>
            </div>
            <div className="text-sm font-semibold mt-0.5">{slide.label}</div>
            <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">
              {slide.blurb}
            </p>
          </div>
          <button
            type="button"
            onClick={end}
            aria-label="End guided tour"
            className="min-h-[44px] min-w-[44px] -mr-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 inline-flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 mt-2.5">
          <GlassButton
            onClick={() => go(step - 1)}
            disabled={isFirst}
            className="min-h-[44px]"
            dataAnalytics="launchpad-guided-back"
          >
            Back
          </GlassButton>
          <div className="flex flex-wrap items-center justify-center gap-1" aria-hidden="true">
            {TOUR_SLIDES.map((s, i) => (
              <span
                key={s.href}
                className={`h-1.5 w-1.5 rounded-full ${i === step ? 'bg-emerald-500' : 'bg-muted-foreground/25'}`}
              />
            ))}
          </div>
          {isLast ? (
            <GlassButton onClick={end} className="min-h-[44px]" dataAnalytics="launchpad-guided-done">
              Finish
            </GlassButton>
          ) : (
            <GlassButton
              onClick={() => go(step + 1)}
              className="min-h-[44px]"
              dataAnalytics="launchpad-guided-next"
            >
              Next
            </GlassButton>
          )}
        </div>
      </div>
    </>
  );
}
