'use client';

/**
 * Liquid UI controls — exact port of Aaron Iker's "Liquid UI Elements"
 * (https://codepen.io/aaroniker/pen/ZEpEvdz) into the Launchpad app.
 *
 * "Exact" means the parts that produce the effect are reproduced verbatim:
 *  - identical SVG geometry (circle centres, radii, the tick path)
 *  - identical gooey filters — feGaussianBlur + feColorMatrix with the same
 *    stdDeviation (1.25 / 3 / 7) and the same 21/-7 alpha ramp
 *  - identical GSAP keyframe timings, delays and custom-property targets
 *
 * Only the palette is ours: `--c-active` becomes the Launchpad emerald and the
 * neutrals become theme-aware tokens, so the controls read correctly on both
 * the light and dark ground. Styles live in globals.css beside the rest of the
 * Launchpad glass system.
 *
 * The filters are page-scoped singletons: render <LiquidFilters /> ONCE per
 * page (the workspace shell does it) and every control below references them
 * by id. Duplicating them would duplicate filter ids in the document.
 */

import { useEffect, useRef, type ReactNode } from 'react';

/* ---------------------------------------------------------------------------
 * Filter defs — one per document.
 * ------------------------------------------------------------------------ */
export function LiquidFilters() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" className="absolute">
      <defs>
        <filter id="lp-goo" x="-50%" width="200%" y="-50%" height="200%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 21 -7" result="cm" />
        </filter>
        <filter id="lp-goo-light" x="-50%" width="200%" y="-50%" height="200%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.25" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 21 -7" result="cm" />
        </filter>
        <filter id="lp-goo-big" x="-50%" width="200%" y="-50%" height="200%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 21 -7" result="cm" />
        </filter>
      </defs>
    </svg>
  );
}

/** Read a CSS custom property, exactly as the pen's `getVar` helper does. */
function getVar(key: string, elem: Element = document.documentElement) {
  return getComputedStyle(elem).getPropertyValue(key);
}

/**
 * GSAP drives custom properties, which is what makes these feel liquid rather
 * than switched. It is loaded on demand so the marketing bundle never pays for
 * it, and every animation degrades to the CSS transitions already on the
 * elements if the import fails or motion is reduced.
 */
function useGsap() {
  const ref = useRef<typeof import('gsap').gsap | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    import('gsap')
      .then((m) => { if (!cancelled) ref.current = m.gsap; })
      .catch(() => { /* CSS transitions carry it */ });
    return () => { cancelled = true; };
  }, []);
  return ref;
}

interface ControlProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
  value?: string;
  label?: ReactNode;
  id?: string;
}

/* ---------------------------------------------------------------------------
 * Checkbox — the tick draws itself out of a dropping bead.
 * ------------------------------------------------------------------------ */
export function LiquidCheckbox({ checked, defaultChecked, onChange, disabled, name, value, label, id }: ControlProps) {
  const wrapRef = useRef<HTMLLabelElement>(null);
  const gsapRef = useGsap();

  const animate = (isChecked: boolean) => {
    const gsap = gsapRef.current;
    const elem = wrapRef.current;
    if (!gsap || !elem || !isChecked) return;
    const svg = elem.querySelector('svg');
    const input = elem.querySelector('input');
    if (!svg || !input) return;

    gsap.fromTo(input, { '--border-width': '3px' }, {
      '--border-color': getVar('--c-active', elem), '--border-width': '12px',
      duration: 0.2, clearProps: true,
    });
    gsap.set(svg, {
      '--dot-x': '14px', '--dot-y': '-14px',
      '--tick-offset': '20.5px', '--tick-array': '16.5px', '--drop-s': 1,
    });
    gsap.to(elem, {
      keyframes: [
        { '--border-radius-corner': '14px', duration: 0.2, delay: 0.2 },
        { '--border-radius-corner': '5px', duration: 0.3, clearProps: true },
      ],
    });
    gsap.to(svg, { '--dot-x': '0px', '--dot-y': '0px', '--dot-s': 1, duration: 0.4, delay: 0.4 });
    gsap.to(svg, {
      keyframes: [
        { '--tick-offset': '48px', '--tick-array': '14px', duration: 0.3, delay: 0.2 },
        { '--tick-offset': '46.5px', '--tick-array': '16.5px', duration: 0.35, clearProps: true },
      ],
    });
  };

  return (
    <label className="lp-liquid-row">
      <span ref={wrapRef} className="checkbox">
        <input
          type="checkbox" id={id} name={name} value={value} disabled={disabled}
          {...(checked === undefined ? { defaultChecked } : { checked })}
          onChange={(e) => { animate(e.target.checked); onChange?.(e.target.checked); }}
        />
        <svg viewBox="0 0 24 24" filter="url(#lp-goo-light)">
          <path className="tick" d="M4.5 10L10.5 16L24.5 1" />
          <circle className="dot" cx="10.5" cy="15.5" r="1.5" />
          <circle className="drop" cx="25" cy="-1" r="2" />
        </svg>
      </span>
      {label && <span className="lp-liquid-label">{label}</span>}
    </label>
  );
}

/* ---------------------------------------------------------------------------
 * Radio — the fill drops in from above and settles.
 * ------------------------------------------------------------------------ */
export function LiquidRadio({ checked, defaultChecked, onChange, disabled, name, value, label, id }: ControlProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const gsapRef = useGsap();

  const animate = () => {
    const gsap = gsapRef.current;
    const elem = wrapRef.current;
    if (!gsap || !elem) return;
    const svg = elem.querySelector('svg');
    const input = elem.querySelector('input');
    if (!svg || !input) return;

    gsap.fromTo(input, { '--border-width': '3px' }, {
      '--border-color': getVar('--c-active', elem), '--border-width': '12px', duration: 0.2,
    });
    gsap.to(svg, {
      keyframes: [
        { '--top-y': '6px', '--top-s-x': 1, '--top-s-y': 1.25, duration: 0.2, delay: 0.2 },
        { '--top-y': '0px', '--top-s-x': 1.75, '--top-s-y': 1, duration: 0.6 },
      ],
    });
    gsap.to(svg, {
      keyframes: [
        { '--dot-y': '2px', duration: 0.3, delay: 0.2 },
        { '--dot-y': '0px', duration: 0.3 },
      ],
    });
    gsap.to(svg, {
      '--drop-y': '0px', duration: 0.6, delay: 0.4, clearProps: true,
      onComplete() { input.removeAttribute('style'); },
    });
  };

  return (
    <label className="lp-liquid-row">
      <span ref={wrapRef} className="radio">
        <input
          type="radio" id={id} name={name} value={value} disabled={disabled}
          {...(checked === undefined ? { defaultChecked } : { checked })}
          onChange={(e) => { animate(); onChange?.(e.target.checked); }}
        />
        <svg viewBox="0 0 24 24" filter="url(#lp-goo-light)">
          <circle className="top" cx="12" cy="-12" r="8" />
          <circle className="dot" cx="12" cy="12" r="5" />
          <circle className="drop" cx="12" cy="12" r="2" />
        </svg>
      </span>
      {label && <span className="lp-liquid-label">{label}</span>}
    </label>
  );
}

/* ---------------------------------------------------------------------------
 * Switch — the knob detaches, stretches across, and re-forms.
 * ------------------------------------------------------------------------ */
export function LiquidSwitch({ checked, defaultChecked, onChange, disabled, name, label, id }: ControlProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const gsapRef = useGsap();

  const animate = (isChecked: boolean) => {
    const gsap = gsapRef.current;
    const elem = wrapRef.current;
    if (!gsap || !elem) return;
    const svg = elem.querySelector('svg');
    const input = elem.querySelector('input');
    if (!svg || !input) return;

    const hide = isChecked ? 'default' : 'dot';
    const show = isChecked ? 'dot' : 'default';

    gsap.fromTo(svg, {
      '--default-s': isChecked ? 1 : 0,
      '--default-x': isChecked ? '0px' : '8px',
      '--dot-s': isChecked ? 0 : 1,
      '--dot-x': isChecked ? '-8px' : '0px',
    }, {
      [`--${hide}-s`]: 0,
      [`--${hide}-x`]: isChecked ? '8px' : '-8px',
      duration: 0.25, delay: 0.15,
    });
    gsap.fromTo(input, {
      '--input-background': getVar(isChecked ? '--c-default' : '--c-active', elem),
    }, {
      '--input-background': getVar(isChecked ? '--c-active' : '--c-default', elem),
      duration: 0.35, clearProps: true,
    });
    gsap.to(svg, {
      keyframes: [
        { [`--${show}-x`]: isChecked ? '2px' : '-2px', [`--${show}-s`]: 1, duration: 0.25 },
        { [`--${show}-x`]: '0px', duration: 0.2, clearProps: true },
      ],
    });
  };

  return (
    <label className="lp-liquid-row">
      <span ref={wrapRef} className="switch">
        <input
          type="checkbox" role="switch" id={id} name={name} disabled={disabled}
          {...(checked === undefined ? { defaultChecked } : { checked })}
          onChange={(e) => { animate(e.target.checked); onChange?.(e.target.checked); }}
        />
        <svg viewBox="0 0 38 24" filter="url(#lp-goo)">
          <circle className="default" cx="12" cy="12" r="8" />
          <circle className="dot" cx="26" cy="12" r="8" />
          <circle className="drop" cx="25" cy="-1" r="2" />
        </svg>
      </span>
      {label && <span className="lp-liquid-label">{label}</span>}
    </label>
  );
}

/* ---------------------------------------------------------------------------
 * Button — five blobs converge on hover through the big gooey filter. Pure
 * CSS; no JS at all, exactly as in the pen.
 * ------------------------------------------------------------------------ */
export function LiquidButton({
  children, onClick, type = 'button', disabled, className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`lp-liquid-btn ${className}`}>
      <span>{children}</span>
      <svg preserveAspectRatio="none" viewBox="0 0 132 45" aria-hidden="true">
        <g clipPath="url(#lp-btn-clip)" filter="url(#lp-goo-big)">
          <circle className="top-left" cx="49.5" cy="-0.5" r="26.5" />
          <circle className="middle-bottom" cx="70.5" cy="40.5" r="26.5" />
          <circle className="top-right" cx="104" cy="6.5" r="27" />
          <circle className="right-bottom" cx="123.5" cy="36.5" r="26.5" />
          <circle className="left-bottom" cx="16.5" cy="28" r="30" />
        </g>
        <defs>
          <clipPath id="lp-btn-clip">
            <rect width="132" height="45" rx="7" />
          </clipPath>
        </defs>
      </svg>
    </button>
  );
}
