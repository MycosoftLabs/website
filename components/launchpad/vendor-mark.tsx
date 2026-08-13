'use client';

/**
 * VendorMark — small vendor identification mark for Launchpad surfaces.
 *
 * Favicon marks are interim identification per Morgan's Aug 13 directive
 * (decision recorded over GTM §18.1's no-logo default; license basis tracked
 * per mark). Full brand-kit logos + their license basis land per-card via
 * logo_src / logo_license. A mark identifies a vendor — it never implies
 * endorsement, partnership, or certification; the §18.1 disclosure text on
 * each card stays intact.
 *
 * Renders a plain <img> (NOT next/image — no remotePatterns needed; the site
 * CSP img-src already allows https:). On load failure it swaps to a neutral
 * monogram tile (first letter, .myco-glass-tile styling).
 */

import { useState } from 'react';

export interface VendorMarkProps {
  /** Vendor domain, e.g. "preveil.com". Omit / null → neutral monogram tile. */
  domain?: string | null;
  /** Vendor display name — alt text and the monogram letter. */
  name: string;
  /** Square edge in px. */
  size?: number;
  className?: string;
}

export function VendorMark({ domain, name, size = 24, className = '' }: VendorMarkProps) {
  const [failed, setFailed] = useState(false);

  if (!domain || failed) {
    // Neutral monogram tile — the §18.1 default when no mark is available.
    // aria-hidden: the vendor name always renders as adjacent text.
    return (
      <span
        className={`myco-glass-tile shrink-0 font-semibold text-muted-foreground select-none ${className}`}
        style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.45)) }}
        aria-hidden="true"
      >
        {(name.trim().charAt(0) || '?').toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- plain <img> by design: external favicon host, no remotePatterns
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
      alt={`${name} logo`}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={`rounded-md shrink-0 ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
