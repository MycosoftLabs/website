"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { Search, Cloud, ShoppingBag, Bot, AppWindowIcon as Apps, X, Menu, User2, Shield, Cpu, ChevronDown, Lock, Target, FileText, Map, Network, Database, Globe, Microscope, FlaskConical, Compass, TreeDeciduous, BarChart3, Bug, AlertTriangle, Radio, Box, Antenna, Wind } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Chat } from "@/components/chat/chat"
import { ModeToggle } from "@/components/mode-toggle"
import { useAuth } from "@/contexts/auth-context"
import Image from "next/image"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

// Navigation items configuration (same as header.tsx)
const defenseItems = [
  { title: "Fusarium", href: "/defense/fusarium", icon: Bug },
  { title: "OEI Capabilities", href: "/defense/oei", icon: Target },
  { title: "Technical Documentation", href: "/defense/docs", icon: FileText },
]

const natureOSItems = [
  { title: "CREP Dashboard", href: "/dashboard/crep", icon: Map },
  { title: "Device Network", href: "/natureos/devices", icon: Network },
  { title: "MINDEX", href: "/natureos/mindex", icon: Database },
  { title: "Earth Simulator", href: "/natureos/earth", icon: Globe },
]

const devicesItems = [
  { title: "Mushroom 1", href: "/devices/mushroom-1", icon: Antenna },
  { title: "SporeBase", href: "/devices/sporebase", icon: Wind },
  { title: "Hyphae 1", href: "/devices/hyphae-1", icon: Box },
  { title: "MycoNode", href: "/devices/myconode", icon: Radio },
  { title: "ALARM", href: "/devices/alarm", icon: AlertTriangle },
]

const appsItems = [
  { title: "Petri Dish Simulator", href: "/apps/petri-dish", icon: FlaskConical },
  { title: "Mushroom Simulator", href: "/apps/mushroom-simulator", icon: Microscope },
  { title: "Compound Analyzer", href: "/apps/compound-analyzer", icon: FlaskConical },
  { title: "Spore Tracker", href: "/apps/spore-tracker", icon: Compass },
  { title: "Ancestry Database", href: "/apps/ancestry", icon: TreeDeciduous },
  { title: "Growth Analytics", href: "/apps/growth-analytics", icon: BarChart3 },
]

interface ExpandableSectionProps {
  title: string
  icon: React.ElementType
  items: { title: string; href: string; icon: React.ElementType }[]
  closeMenu: () => void
  isOpen: boolean
  onToggle: () => void
}

function ExpandableSection({ title, icon: Icon, items, closeMenu, isOpen, onToggle }: ExpandableSectionProps) {
  return (
    <div className="flex flex-col">
      <button
        onClick={onToggle}
        className="flex items-center justify-between text-lg font-medium py-1 hover:text-primary transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {title}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-7 pt-2 flex flex-col gap-2">
              {items.map((item) => {
                const ItemIcon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    <ItemIcon className="h-4 w-4" />
                    <span className="text-sm">{item.title}</span>
                  </Link>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function MobileNav() {
  const { theme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { user, signOut } = useAuth()
  
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
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const menuVariants = {
    closed: {
      opacity: 0,
      x: "100%",
      transition: {
        duration: 0.3,
        ease: "easeInOut",
      },
    },
    open: {
      opacity: 1,
      x: "0%",
      transition: {
        duration: 0.3,
        ease: "easeInOut",
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    closed: { opacity: 0, x: 20 },
    open: { opacity: 1, x: 0 },
  }

  return (
    <>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleMenu} aria-label="Menu">
        <Menu className="h-5 w-5" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={menuVariants}
            className="fixed inset-y-0 right-0 z-50 bg-background w-80 border-l border-gray-800 shadow-xl overflow-y-auto"
          >
            <div className="container flex h-14 items-center justify-between">
              <Link href="/" className="flex items-center gap-2 font-semibold" onClick={closeMenu}>
                <div className="relative h-8 w-8">
                  <Image
                    src={
                      mounted && theme === "dark"
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
              <Button variant="ghost" size="icon" onClick={closeMenu}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="container flex flex-col gap-4 pt-6 pl-4 pb-8">
              <motion.div variants={itemVariants} className="flex flex-col gap-3">
                {/* Search - Direct Link */}
                <Link href="/" className="flex items-center gap-2 text-lg font-medium py-1" onClick={closeMenu}>
                  <Search className="h-5 w-5" />
                  Search
                </Link>
                
                {/* Defense - Expandable */}
                <ExpandableSection
                  title="Defense"
                  icon={Shield}
                  items={defenseItems}
                  closeMenu={closeMenu}
                  isOpen={expandedSections.defense || false}
                  onToggle={() => toggleSection("defense")}
                />
                
                {/* NatureOS - Expandable */}
                <ExpandableSection
                  title="NatureOS"
                  icon={Cloud}
                  items={natureOSItems}
                  closeMenu={closeMenu}
                  isOpen={expandedSections.natureos || false}
                  onToggle={() => toggleSection("natureos")}
                />
                
                {/* Devices - Expandable */}
                <ExpandableSection
                  title="Devices"
                  icon={Cpu}
                  items={devicesItems}
                  closeMenu={closeMenu}
                  isOpen={expandedSections.devices || false}
                  onToggle={() => toggleSection("devices")}
                />
                
                {/* Apps - Expandable */}
                <ExpandableSection
                  title="Apps"
                  icon={Apps}
                  items={appsItems}
                  closeMenu={closeMenu}
                  isOpen={expandedSections.apps || false}
                  onToggle={() => toggleSection("apps")}
                />
                
                {/* Security - Direct Link (only for logged in users) */}
                {user && (
                  <Link href="/security" className="flex items-center gap-2 text-lg font-medium py-1" onClick={closeMenu}>
                    <Lock className="h-5 w-5" />
                    Security
                  </Link>
                )}
              </motion.div>

              <motion.div variants={itemVariants} className="flex flex-col gap-4 mt-4 border-t pt-4">
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
                      <Link href="/login" onClick={closeMenu}>
                        <User2 className="h-4 w-4 mr-2" />
                        Sign In
                      </Link>
                    </Button>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
