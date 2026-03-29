import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shop | Mycosoft',
  description: "Shop Mycosoft's fungal biotechnology products, supplements, and biotech devices.",
  alternates: {
    canonical: '/shop',
  },
  openGraph: {
    title: 'Shop | Mycosoft',
    description: "Shop Mycosoft's fungal biotechnology products, supplements, and biotech devices.",
    url: '/shop',
  },
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children
}
