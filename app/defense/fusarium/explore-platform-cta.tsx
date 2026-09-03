"use client"

import { useEffect, useState } from "react"
import { ArrowRight } from "lucide-react"
import { NeuButton } from "@/components/ui/neuromorphic"
import {
  FUSARIUM_PUBLIC_LOGIN_HREF,
  getFusariumLoginHref,
} from "@/lib/fusarium-operator-login"

export function FusariumExploreCta() {
  const [href, setHref] = useState(FUSARIUM_PUBLIC_LOGIN_HREF)

  useEffect(() => {
    setHref(getFusariumLoginHref(window.location.hostname))
  }, [])

  return (
    <a href={href} data-analytics="fusarium_hero_explore_click">
      <NeuButton variant="primary" className="text-base px-6 py-3 min-h-[44px]">
        Explore the Platform
        <ArrowRight className="ml-2 h-5 w-5 text-current" />
      </NeuButton>
    </a>
  )
}
