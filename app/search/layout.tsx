import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search | Mycosoft',
  description: "Search Mycosoft's database of fungal species, research, and biotechnology resources.",
  alternates: {
    canonical: '/search',
  },
  openGraph: {
    title: 'Search | Mycosoft',
    description: "Search Mycosoft's database of fungal species, research, and biotechnology resources.",
    url: '/search',
  },
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children
}
