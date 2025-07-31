"use client"

import { useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { Search, Cloud, ShoppingBag, Bot, AppWindowIcon as Apps, X, Menu, User2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Chat } from "@/components/chat/chat"
import { ModeToggle } from "@/components/mode-toggle"
import { useAuth } from "@/contexts/auth-context"
import Image from "next/image"
import { useTheme } from "next-themes"

export function MobileNav() {
  const { theme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const { user, signOut } = useAuth()

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

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
            className="fixed inset-y-0 right-0 z-50 bg-background w-80 border-l border-gray-800 shadow-xl"
          >
            <div className="container flex h-14 items-center justify-between">
              <Link href="/" className="flex items-center gap-2 font-semibold" onClick={closeMenu}>
                <div className="relative h-8 w-8">
                  <Image
                    src={
                      theme === "dark"
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

            <div className="container flex flex-col gap-6 pt-8 pl-4">
              <motion.div variants={itemVariants} className="flex flex-col gap-4">
                <Link href="/" className="flex items-center gap-2 text-lg font-medium" onClick={closeMenu}>
                  <Search className="h-5 w-5" />
                  Search
                </Link>
                <Link href="/natureos" className="flex items-center gap-2 text-lg font-medium" onClick={closeMenu}>
                  <Cloud className="h-5 w-5" />
                  NatureOS
                </Link>
                <Link href="/devices" className="flex items-center gap-2 text-lg font-medium" onClick={closeMenu}>
                  <ShoppingBag className="h-5 w-5" />
                  Devices
                </Link>
                <Link href="/apps" className="flex items-center gap-2 text-lg font-medium" onClick={closeMenu}>
                  <Apps className="h-5 w-5" />
                  Apps
                </Link>
              </motion.div>

              <motion.div variants={itemVariants} className="flex flex-col gap-4 mt-4">
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
