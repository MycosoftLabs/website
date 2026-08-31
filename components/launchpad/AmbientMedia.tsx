'use client';

/**
 * AmbientMedia — background video/graphic layer for glass surfaces.
 *
 * Glass only reads as glass when there is something behind it to blur. This
 * puts a poster-first, lazily-loaded ambient layer behind a section and lays a
 * theme-aware scrim over it so foreground ink stays legible in BOTH modes:
 *   light → white veil (dark text on light glass)
 *   dark  → black veil (light text on dark glass)
 *
 * Performance and accessibility are the whole point of the wrapper:
 *  - poster paints immediately; the video is lazy and unloads off-screen
 *    (AutoplayVideo's pauseWhenOutsideViewport / unloadWhenOutsideViewport)
 *  - `prefers-reduced-motion` renders the POSTER ONLY — no video element
 *  - pointer-events are off so the layer never eats clicks
 *  - `encodeSrc` handles asset filenames containing spaces
 *
 * Use light files for surfaces people sit on all day (the workspace dashboard);
 * heavier hero files belong on marketing pages that are visited once.
 */

import { useEffect, useState } from 'react';
import { AutoplayVideo } from '@/components/ui/autoplay-video';

export interface AmbientMediaProps {
  /** Video under /assets/… . Omit to render a still-image ambient layer. */
  src?: string;
  /** Explicit poster; otherwise AutoplayVideo derives `<name>-poster.jpg`. */
  poster?: string;
  /** Still image when there is no video at all. */
  image?: string;
  /** Media opacity before the scrim. Keep low on work surfaces. */
  opacity?: number;
  /** Scrim strength 0–1. Higher = more legible foreground, less visible media. */
  scrim?: number;
  /** Optional emerald wash to tie the layer to the brand accent. */
  tint?: boolean;
  className?: string;
}

export default function AmbientMedia({
  src,
  poster,
  image,
  opacity = 0.35,
  scrim = 0.72,
  tint = false,
  className = '',
}: AmbientMediaProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const on = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // With reduced motion we still show the still frame — the composition keeps
  // its depth, nothing moves.
  const stillOnly = reducedMotion || !src;
  const stillSrc =
    image ??
    poster ??
    (src ? src.replace(/\.(mp4|webm|mov)$/i, '-poster.jpg') : undefined);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
      {stillOnly
        ? stillSrc && (
            // eslint-disable-next-line @next/next/no-img-element -- decorative background layer
            <img
              src={encodeURI(stillSrc)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={{ opacity }}
              loading="lazy"
              decoding="async"
            />
          )
        : (
          <AutoplayVideo
            src={src}
            poster={poster}
            encodeSrc
            preload="none"
            hideUntilPlaying={false}
            smoothLoop
            pointerEventsNone
            pauseWhenOutsideViewport
            unloadWhenOutsideViewport
            lazyRootMargin="200px"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity }}
          />
        )}

      {/* Theme-aware legibility scrim (light veil / dark veil). */}
      <div
        className="absolute inset-0 bg-white dark:bg-black transition-colors"
        style={{ opacity: scrim }}
      />
      {tint && (
        <div className="absolute inset-0 bg-[radial-gradient(900px_420px_at_18%_0%,rgba(16,185,129,0.16),transparent_62%)]" />
      )}
    </div>
  );
}
