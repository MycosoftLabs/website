import type { Metadata } from 'next'
import NatureOSLayoutClient from './NatureOSLayoutClient'

export const metadata: Metadata = {
  title: 'NatureOS | Environmental Intelligence | Mycosoft',
  description:
    "NatureOS is Mycosoft's nature operating system for environmental intelligence — Earth Simulator, nature statistics, device fleets, Fungi Compute, Virtual Petri Dish, lab tools, Nature Learning Model, and MINDEX-backed search and simulation.",
  alternates: {
    canonical: '/natureos',
  },
  openGraph: {
    title: 'NatureOS | Environmental Intelligence | Mycosoft',
    description:
      "NatureOS is Mycosoft's nature operating system for environmental intelligence — Earth Simulator, nature statistics, device fleets, Fungi Compute, Virtual Petri Dish, lab tools, Nature Learning Model, and MINDEX-backed search and simulation.",
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
