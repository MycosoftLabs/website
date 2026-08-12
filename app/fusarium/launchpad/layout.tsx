import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FUSARIUM Launchpad — Defense Contractor Readiness & Opportunity OS | Mycosoft',
  description:
    'FUSARIUM Launchpad guides small technical companies through federal registrations, CMMC self-assessment readiness, evidence organization, opportunity discovery, proposal operations, and domestic sourcing. Non-CUI by default. Software plus optional expert guidance — never a certification.',
};

export default function LaunchpadMarketingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
