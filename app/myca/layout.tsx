import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "MYCA | The Opposable Thumb of AI | Mycosoft",
  description:
    "MYCA is a Nature Learning Model grounded in physics, chemistry, biology, and mycology. The only AI continuously trained on live biospheric signals. Meet the Opposable Thumb that coordinates frontier AI.",
  openGraph: {
    title: "MYCA | The Opposable Thumb of AI | Mycosoft",
    description:
      "A Nature Learning Model continuously trained on live environmental signals. Meet the AI that grounds all others.",
  },
}

export default function MYCALayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
