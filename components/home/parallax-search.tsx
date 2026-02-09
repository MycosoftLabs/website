"use client"

import HeroSearch from "./hero-search"

/**
 * ParallaxSearch - Wraps the homepage hero search (search bar always visible).
 * Updated: February 6, 2026 - Removed scroll-based motion so the search bar
 * always renders; parallax can be re-added later if needed.
 */
export default function ParallaxSearch() {
  return (
    <div>
      <HeroSearch />
    </div>
  )
}
