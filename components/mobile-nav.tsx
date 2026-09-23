// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import Link from "next/link"
// useRouter removed; all navigation uses <Link> directly
import { Search, X, Menu, User2, Cpu, ChevronDown, Lock, Target, FileText, Network, Database, FlaskConical, TreeDeciduous, Users, Key, Rocket, Wrench } from "lucide-react"
import { AI_NAV_ITEMS } from "@/lib/nav-ai"
import { productMarkIcon } from "@/components/brand/product-icon"
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
  { title: "FUSARIUM", href: "/defense/fusarium", icon: productMarkIcon("fusarium") },
  { title: "Launchpad", href: "/fusarium/launchpad", icon: Rocket },
  { title: "OEI Capabilities", href: "/defense/oei", icon: Target },
  { title: "Technical Documentation", href: "/defense/technical-docs", icon: FileText },
]

const natureOSItems = [
  { title: "NatureOS", href: "/natureos", icon: productMarkIcon("natureos") },
  { title: "Earth Simulator", href: "/natureos/earth-simulator", icon: productMarkIcon("earth-simulator") },
  { title: "Fungi Compute", href: "/natureos/fungi-compute", icon: Cpu },
  { title: "Virtual Petri Dish", href: "/natureos/virtual-petri-dish", icon: FlaskConical },
  { title: "Ancestry Database", href: "/natureos/ancestry", icon: TreeDeciduous },
  { title: "Tools Hub", href: "/natureos/tools", icon: Wrench },
  { title: "Device Network", href: "/natureos/devices", icon: Network },
  { title: "MINDEX", href: "/mindex", icon: Database, companyOnly: true },
]

// Droids first (href /devices) — match desktop Droids dropdown; do not change route
const devicesItems = [
  { title: "Droids", href: "/devices", icon: Cpu },
  { title: "MycoBrain", href: "/devices/mycobrain", icon: productMarkIcon("mycobrain") },
  { title: "Mushroom 1", href: "/devices/mushroom-1", icon: productMarkIcon("mushroom-1") },
  { title: "SporeBase", href: "/devices/sporebase", icon: productMarkIcon("sporebase") },
  { title: "Hyphae 1", href: "/devices/hyphae-1", icon: productMarkIcon("hyphae-1") },
  { title: "MycoNode", href: "/devices/myconode", icon: productMarkIcon("myconode") },
  { title: "ALARM", href: "/devices/alarm", icon: productMarkIcon("alarm") },
  { title: "Psathyrella", href: "/devices/psathyrella", icon: productMarkIcon("psathyrella") },
  { title: "Agaric", href: "/devices/agaric", icon: productMarkIcon("agaric") },
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
          <span className="relative inline-flex size-5 shrink-0 items-center justify-center overflow-hidden" aria-hidden>
            <Icon className="absolute inset-0 size-full" />
          </span>
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
                    <span className="relative inline-flex size-4 shrink-0 items-center justify-center overflow-hidden" aria-hidden>
                      <ItemIcon className="absolute inset-0 size-full" />
                    </span>
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
  // EVINT first (href /defense) — match desktop Defense dropdown; do not change route
  const visibleDefenseItems = [
    { title: "EVINT", href: "/defense", icon: productMarkIcon("fusarium") },
    defenseItems[0],
    user
      ? { title: "Launchpad workspace", href: "/app/launchpad/dashboard", icon: Rocket }
      : { title: "Launchpad", href: "/fusarium/launchpad", icon: Rocket },
    ...defenseItems.slice(2),
  ]
  
  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  // Prevent hydration mismatch by only rendering theme-dependent content after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  const openMenu = (event?: any) => {
    event?.preventDefault()
    event?.stopPropagation()
    setIsOpen(true)
  }
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
            id="mobile-nav-menu"
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

                {/* SI - Expandable — MYCA mark */}
                <ExpandableSection
                  title="SI"
                  href="/si"
                  icon={productMarkIcon("myca")}
                  items={AI_NAV_ITEMS.map(({ title, href, icon }) => ({ title, href, icon }))}
                  closeMenu={closeMenuAfterNavigation}
                  isOpen={expandedSections.ai || false}
                  onToggle={() => toggleSection("ai")}
                />

                {/* Defense - Expandable — Fusarium mark */}
                <ExpandableSection
                  title="Defense"
                  href="/defense"
                  icon={productMarkIcon("fusarium")}
                  items={visibleDefenseItems}
                  closeMenu={closeMenuAfterNavigation}
                  isOpen={expandedSections.defense || false}
                  onToggle={() => toggleSection("defense")}
                />
                
                {/* NatureOS - Expandable */}
                <ExpandableSection
                  title="NatureOS"
                  href="/natureos"
                  icon={productMarkIcon("natureos")}
                  items={natureOSItems.filter(item => !item.companyOnly || isCompanyUser)}
                  closeMenu={closeMenuAfterNavigation}
                  isOpen={expandedSections.natureos || false}
                  onToggle={() => toggleSection("natureos")}
                />
                
                {/* Droids - Expandable (routes stay under /devices*) */}
                <ExpandableSection
                  title="Droids"
                  href="/devices"
                  icon={Cpu}
                  items={devicesItems}
                  closeMenu={closeMenuAfterNavigation}
                  isOpen={expandedSections.devices || false}
                  onToggle={() => toggleSection("devices")}
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
                      {(() => {
                        const MycaMark = productMarkIcon("myca")
                        return (
                          <span className="relative mr-2 inline-flex size-5 shrink-0 overflow-hidden" aria-hidden>
                            <MycaMark className="absolute inset-0 size-full" />
                          </span>
                        )
                      })()}
                      Myca SI Assistant
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
      <Button
        variant="ghost"
        size="icon"
        type="button"
        className="mobile-hamburger-glass md:hidden"
        onClick={openMenu}
        aria-expanded={isOpen}
        aria-controls="mobile-nav-menu"
        aria-label="Menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      {mounted ? createPortal(mobileMenuContent, document.body) : null}
    </>
  )
}
