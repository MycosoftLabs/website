/**
 * Shared public SI navigation configuration.
 * Single source of truth for header, mobile nav, footer, and sitemap.
 */

import { Database, Shield } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { productMarkIcon } from "@/components/brand/product-icon"

export interface NavAIItem {
  title: string
  href: string
  icon: LucideIcon | ReturnType<typeof productMarkIcon>
  description: string
}

/** Product marks: Lucide-contract SVG (`current`) — same h-4 w-4 square + currentColor as AVANI/MINDEX. */
export const AI_NAV_ITEMS: NavAIItem[] = [
  { title: "Super Intelligence", href: "/si", icon: productMarkIcon("myca"), description: "Layered superintelligence ecosystem" },
  { title: "MYCA", href: "/myca", icon: productMarkIcon("myca"), description: "Agentic operating intelligence" },
  { title: "AVANI", href: "/ai/avani", icon: Shield, description: "Governance and stewardship layer" },
  { title: "Nature Learning Model", href: "/myca/nlm", icon: productMarkIcon("nlm"), description: "Ecological intelligence foundation" },
  { title: "FormSpace", href: "/ai/formspace", icon: productMarkIcon("formspace"), description: "Environmental Platonic Map" },
  { title: "MINDEX", href: "/mindex", icon: Database, description: "All-species living-world database" },
]

export const AI_MAIN_HREF = "/si"
