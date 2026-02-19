"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { Search, Cloud, AppWindowIcon as Apps, User2, Cpu, Lock, Loader2, ChevronDown, Target, FileText, Map, Network, Database, Globe, Microscope, FlaskConical, Compass, TreeDeciduous, BarChart3, Bug, AlertTriangle, Radio, Box, Antenna, Wind, Bot, Users } from "lucide-react"
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
import { useRouter } from "next/navigation"
import { MobileNav } from "@/components/mobile-nav"
import { useEffect, useState, useRef, useCallback, memo } from "react"
import { cn } from "@/lib/utils"

// Chat component removed - MYCA bot icon removed from header

// Import motion only what we need (tree-shaken by bundler)
import { motion, AnimatePresence } from "framer-motion"

// Navigation dropdown items configuration
const defenseItems = [
  { title: "Fusarium", href: "/defense/fusarium", icon: Bug, description: "Fungal threat detection & monitoring" },
  { title: "OEI Capabilities", href: "/defense/oei", icon: Target, description: "Operational Environmental Intelligence" },
  { title: "Technical Documentation", href: "/defense/technical-docs", icon: FileText, description: "Defense systems documentation" },
]

const natureOSItems = [
  { title: "CREP Dashboard", href: "/dashboard/crep", icon: Map, description: "Common Relevant Environmental Picture" },
  { title: "Device Network", href: "/natureos/devices", icon: Network, description: "Connected device management" },
  { title: "MINDEX", href: "/mindex", icon: Database, description: "Cryptographic data integrity index" },
  { title: "Species Explorer", href: "/natureos/mindex/explorer", icon: Globe, description: "Spatial species visualization" },
  { title: "AI Explainer", href: "/natureos/ai-studio/explainer", icon: Bot, description: "Understand how MYCA AI works" },
  { title: "Earth Simulator", href: "/apps/earth-simulator", icon: Globe, description: "Global environmental modeling" },
]

const devicesItems = [
  { title: "Mushroom 1", href: "/devices/mushroom-1", icon: Antenna, description: "Ground-based fungal intelligence station" },
  { title: "SporeBase", href: "/devices/sporebase", icon: Wind, description: "Bioaerosol collection system" },
  { title: "Hyphae 1", href: "/devices/hyphae-1", icon: Box, description: "Modular I/O platform" },
  { title: "MycoNode", href: "/devices/myconode", icon: Radio, description: "Subsurface bioelectric probe" },
  { title: "ALARM", href: "/devices/alarm", icon: AlertTriangle, description: "Indoor environmental monitor" },
]

const appsItems = [
  { title: "Petri Dish Simulator", href: "/apps/petri-dish-sim", icon: FlaskConical, description: "Virtual culture growth simulation" },
  { title: "Mushroom Simulator", href: "/apps/mushroom-sim", icon: Microscope, description: "3D fungal growth modeling" },
  { title: "Compound Analyzer", href: "/apps/compound-sim", icon: FlaskConical, description: "Chemical compound analysis" },
  { title: "Spore Tracker", href: "/apps/spore-tracker", icon: Compass, description: "Spore dispersal mapping" },
  { title: "Ancestry Database", href: "/ancestry", icon: TreeDeciduous, description: "Fungal genealogy explorer" },
  { title: "Genomics Tools", href: "/ancestry/tools#genomics", icon: Microscope, description: "Genome browsers & visualization" },
  { title: "Growth Analytics", href: "/apps/growth-analytics", icon: BarChart3, description: "Performance metrics & insights" },
]

// Individual dropdown component with animations
interface NavDropdownProps {
  label: string
  icon: React.ElementType
  items: { title: string; href: string; icon: React.ElementType; description: string }[]
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  accentColor?: string
  globalTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
}

function NavDropdown({ label, icon: Icon, items, isOpen, onOpen, onClose, accentColor = "blue", mainHref, globalTimeoutRef }: NavDropdownProps & { mainHref?: string }) {
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
    // Small delay when leaving dropdown content too
    globalTimeoutRef.current = setTimeout(() => {
      onClose()
    }, 150)
  }, [onClose, globalTimeoutRef])
  
  // Main label click handler - navigate to main page
  const handleMainClick = useCallback(() => {
    if (mainHref) {
      onClose()
    }
  }, [mainHref, onClose])

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
    "group flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-out",
    "hover:bg-white/5 border border-transparent",
    "hover:scale-[1.02] active:scale-[0.98]",
    isOpen && buttonActiveColor[accentColor]
  )
  
  const buttonContent = (
    <>
      <Icon className={cn(
        "h-4 w-4 transition-all duration-300 ease-out",
        isOpen ? iconColorVariants[accentColor].split(" ")[0] : "text-muted-foreground group-hover:text-foreground"
      )} />
      <span className="transition-colors duration-300">{label}</span>
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <ChevronDown className={cn(
          "h-3 w-3 transition-all duration-300 text-muted-foreground",
          isOpen && "text-foreground"
        )} />
      </motion.div>
    </>
  )

  return (
    <div className="relative">
      {mainHref ? (
        <Link
          href={mainHref}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleMainClick}
          className={buttonClasses}
        >
          {buttonContent}
        </Link>
      ) : (
        <button
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={buttonClasses}
        >
          {buttonContent}
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Invisible bridge to prevent gap from breaking hover */}
            <div 
              className="absolute top-full left-0 w-full h-4 bg-transparent"
              onMouseEnter={handleDropdownMouseEnter}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ 
                duration: 0.2, 
                ease: [0.16, 1, 0.3, 1] // Custom spring-like easing
              }}
              onMouseEnter={handleDropdownMouseEnter}
              onMouseLeave={handleDropdownMouseLeave}
              className={cn(
                "absolute top-full left-0 mt-2 w-80 rounded-xl overflow-hidden z-[60]",
                "bg-background/95 backdrop-blur-xl",
                "border shadow-2xl",
                colorVariants[accentColor],
                glowVariants[accentColor]
              )}
            >
            {/* Animated gradient background */}
            <motion.div 
              className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-30 pointer-events-none",
                colorVariants[accentColor]
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
            />
            
            {/* Top accent line */}
            <motion.div 
              className={cn(
                "absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r",
                accentColor === "blue" && "from-blue-500 via-cyan-400 to-blue-500",
                accentColor === "green" && "from-emerald-500 via-green-400 to-emerald-500",
                accentColor === "purple" && "from-purple-500 via-fuchsia-400 to-purple-500",
                accentColor === "orange" && "from-orange-500 via-amber-400 to-orange-500"
              )}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              exit={{ scaleX: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
            
            <div className="relative p-2">
              {items.map((item, index) => {
                const ItemIcon = item.icon
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ 
                      delay: index * 0.04, 
                      duration: 0.25,
                      ease: [0.16, 1, 0.3, 1]
                    }}
                  >
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "group/item flex items-start gap-3 p-3 rounded-lg transition-all duration-200",
                        "hover:bg-white/10",
                        "relative overflow-hidden"
                      )}
                    >
                      {/* Hover highlight effect */}
                      <motion.div
                        className={cn(
                          "absolute inset-0 bg-gradient-to-r opacity-0 transition-opacity duration-200",
                          "group-hover/item:opacity-100",
                          accentColor === "blue" && "from-blue-500/10 to-transparent",
                          accentColor === "green" && "from-emerald-500/10 to-transparent",
                          accentColor === "purple" && "from-purple-500/10 to-transparent",
                          accentColor === "orange" && "from-orange-500/10 to-transparent"
                        )}
                      />
                      
                      <div className={cn(
                        "relative flex-shrink-0 p-2.5 rounded-lg transition-all duration-300",
                        "bg-white/5 border border-white/10",
                        "group-hover/item:bg-white/10 group-hover/item:border-white/20",
                        "group-hover/item:scale-110 group-hover/item:shadow-lg"
                      )}>
                        <ItemIcon className={cn(
                          "h-4 w-4 transition-all duration-300",
                          iconColorVariants[accentColor]
                        )} />
                      </div>
                      <div className="relative flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium text-foreground transition-all duration-200",
                          "group-hover/item:translate-x-0.5"
                        )}>
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 transition-colors duration-200 group-hover/item:text-muted-foreground/80">
                          {item.description}
                        </p>
                      </div>
                      
                      {/* Arrow indicator */}
                      <motion.div
                        className="relative self-center opacity-0 group-hover/item:opacity-100 transition-all duration-200"
                        initial={{ x: -5 }}
                        whileHover={{ x: 0 }}
                      >
                        <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </motion.div>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Header() {
  const { theme } = useTheme()
  const { user: supabaseUser, loading: isLoading, signOut } = useSupabaseUser()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const navRef = useRef<HTMLElement>(null)
  const globalDropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
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
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  // Use default logo during SSR to prevent hydration mismatch
  const logoSrc = mounted && theme === "dark"
    ? "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Mycosoft%20Logo%20(1)-lArPx4fwtqahyHVlnRLWWSfqWLIJpv.png"
    : "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/MycosoftLogo2%20(1)-5jx3SObDwKV9c6QmbxJ2NWopjhfLmZ.png"

  return (
    <header className="border-b bg-background/80 backdrop-blur-xl sticky top-0 z-50" suppressHydrationWarning>
      {/* h-12 on mobile (saves 8px), h-14 on desktop */}
      <div className="container max-w-7xl mx-auto flex h-12 md:h-14 items-center justify-between px-3 md:px-4">
        <div className="flex items-center gap-1.5 md:gap-2 font-semibold">
          <Link href="/" className="flex items-center gap-1.5 md:gap-2 font-semibold group">
            <motion.div 
              className="relative h-7 w-7 md:h-8 md:w-8"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Image
                src={logoSrc}
                alt="Mycosoft Logo"
                fill
                className="object-contain"
                priority
              />
            </motion.div>
            {/* Hide brand name on small mobile to save space */}
            <span className="hidden sm:inline transition-colors duration-300 group-hover:text-primary">Mycosoft</span>
          </Link>
        </div>

        {/* Desktop Navigation with Individual Dropdowns */}
        <nav ref={navRef} className="hidden md:flex items-center gap-1">
          {/* Search - Direct Link */}
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/5 hover:scale-[1.02] active:scale-[0.98] group"
            onMouseEnter={() => setOpenDropdown(null)}
          >
            <Search className="h-4 w-4 text-muted-foreground group-hover:text-blue-400 transition-colors duration-300" />
            <span>Search</span>
          </Link>

          {/* About Us - Direct Link */}
          <Link
            href="/about"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/5 hover:scale-[1.02] active:scale-[0.98] group"
            onMouseEnter={() => setOpenDropdown(null)}
          >
            <Users className="h-4 w-4 text-muted-foreground group-hover:text-green-400 transition-colors duration-300" />
            <span>About Us</span>
          </Link>

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
            items={natureOSItems}
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
            items={appsItems}
            isOpen={openDropdown === "apps"}
            onOpen={() => setOpenDropdown("apps")}
            onClose={() => setOpenDropdown(null)}
            accentColor="orange"
            mainHref="/apps"
            globalTimeoutRef={globalDropdownTimeoutRef}
          />

          {/* Security - Direct Link (no dropdown) */}
          {user && (
            <Link
              href="/security"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/5 hover:scale-[1.02] active:scale-[0.98] group"
              onMouseEnter={() => setOpenDropdown(null)}
            >
              <Lock className="h-4 w-4 text-muted-foreground group-hover:text-red-400 transition-colors duration-300" />
              <span>Security</span>
            </Link>
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
              <Button variant="default" size="sm" className="mr-2 transition-all duration-300 hover:scale-105" asChild>
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
