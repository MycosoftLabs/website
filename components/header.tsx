"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { Search, Cloud, AppWindowIcon as Apps, User2, Cpu, Lock, Loader2, ChevronDown, Target, FileText, Map, Network, Database, Globe, Microscope, FlaskConical, Compass, TreeDeciduous, BarChart3, Bug, AlertTriangle, Radio, Box, Antenna, Wind, Waves, Plane, Bot, Users } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
// Dialog removed - MYCA bot icon removed from header
import Image from "next/image"
import { useTheme } from "next-themes"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSupabaseUser } from "@/hooks/use-supabase-user"
import { useRouter, usePathname } from "next/navigation"
import { MobileNav } from "@/components/mobile-nav"
import { useEffect, useState, useRef, useCallback, useMemo, type MouseEvent } from "react"
import { cn } from "@/lib/utils"
import { AI_NAV_ITEMS } from "@/lib/nav-ai"
import { PUBLIC_TOOL_HREFS } from "@/lib/nav-public-tools"
import { useGateAccess } from "@/components/access/gate-wrapper"
import { AccessGate } from "@/lib/access/types"

// Import motion only what we need (tree-shaken by bundler)
import { motion } from "framer-motion"

// Navigation dropdown items configuration
const defenseItems = [
  { title: "Fusarium", href: "/defense/fusarium", icon: Bug, description: "Operational Environment Platform" },
  { title: "OEI Capabilities", href: "/defense/oei", icon: Target, description: "Doctrine Capabilities" },
  { title: "Technical Documentation", href: "/defense/technical-docs", icon: FileText, description: "Defense systems documentation" },
]

// Apr 23, 2026 (Morgan): NatureOS top-nav dropdown slimmed to the
// four most-used public tools — Earth Simulator (CREP), Fungi Compute,
// Petri Dish Simulator, Ancestry Database. MINDEX / Device Network /
// Species Explorer moved to the full sidebar on /natureos routes.
type NavItem = {
  title: string
  href: string
  icon: React.ElementType
  description: string
  companyOnly?: boolean
}
const natureOSItems: NavItem[] = [
  { title: "Earth Simulator", href: "/natureos/earth-simulator", icon: Globe, description: "Live planetary intelligence — the CREP globe" },
  { title: "Fungi Compute", href: "/natureos/fungi-compute", icon: Cpu, description: "Mycelial neural networks & bio-compute" },
  { title: "Virtual Petri Dish", href: "/natureos/virtual-petri-dish", icon: FlaskConical, description: "Virtual culture growth simulation" },
  { title: "Ancestry Database", href: "/natureos/ancestry", icon: TreeDeciduous, description: "Fungal genealogy & genomics explorer" },
]

const devicesItems = [
  { title: "Mushroom 1", href: "/devices/mushroom-1", icon: Antenna, description: "Walking Ground Droid" },
  { title: "SporeBase", href: "/devices/sporebase", icon: Wind, description: "Breathing Aerosol Collector" },
  { title: "Hyphae 1", href: "/devices/hyphae-1", icon: Box, description: "Modular Data Center" },
  { title: "MycoNode", href: "/devices/myconode", icon: Radio, description: "Mesh Network Probe" },
  { title: "ALARM", href: "/devices/alarm", icon: AlertTriangle, description: "Biological Home Alarm" },
  { title: "Psathyrella", href: "/devices/psathyrella", icon: Waves, description: "Swimming Sensor Buoy" },
  { title: "Agaric", href: "/devices/agaric", icon: Plane, description: "Flying Myco Drone" },
]

const appsItems = [
  { title: "Petri Dish Simulator", href: PUBLIC_TOOL_HREFS.petriDish, icon: FlaskConical, description: "Virtual culture growth simulation" },
  { title: "Mushroom Simulator", href: PUBLIC_TOOL_HREFS.mushroomSim, icon: Microscope, description: "3D fungal growth modeling", companyOnly: true },
  { title: "Compound Analyzer", href: PUBLIC_TOOL_HREFS.compoundSim, icon: FlaskConical, description: "Chemical compound analysis" },
  { title: "Spore Tracker", href: PUBLIC_TOOL_HREFS.sporeTracker, icon: Compass, description: "Spore dispersal mapping", companyOnly: true },
  { title: "Ancestry Database", href: "/natureos/ancestry", icon: TreeDeciduous, description: "Fungal genealogy explorer" },
  { title: "Genomics Tools", href: "/natureos/ancestry/tools#genomics", icon: Microscope, description: "Genome browsers & visualization" },
  { title: "Growth Analytics", href: PUBLIC_TOOL_HREFS.growthAnalytics, icon: BarChart3, description: "Performance metrics & insights", companyOnly: true },
]

// Individual dropdown component with animations
interface NavDropdownProps {
  label: string
  icon: React.ElementType
  items: { title: string; href: string; icon: React.ElementType; description: string; companyOnly?: boolean }[]
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  accentColor?: string
  globalTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
}

function NavDropdown({ label, icon: Icon, items, isOpen, onOpen, onClose, accentColor = "blue", mainHref, globalTimeoutRef }: NavDropdownProps & { mainHref?: string }) {
  /** Hub row when sections use mainHref but items omit it (e.g. NatureOS → /natureos). AI already lists /ai first — skip duplicate. */
  const displayItems = useMemo(() => {
    if (!mainHref) return items
    if (items.some((i) => i.href === mainHref)) return items
    return [
      {
        title: `${label} overview`,
        href: mainHref,
        icon: Icon,
        description: `Hub — all ${label} pages`,
      },
      ...items,
    ]
  }, [items, mainHref, label, Icon])

  const pathname = usePathname()
  useEffect(() => {
    if (isOpen) onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const handleMouseEnter = useCallback(() => {
    // Clear any pending close timeout when entering any dropdown trigger
    if (globalTimeoutRef.current) {
      clearTimeout(globalTimeoutRef.current)
      globalTimeoutRef.current = null
    }
    onOpen()
  }, [onOpen, globalTimeoutRef])

  const handleMouseLeave = useCallback(() => {
    // Delay before closing to allow moving to dropdown content or another menu item
    globalTimeoutRef.current = setTimeout(() => {
      onClose()
    }, 200)
  }, [onClose, globalTimeoutRef])

  const handleDropdownMouseEnter = useCallback(() => {
    // Clear timeout when entering the dropdown content
    if (globalTimeoutRef.current) {
      clearTimeout(globalTimeoutRef.current)
      globalTimeoutRef.current = null
    }
  }, [globalTimeoutRef])

  const handleDropdownMouseLeave = useCallback(() => {
    globalTimeoutRef.current = setTimeout(() => {
      onClose()
    }, 180)
  }, [onClose, globalTimeoutRef])

  /** Click / tap toggles menu (hover alone lagged under load; <a href> triggers navigated instead of opening). */
  const handleTriggerClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      if (globalTimeoutRef.current) {
        clearTimeout(globalTimeoutRef.current)
        globalTimeoutRef.current = null
      }
      if (isOpen) onClose()
      else onOpen()
    },
    [isOpen, onOpen, onClose, globalTimeoutRef],
  )

  const colorVariants: Record<string, string> = {
    blue: "from-blue-500/20 to-cyan-500/20 border-blue-500/40",
    green: "from-emerald-500/20 to-green-500/20 border-emerald-500/40",
    purple: "from-purple-500/20 to-fuchsia-500/20 border-purple-500/40",
    orange: "from-orange-500/20 to-amber-500/20 border-orange-500/40",
  }

  const glowVariants: Record<string, string> = {
    blue: "shadow-blue-500/20",
    green: "shadow-emerald-500/20",
    purple: "shadow-purple-500/20",
    orange: "shadow-orange-500/20",
  }

  const iconColorVariants: Record<string, string> = {
    blue: "text-blue-400 group-hover:text-blue-300",
    green: "text-emerald-400 group-hover:text-emerald-300",
    purple: "text-purple-400 group-hover:text-purple-300",
    orange: "text-orange-400 group-hover:text-orange-300",
  }

  const buttonActiveColor: Record<string, string> = {
    blue: "bg-blue-500/10 border-blue-500/30",
    green: "bg-emerald-500/10 border-emerald-500/30",
    purple: "bg-purple-500/10 border-purple-500/30",
    orange: "bg-orange-500/10 border-orange-500/30",
  }

  const buttonClasses = cn(
    "group flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ease-out",
    "hover:bg-white/5 border border-transparent touch-manipulation",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    isOpen && buttonActiveColor[accentColor],
  )

  const buttonContent = (
    <>
      <Icon className={cn(
        "h-4 w-4 transition-all duration-300 ease-out",
        isOpen ? iconColorVariants[accentColor].split(" ")[0] : "text-muted-foreground group-hover:text-foreground"
      )} />
      <span className="transition-colors duration-300">{label}</span>
      <ChevronDown
        className={cn(
          "h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-150 ease-out",
          isOpen && "rotate-180 text-foreground",
        )}
        aria-hidden
      />
    </>
  )

  return (
    <div
      className="group relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      suppressHydrationWarning
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`${label} menu`}
        onClick={handleTriggerClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={buttonClasses}
        suppressHydrationWarning
      >
        {buttonContent}
      </button>

      <div
        className={cn(
          "absolute top-full left-0 z-[60] h-3 w-full bg-transparent",
          "invisible pointer-events-none group-hover:visible group-hover:pointer-events-auto group-focus-within:visible group-focus-within:pointer-events-auto",
          isOpen && "visible pointer-events-auto",
        )}
        onMouseEnter={handleDropdownMouseEnter}
        aria-hidden
      />
      <div
        onMouseEnter={handleDropdownMouseEnter}
        onMouseLeave={handleDropdownMouseLeave}
        className={cn(
          "absolute top-full left-0 mt-2 w-80 rounded-xl overflow-hidden z-[60]",
          "bg-background/95 backdrop-blur-xl border shadow-2xl transition-all duration-150 ease-out -translate-y-1",
          "invisible opacity-0 pointer-events-none group-hover:visible group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0",
          "group-focus-within:visible group-focus-within:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0",
          isOpen && "visible opacity-100 pointer-events-auto translate-y-0",
          colorVariants[accentColor],
          glowVariants[accentColor],
        )}
      >
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-30",
                  colorVariants[accentColor],
                )}
              />
              <div
                className={cn(
                  "pointer-events-none absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r",
                  accentColor === "blue" && "from-blue-500 via-cyan-400 to-blue-500",
                  accentColor === "green" && "from-emerald-500 via-green-400 to-emerald-500",
                  accentColor === "purple" && "from-purple-500 via-fuchsia-400 to-purple-500",
                  accentColor === "orange" && "from-orange-500 via-amber-400 to-orange-500",
                )}
              />

              <div className="relative p-2">
                {displayItems.map((item) => {
                  const ItemIcon = item.icon
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "group/item flex items-start gap-3 p-3 rounded-lg transition-colors duration-150",
                        "hover:bg-white/10 relative",
                      )}
                    >
                      <div
                        className={cn(
                          "relative shrink-0 rounded-lg border border-white/10 bg-white/5 p-2.5 transition-colors duration-150",
                          "group-hover/item:bg-white/10 group-hover/item:border-white/20",
                        )}
                      >
                        <ItemIcon className={cn("h-4 w-4", iconColorVariants[accentColor])} />
                      </div>
                      <div className="relative min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <svg
                        className="relative mt-1 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/item:opacity-100"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  )
                })}
              </div>
      </div>
    </div>
  )
}

export function Header() {
  const { resolvedTheme } = useTheme()
  const { user: supabaseUser, loading: isLoading, signOut } = useSupabaseUser()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const navRef = useRef<HTMLElement>(null)
  const globalDropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { hasAccess: isCompanyUser } = useGateAccess(AccessGate.COMPANY)

  // Filter lists based on authorization
  const visibleNatureOSItems = natureOSItems.filter(item => !item.companyOnly || isCompanyUser)
  const visibleAppsItems = appsItems.filter(item => !item.companyOnly || isCompanyUser)

  // Transform supabase user to the expected format
  const user = supabaseUser ? {
    id: supabaseUser.id,
    name: supabaseUser.user_metadata?.full_name ||
          supabaseUser.user_metadata?.name ||
          supabaseUser.email?.split("@")[0] ||
          "User",
    email: supabaseUser.email ?? null,
    avatar: supabaseUser.user_metadata?.avatar_url ||
            supabaseUser.user_metadata?.picture ||
            "/placeholder.svg",
  } : null

  // Prevent hydration mismatch by only rendering theme-dependent content after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Close dropdown when clicking outside. Use `click` instead of `mousedown`
  // so page navigation is not pre-empted on the first press.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  // Use default logo during SSR to prevent hydration mismatch
  const logoSrc = mounted && (resolvedTheme ?? "dark") === "dark"
    ? "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Mycosoft%20Logo%20(1)-lArPx4fwtqahyHVlnRLWWSfqWLIJpv.png"
    : "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/MycosoftLogo2%20(1)-5jx3SObDwKV9c6QmbxJ2NWopjhfLmZ.png"

  return (
    <header className="bg-background/80 backdrop-blur-xl sticky top-0 z-[200] shadow-none" suppressHydrationWarning>
      {/* h-12 on mobile (saves 8px), h-14 on desktop */}
      <div className="container max-w-7xl mx-auto flex h-12 md:h-14 items-center justify-between px-3 md:px-4">
        <div className="flex items-center gap-1.5 md:gap-2 font-semibold">
          <Link href="/" className="flex items-center gap-1.5 md:gap-2 font-semibold group">
            <motion.div
              className="relative h-7 w-7 pointer-events-none md:h-8 md:w-8"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Image
                src={logoSrc}
                alt="Mycosoft Logo"
                fill
                className="pointer-events-none object-contain"
                priority
              />
            </motion.div>
            {/* Hide brand name on small mobile to save space */}
            <span className="hidden sm:inline transition-colors duration-300 group-hover:text-primary">Mycosoft</span>
          </Link>
        </div>

        {/* Desktop Navigation with Individual Dropdowns */}
        <nav ref={navRef} className="hidden md:flex items-center gap-1">
          {/* Search - plain <a> for single-click hard nav (avoids Next.js App Router dev-mode RSC abort) */}
          <a
            href="/search"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/5 hover:scale-[1.02] active:scale-[0.98] group cursor-pointer"
            onMouseEnter={() => setOpenDropdown(null)}
          >
            <Search className="h-4 w-4 text-muted-foreground group-hover:text-blue-400 transition-colors duration-300" />
            <span>Search</span>
          </a>

          {/* About Us - plain <a> for single-click hard nav */}
          <a
            href="/about"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/5 hover:scale-[1.02] active:scale-[0.98] group"
            onMouseEnter={() => setOpenDropdown(null)}
          >
            <Users className="h-4 w-4 text-muted-foreground group-hover:text-green-400 transition-colors duration-300" />
            <span>About Us</span>
          </a>

          {/* AI Dropdown — public IA: Overview, MYCA, AVANI, NLM, Agent Access */}
          <NavDropdown
            label="AI"
            icon={Bot}
            items={AI_NAV_ITEMS}
            isOpen={openDropdown === "ai"}
            onOpen={() => setOpenDropdown("ai")}
            onClose={() => setOpenDropdown(null)}
            accentColor="orange"
            mainHref="/ai"
            globalTimeoutRef={globalDropdownTimeoutRef}
          />

          {/* Defense Dropdown */}
          <NavDropdown
            label="Defense"
            icon={Bug}
            items={defenseItems}
            isOpen={openDropdown === "defense"}
            onOpen={() => setOpenDropdown("defense")}
            onClose={() => setOpenDropdown(null)}
            accentColor="green"
            mainHref="/defense"
            globalTimeoutRef={globalDropdownTimeoutRef}
          />

          {/* NatureOS Dropdown */}
          <NavDropdown
            label="NatureOS"
            icon={Cloud}
            items={visibleNatureOSItems}
            isOpen={openDropdown === "natureos"}
            onOpen={() => setOpenDropdown("natureos")}
            onClose={() => setOpenDropdown(null)}
            accentColor="blue"
            mainHref="/natureos"
            globalTimeoutRef={globalDropdownTimeoutRef}
          />

          {/* Devices Dropdown */}
          <NavDropdown
            label="Devices"
            icon={Cpu}
            items={devicesItems}
            isOpen={openDropdown === "devices"}
            onOpen={() => setOpenDropdown("devices")}
            onClose={() => setOpenDropdown(null)}
            accentColor="purple"
            mainHref="/devices"
            globalTimeoutRef={globalDropdownTimeoutRef}
          />

          {/* Apps Dropdown */}
          <NavDropdown
            label="Apps"
            icon={Apps}
            items={visibleAppsItems}
            isOpen={openDropdown === "apps"}
            onOpen={() => setOpenDropdown("apps")}
            onClose={() => setOpenDropdown(null)}
            accentColor="orange"
            mainHref={user ? "/apps" : "/natureos"}
            globalTimeoutRef={globalDropdownTimeoutRef}
          />

          {/* Security - plain <a> for single-click hard nav */}
          {user && (
            <a
              href="/security"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/5 hover:scale-[1.02] active:scale-[0.98] group"
              onMouseEnter={() => setOpenDropdown(null)}
            >
              <Lock className="h-4 w-4 text-muted-foreground group-hover:text-red-400 transition-colors duration-300" />
              <span>Security</span>
            </a>
          )}
        </nav>

        {/* Right side controls - visible on all screen sizes */}
        <div className="flex items-center gap-2">
          <ModeToggle />

          {isLoading ? (
            <Button variant="ghost" size="sm" disabled className="hidden md:flex">
              <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-white/5 transition-all duration-300">
                  <Avatar className="h-6 w-6 ring-2 ring-transparent hover:ring-primary/50 transition-all duration-300">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline-block">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border bg-background">
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/security">Security Center</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex">
              <Button variant="default" size="sm" className="nav-signin-glass mr-2 transition-all duration-300 hover:scale-105" asChild>
                <Link href="/login">
                  <User2 className="h-4 w-4 mr-2" />
                  Sign In
                </Link>
              </Button>
            </div>
          )}
          {/* Mobile Navigation */}
          <div className="md:hidden">
            <MobileNav />
          </div>
        </div>
      </div>
    </header>
  )
}
