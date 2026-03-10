/**
 * Shared public AI navigation configuration.
 * Single source of truth for header, mobile nav, footer, and sitemap.
 * Updated: March 9, 2026 — Public AI Rollout
 */

import { Bot, Brain, Shield, Sparkles } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface NavAIItem {
  title: string
  href: string
  icon: LucideIcon
  description: string
}

export const AI_NAV_ITEMS: NavAIItem[] = [
  { title: "AI Overview", href: "/ai", icon: Bot, description: "Paired intelligence system" },
  { title: "MYCA", href: "/myca", icon: Sparkles, description: "Active operating intelligence" },
  { title: "AVANI", href: "/ai/avani", icon: Shield, description: "Governance and stewardship layer" },
  { title: "Nature Learning Model", href: "/myca/nlm", icon: Brain, description: "Ecological intelligence foundation" },
]

export const AI_MAIN_HREF = "/ai"
