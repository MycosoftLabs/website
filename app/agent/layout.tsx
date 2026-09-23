import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SI Agent | Mycosoft',
  description: "Interact with Mycosoft's SI agent for fungal biotechnology insights and research assistance.",
  alternates: {
    canonical: '/agent',
  },
  openGraph: {
    title: 'SI Agent | Mycosoft',
    description: "Interact with Mycosoft's SI agent for fungal biotechnology insights and research assistance.",
    url: '/agent',
  },
}

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return children
}
