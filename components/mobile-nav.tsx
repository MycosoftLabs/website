// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import Link from "next/link"
// useRouter removed; all navigation uses <Link> directly
import { Search, Cloud, Bot, AppWindowIcon as Apps, X, Menu, User2, Shield, Cpu, ChevronDown, Lock, Target, FileText, Map, Network, Database, Globe, Microscope, FlaskConical, Compass, TreeDeciduous, BarChart3, Bug, AlertTriangle, Radio, Box, Antenna, Wind, Waves, Plane, Users, Key } from "lucide-react"
import { AI_NAV_ITEMS } from "@/lib/nav-ai"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Chat } from "@/components/chat/chat"
import { ModeToggle } from "@/components/mode-toggle"
import { useAuth } from "@/contexts/auth-context"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { useGateAccess } from "@/components/access/gate-wrapper"
import { AccessGate } from "@/lib/access/types"

// Navigation items configuration (same as header.tsx)
const defenseItems = [
  { title: "Fusarium", href: "/defense/fusarium", icon: Bug },
  { title: "OEI Capabilities", href: "/defense/oei", icon: Target },
  { title: "Technical Documentation", href: "/defense/technical-docs", icon: FileText },
]

const natureOSItems = [
  { title: "Earth Simulator", href: "/natureos/earth-simulator", icon: Globe },
  { title: "Fungi Compute", href: "/natureos/fungi-compute", icon: Cpu },
  { title: "Virtual Petri Dish", href: "/natureos/virtual-petri-dish", icon: FlaskConical },
  { title: "Ancestry Database", href: "/natureos/ancestry", icon: TreeDeciduous },
  { title: "Device Network", href: "/natureos/devices", icon: Network },
  { title: "MINDEX", href: "/mindex", icon: Database, companyOnly: true },
]

const devicesItems = [
  { title: "Mushroom 1", href: "/devices/mushroom-1", icon: Antenna },
  { title: "SporeBase", href: "/devices/sporebase", icon: Wind },
  { title: "Hyphae 1", href: "/devices/hyphae-1", icon: Box },
  { title: "MycoNode", href: "/devices/myconode", icon: Radio },
  { title: "ALARM", href: "/devices/alarm", icon: AlertTriangle },
  { title: "Psathyrella", href: "/devices/psathyrella", icon: Waves },
  { title: "Agaric", href: "/devices/agaric", icon: Plane },
]

const appsItems = [
  { title: "Petri Dish Simulator", href: "/natureos/virtual-petri-dish", icon: FlaskConical },
  { title: "Mushroom Simulator", href: "/apps/mushroom-sim", icon: Microscope, companyOnly: true },
  { title: "Compound Analyzer", href: "/apps/compound-sim", icon: FlaskConical },
  { title: "Spore Tracker", href: "/apps/spore-tracker", icon: Compass, companyOnly: true },
  { title: "Ancestry Database", href: "/ancestry", icon: TreeDeciduous },
  { title: "Growth Analytics", href: "/apps/growth-analytics", icon: BarChart3, companyOnly: true },
]

interface ExpandableSectionProps {
  title: string
  href: string // Main section link
  icon: React.ElementType
  items: { title: string; href: string; icon: React.ElementType; companyOnly?: boolean }[]
  closeMenu: () => void
  isOpen: boolean
  onToggle: () => void
}

function ExpandableSection({ title, href, icon: Icon, items, closeMenu, isOpen, onToggle }: ExpandableSectionProps) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between py-1">
        {/* Main section link - tapping navigates to the section page */}
        <Link
          href={href}
          prefetch={false}
          onClick={closeMenu}
          className="flex items-center gap-2 text-lg font-medium hover:text-primary transition-colors flex-1"
        >
          <Icon className="h-5 w-5" />
          {title}
        </Link>
        {/* Expand/collapse button - separate from the link */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggle()
          }}
          className="mobile-nav-glass-button p-2 rounded-md transition-colors"
          aria-label={isOpen ? `Collapse ${title} submenu` : `Expand ${title} submenu`}
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </button>
      </div>
      {isOpen && (
          <div className="overflow-hidden">
            <div className="pl-7 pt-2 flex flex-col gap-2">
              {items.map((item) => {
                const ItemIcon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onClick={closeMenu}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    <ItemIcon className="h-4 w-4" />
                    <span className="text-sm">{item.title}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
    </div>
  )
}

export function MobileNav() {
  const { resolvedTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { user, signOut } = useAuth()
  const { hasAccess: isCompanyUser } = useGateAccess(AccessGate.COMPANY)
  
  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  // Prevent hydration mismatch by only rendering theme-dependent content after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => {
    setIsOpen(false)
    setExpandedSections({})
  }
  const closeMenuAfterNavigation = (event?: React.MouseEvent<HTMLAnchorElement>) => {
    const href = event?.currentTarget?.getAttribute("href")
    const isPlainClick = event && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
    if (href && isPlainClick && href.startsWith("/") && !href.startsWith("//")) {
      event.preventDefault()
      window.location.assign(href)
      return
    }
    closeMenu()
  }
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const mobileMenuContent = (
    <>
      {isOpen && (
        <>
          {/* Backdrop overlay - covers entire screen */}
          <div
            className="mobile-nav-glass-backdrop fixed inset-0 z-[99998] h-[100dvh]"
            onClick={closeMenu}
            aria-hidden="true"
          />
          {/* Mobile nav drawer */}
          <div
            className="mobile-nav-glass-drawer fixed inset-y-0 right-0 z-[99999] h-[100dvh] max-h-[100dvh] w-[min(20rem,calc(100vw-1rem))] overflow-y-auto"
          >
            <div className="container flex h-14 items-center justify-between">
              <Link href="/" prefetch={false} className="flex items-center gap-2 font-semibold" onClick={closeMenuAfterNavigation}>
                <div className="relative h-8 w-8">
                  <Image
                    src={
                      mounted && (resolvedTheme ?? "dark") === "dark"
                        ? "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Mycosoft%20Logo%20(1)-lArPx4fwtqahyHVlnRLWWSfqWLIJpv.png"
                        : "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/MycosoftLogo2%20(1)-5jx3SObDwKV9c6QmbxJ2NWopjhfLmZ.png"
                    }
                    alt="Mycosoft Logo"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              </Link>
              <Button variant="ghost" size="icon" className="mobile-nav-glass-button" onClick={closeMenu}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="container flex flex-col gap-4 pt-6 pl-4 pb-8">
              <div className="flex flex-col gap-3">
                {/* Search - Next.js Link handles hash navigation + prefetch */}
                <Link
                  href="/search"
                  prefetch={false}
                  className="flex items-center gap-2 text-lg font-medium py-1 cursor-pointer"
                  onClick={closeMenuAfterNavigation}
                >
                  <Search className="h-5 w-5" />
                  Search
                </Link>
                
                {/* About Us - Direct Link */}
                <Link href="/about" prefetch={false} className="flex items-center gap-2 text-lg font-medium py-1" onClick={closeMenuAfterNavigation}>
                  <Users className="h-5 w-5" />
                  About Us
                </Link>

                {/* Agent Access - MYCA/AVANI live worldstate $1/min */}
                <Link href="/agent" prefetch={false} className="flex items-center gap-2 text-lg font-medium py-1 min-h-[44px] items-center" onClick={closeMenuAfterNavigation}>
                  <Key className="h-5 w-5" />
                  Agent Access
                </Link>

                {/* AI - Expandable (Overview, MYCA, AVANI, NLM) */}
                <ExpandableSection
                  title="AI"
                  href="/ai"
                  icon={Bot}
                  items={AI_NAV_ITEMS.map(({ title, href, icon }) => ({ title, href, icon }))}
                  closeMenu={closeMenuAfterNavigation}
                  isOpen={expandedSections.ai || false}
                  onToggle={() => toggleSection("ai")}
                />

                {/* Defense - Expandable */}
                <ExpandableSection
                  title="Defense"
                  href="/defense"
                  icon={Shield}
                  items={defenseItems}
                  closeMenu={closeMenuAfterNavigation}
                  isOpen={expandedSections.defense || false}
                  onToggle={() => toggleSection("defense")}
                />
                
                {/* NatureOS - Expandable */}
                <ExpandableSection
                  title="NatureOS"
                  href="/natureos"
                  icon={Cloud}
                  items={natureOSItems.filter(item => !item.companyOnly || isCompanyUser)}
                  closeMenu={closeMenuAfterNavigation}
                  isOpen={expandedSections.natureos || false}
                  onToggle={() => toggleSection("natureos")}
                />
                
                {/* Devices - Expandable */}
                <ExpandableSection
                  title="Devices"
                  href="/devices"
                  icon={Cpu}
                  items={devicesItems}
                  closeMenu={closeMenuAfterNavigation}
                  isOpen={expandedSections.devices || false}
                  onToggle={() => toggleSection("devices")}
                />
                
                {/* Apps - Expandable */}
                <ExpandableSection
                  title="Apps"
                  href="/apps"
                  icon={Apps}
                  items={appsItems.filter(item => !item.companyOnly || isCompanyUser)}
                  closeMenu={closeMenuAfterNavigation}
                  isOpen={expandedSections.apps || false}
                  onToggle={() => toggleSection("apps")}
                />
                
                {/* Security - Direct Link (only for logged in users) */}
                {user && (
                  <Link href="/security" prefetch={false} className="flex items-center gap-2 text-lg font-medium py-1" onClick={closeMenuAfterNavigation}>
                    <Lock className="h-5 w-5" />
                    Security
                  </Link>
                )}
              </div>

              <div className="flex flex-col gap-4 mt-4 border-t pt-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start" onClick={closeMenu}>
                      <Bot className="h-5 w-5 mr-2" />
                      Myca AI Assistant
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl h-[80vh]">
                    <Chat />
                  </DialogContent>
                </Dialog>

                <div className="flex items-center justify-between">
                  <ModeToggle />
                  {user ? (
                    <Button variant="outline" onClick={signOut}>
                      Sign Out
                    </Button>
                  ) : (
                    <Button variant="default" asChild>
                      <Link href="/login" prefetch={false} onClick={closeMenuAfterNavigation}>
                        <User2 className="h-4 w-4 mr-2" />
                        Sign In
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )

  return (
    <>
      <Button variant="ghost" size="icon" className="mobile-hamburger-glass md:hidden" onClick={toggleMenu} aria-label="Menu">
        <Menu className="h-5 w-5" />
      </Button>
      {mounted ? createPortal(mobileMenuContent, document.body) : null}
    </>
  )
}
