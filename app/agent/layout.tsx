import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Agent | Mycosoft',
  description: "Interact with Mycosoft's AI agent for fungal biotechnology insights and research assistance.",
  alternates: {
    canonical: '/agent',
  },
  openGraph: {
    title: 'AI Agent | Mycosoft',
    description: "Interact with Mycosoft's AI agent for fungal biotechnology insights and research assistance.",
    url: '/agent',
  },
}

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return children
}
