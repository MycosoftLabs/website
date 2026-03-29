import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up | Mycosoft',
  description: 'Create a Mycosoft account to access fungal biotechnology tools and resources.',
  alternates: {
    canonical: '/signup',
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: 'Sign Up | Mycosoft',
    description: 'Create a Mycosoft account to access fungal biotechnology tools and resources.',
    url: '/signup',
  },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
