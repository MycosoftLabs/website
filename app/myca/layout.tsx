import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "MYCA — Orchestration & Cognition Layer | Mycosoft",
  description:
    "MYCA is the orchestration and cognition layer for Mycosoft’s AI platform. Running on edge hardware, grounded in live environmental data, and coordinating agents, models, and real-world systems with a living worldview.",
  openGraph: {
    title: "MYCA — Orchestration & Cognition Layer",
    description:
      "Intelligence that coordinates agents, models, and real-world systems. Grounded in live environmental data. Running on Mycosoft edge hardware.",
  },
}

export default function MYCALayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
