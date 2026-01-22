"use client"

import Link from "next/link"
import { Search, Cloud, ShoppingBag, Bot, AppWindowIcon as Apps, User2, Shield, Cpu, Lock, Loader2, ChevronDown, Target, FileText, Map, Network, Database, Globe, Microscope, FlaskConical, Compass, TreeDeciduous, BarChart3, Bug, AlertTriangle, Radio, Box, Antenna, Wind } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Chat } from "@/components/chat/chat"
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
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { useSupabaseUser } from "@/hooks/use-supabase-user"
import { useRouter } from "next/navigation"
import { MobileNav } from "@/components/mobile-nav"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

// Navigation dropdown items configuration
const defenseItems = [
  { title: "Fusarium", href: "/defense/fusarium", icon: Bug, description: "Fungal threat detection & monitoring" },
  { title: "OEI Capabilities", href: "/defense/oei", icon: Target, description: "Operational Environmental Intelligence" },
  { title: "Technical Documentation", href: "/defense/docs", icon: FileText, description: "Defense systems documentation" },
]

const natureOSItems = [
  { title: "CREP Dashboard", href: "/dashboard/crep", icon: Map, description: "Common Relevant Environmental Picture" },
  { title: "Device Network", href: "/natureos/devices", icon: Network, description: "Connected device management" },
  { title: "MINDEX", href: "/natureos/mindex", icon: Database, description: "Mycological intelligence database" },
  { title: "Earth Simulator", href: "/natureos/earth", icon: Globe, description: "Global environmental modeling" },
]

const devicesItems = [
  { title: "Mushroom 1", href: "/devices/mushroom-1", icon: Antenna, description: "Ground-based fungal intelligence station" },
  { title: "SporeBase", href: "/devices/sporebase", icon: Wind, description: "Bioaerosol collection system" },
  { title: "Hyphae 1", href: "/devices/hyphae-1", icon: Box, description: "Modular I/O platform" },
  { title: "MycoNode", href: "/devices/myconode", icon: Radio, description: "Subsurface bioelectric probe" },
  { title: "ALARM", href: "/devices/alarm", icon: AlertTriangle, description: "Indoor environmental monitor" },
]

const appsItems = [
  { title: "Petri Dish Simulator", href: "/apps/petri-dish", icon: FlaskConical, description: "Virtual culture growth simulation" },
  { title: "Mushroom Simulator", href: "/apps/mushroom-simulator", icon: Microscope, description: "3D fungal growth modeling" },
  { title: "Compound Analyzer", href: "/apps/compound-analyzer", icon: FlaskConical, description: "Chemical compound analysis" },
  { title: "Spore Tracker", href: "/apps/spore-tracker", icon: Compass, description: "Spore dispersal mapping" },
  { title: "Ancestry Database", href: "/apps/ancestry", icon: TreeDeciduous, description: "Fungal genealogy explorer" },
  { title: "Growth Analytics", href: "/apps/growth-analytics", icon: BarChart3, description: "Performance metrics & insights" },
]

// Reusable dropdown item component
function NavDropdownItem({ item }: { item: { title: string; href: string; icon: React.ElementType; description: string } }) {
  const Icon = item.icon
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          href={item.href}
          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium leading-none">{item.title}</span>
          </div>
          <p className="line-clamp-2 text-xs leading-snug text-muted-foreground mt-1">
            {item.description}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  )
}

export function Header() {
  const { theme } = useTheme()
  const { user: supabaseUser, loading: isLoading, signOut } = useSupabaseUser()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  
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

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  // Use default logo during SSR to prevent hydration mismatch
  const logoSrc = mounted && theme === "dark"
    ? "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Mycosoft%20Logo%20(1)-lArPx4fwtqahyHVlnRLWWSfqWLIJpv.png"
    : "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/MycosoftLogo2%20(1)-5jx3SObDwKV9c6QmbxJ2NWopjhfLmZ.png"

  return (
    <header className="border-b bg-background sticky top-0 z-40">
      <div className="container max-w-7xl mx-auto flex h-14 items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="relative h-8 w-8">
              <Image
                src={logoSrc}
                alt="Mycosoft Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span>Mycosoft</span>
          </Link>
        </div>

        {/* Desktop Navigation with Dropdowns */}
        <NavigationMenu className="hidden md:flex mx-auto">
          <NavigationMenuList>
            {/* Search - Direct Link */}
            <NavigationMenuItem>
              <Link href="/" legacyBehavior passHref>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>

            {/* Defense Dropdown */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="gap-1">
                <Shield className="h-4 w-4 mr-1" />
                Defense
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[300px] gap-1 p-2">
                  {defenseItems.map((item) => (
                    <NavDropdownItem key={item.href} item={item} />
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* NatureOS Dropdown */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="gap-1">
                <Cloud className="h-4 w-4 mr-1" />
                NatureOS
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[320px] gap-1 p-2">
                  {natureOSItems.map((item) => (
                    <NavDropdownItem key={item.href} item={item} />
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Devices Dropdown */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="gap-1">
                <Cpu className="h-4 w-4 mr-1" />
                Devices
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[340px] gap-1 p-2">
                  {devicesItems.map((item) => (
                    <NavDropdownItem key={item.href} item={item} />
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Apps Dropdown */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="gap-1">
                <Apps className="h-4 w-4 mr-1" />
                Apps
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[320px] gap-1 p-2">
                  {appsItems.map((item) => (
                    <NavDropdownItem key={item.href} item={item} />
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Security - Direct Link (no dropdown) */}
            {user && (
              <NavigationMenuItem>
                <Link href="/security" legacyBehavior passHref>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    <Lock className="h-4 w-4 mr-2" />
                    Security
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            )}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Right side controls - visible on all screen sizes */}
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Bot className="h-5 w-5" />
                  <span className="sr-only">Myca AI Assistant</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl h-[80vh]">
                <Chat />
              </DialogContent>
            </Dialog>
          </div>

          <ModeToggle />

          {isLoading ? (
            <Button variant="ghost" size="sm" disabled className="hidden md:flex">
              <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
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
              <Button variant="default" size="sm" className="mr-2" asChild>
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
