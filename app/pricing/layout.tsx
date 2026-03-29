import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing | Mycosoft',
  description: 'Explore Mycosoft pricing plans for fungal biotechnology products, API access, and enterprise solutions.',
  alternates: {
    canonical: '/pricing',
  },
  openGraph: {
    title: 'Pricing | Mycosoft',
    description: 'Explore Mycosoft pricing plans for fungal biotechnology products, API access, and enterprise solutions.',
    url: '/pricing',
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}
