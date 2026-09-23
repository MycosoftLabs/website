import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "MYCA | The Opposable Thumb of SI | Mycosoft",
  description:
    "MYCA is a Nature Learning Model grounded in physics, chemistry, biology, and mycology. The only SI continuously trained on live biospheric signals. Meet the Opposable Thumb that coordinates frontier SI.",
  openGraph: {
    title: "MYCA | The Opposable Thumb of SI | Mycosoft",
    description:
      "A Nature Learning Model continuously trained on live environmental signals. Meet the SI that grounds all others.",
  },
}

export default function MYCALayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
