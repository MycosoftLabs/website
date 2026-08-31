'use client';

/**
 * Company section tab strip — Profile | Capabilities | Registrations | Formation |
 * Clearance readiness. Rendered at the top of all four /app/launchpad/company* pages so
 * the company workbook reads as one place with four chapters.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: '/app/launchpad/company', label: 'Profile', exact: true },
  { href: '/app/launchpad/company/capabilities', label: 'Capabilities' },
  { href: '/app/launchpad/company/registrations', label: 'Registrations' },
  { href: '/app/launchpad/company/formation', label: 'Formation' },
  { href: '/app/launchpad/company/clearance-readiness', label: 'Clearance readiness' },
];

export function CompanyTabs() {
  const pathname = usePathname() ?? '';
  return (
    <nav aria-label="Company sections" className="mb-6 flex flex-wrap items-center gap-1 border-b border-border/70">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={`px-3 py-2 text-sm rounded-t-lg border-b-2 -mb-px transition-colors whitespace-nowrap ${
              active
                ? 'border-emerald-500 text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
