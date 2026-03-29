import type { Metadata } from 'next'
import SecurityLayoutClient from './SecurityLayoutClient'

export const metadata: Metadata = {
  title: 'Security | Mycosoft',
  description: "Learn about Mycosoft's security practices, data protection, and compliance measures.",
  alternates: {
    canonical: '/security',
  },
  openGraph: {
    title: 'Security | Mycosoft',
    description: "Learn about Mycosoft's security practices, data protection, and compliance measures.",
    url: '/security',
  },
}

export default function SecurityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <SecurityLayoutClient>{children}</SecurityLayoutClient>
}
