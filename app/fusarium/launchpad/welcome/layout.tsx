import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Welcome — FUSARIUM Launchpad',
  description:
    'Confirm your Launchpad purchase and claim your workspace. Entitlements are granted after you sign in with the same email Stripe has.',
};

export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
