"use client"

/**
 * FUSARIUM sidebar navigation.
 *
 * Two shapes, one component:
 *
 *   expanded  — the operator SPA's nav markup, as React: a .nav-section per
 *               group with a .section-toggle header and a .nav-items list.
 *   collapsed — an icon rail. Section headers drop away (a 56px column has no
 *               room for them), every item becomes its icon, and the title
 *               carries the label for hover and for assistive tech.
 *
 * The icon rail is not a second nav: same items, same order, same active state,
 * so nothing can drift between the two.
 */

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity, Bot, Boxes, Brain, Binary, Braces, Code, Cpu, Crosshair, Database,
  Droplets, Eye, FlaskConical, Gauge, Globe, Layers, Leaf, LineChart, Microscope,
  Network, PipetteIcon, Radar, Radio, Satellite, Settings, Shield, Terminal,
  Thermometer, Waves, Wind, Workflow, Wrench, Hand, Radiation, type LucideIcon,
} from "lucide-react"
import {
  FUSARIUM_SECTIONS,
  isActiveFusariumPath,
} from "@/components/fusarium/fusarium-catalog"

/** One icon per catalog id. Missing ids fall back to the section's own icon. */
const ICONS: Record<string, LucideIcon> = {
  overview: Gauge,
  "situational-awareness": Radar,
  "threat-assessment": Shield,
  "data-fusion": Layers,
  "command-control": Crosshair,

  "nature-statistics": Leaf,
  "fungi-compute": Brain,
  "earth-simulator": Globe,
  "virtual-petri-dish": PipetteIcon,
  "biology-simulator": Microscope,
  "compound-analyser": FlaskConical,
  aerosol: Droplets,
  ancestry: Database,
  "growth-analytics": LineChart,

  sensing: Radiation,
  gcs: Radio,
  bluesight: Eye,
  sine: Waves,
  fci: Brain,
  thermal: Thermometer,
  gandha: Wind,
  mechanical: Hand,

  "ai-studio": Bot,
  "nlm-training": Cpu,
  workflows: Workflow,
  mas: Network,
  avani: Shield,

  tools: Wrench,

  api: Code,
  functions: Binary,
  sdk: Braces,
  shell: Terminal,

  devices: Network,
  mycobrain: Cpu,
  sporebase: Droplets,
  crep: Satellite,
  mindex: Database,
  storage: Layers,
  containers: Boxes,
  monitoring: Activity,

  "partner-mesh": Network,
  adapters: Boxes,
  settings: Settings,
}

function iconFor(id: string): LucideIcon {
  return ICONS[id] ?? Layers
}

export function FusariumNav({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname() || "/fusarium"
  const [closed, setClosed] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    for (const section of FUSARIUM_SECTIONS) {
      if (!section.defaultOpen) initial.add(section.id)
    }
    return initial
  })

  const toggle = (id: string) =>
    setClosed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // Collapsed: one flat icon rail. Sections still separate the groups with a
  // rule so the grouping survives losing the headers.
  if (collapsed) {
    return (
      <div className="nav-rail">
        {FUSARIUM_SECTIONS.map((section) => (
          <div className="nav-rail-group" key={section.id}>
            {section.items.map((item) => {
              const Icon = iconFor(item.id)
              const active = isActiveFusariumPath(pathname, item.href)
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={active ? "active" : undefined}
                  aria-current={active ? "page" : undefined}
                  title={`${section.title} · ${item.title}`}
                >
                  <Icon aria-hidden="true" />
                  <span className="sr-only">{item.title}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      {FUSARIUM_SECTIONS.map((section) => {
        // A section holding the current page opens regardless of its stored
        // state — otherwise deep-linking lands you on a page whose own group is
        // collapsed and the sidebar looks like it lost the entry.
        const hasActive = section.items.some((item) => isActiveFusariumPath(pathname, item.href))
        const isCollapsed = closed.has(section.id) && !hasActive

        return (
          <div className={`nav-section${isCollapsed ? " collapsed" : ""}`} key={section.id}>
            <button
              type="button"
              className="section-toggle"
              aria-expanded={!isCollapsed}
              onClick={() => toggle(section.id)}
            >
              {section.title}
            </button>
            <div className="nav-items">
              {section.items.map((item) => {
                const Icon = iconFor(item.id)
                const active = isActiveFusariumPath(pathname, item.href)
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={active ? "active" : undefined}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="nav-icon" aria-hidden="true" />
                    {item.title}
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </>
  )
}
