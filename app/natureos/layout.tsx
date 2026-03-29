import type { Metadata } from 'next'
import NatureOSLayoutClient from './NatureOSLayoutClient'

export const metadata: Metadata = {
  title: 'NatureOS | Mycosoft',
  description: "NatureOS — Mycosoft's operating system for monitoring and managing fungal biotechnology systems.",
  alternates: {
    canonical: '/natureos',
  },
  openGraph: {
    title: 'NatureOS | Mycosoft',
    description: "NatureOS — Mycosoft's operating system for monitoring and managing fungal biotechnology systems.",
    url: '/natureos',
  },
}

export default function NatureOSLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <NatureOSLayoutClient>{children}</NatureOSLayoutClient>
}
