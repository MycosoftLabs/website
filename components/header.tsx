"use client"

import Link from "next/link"
import { Search, Cloud, ShoppingBag, Bot, User2, Database } from "lucide-react"
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
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { MobileNav } from "@/components/mobile-nav"

export function Header() {
  const { theme } = useTheme()
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = () => {
    signOut()
    router.push("/")
  }

  return (
    <header className="border-b bg-background sticky top-0 z-40 w-full">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2 font-semibold">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="relative h-8 w-8">
              <Image
                src={
                  theme === "dark"
                    ? "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Mycosoft%20Logo%20%281%29-MgpXlNVbdUz4dcCyn7KDwm5d8iyZAP.png" // Dark mode logo (white on black)
                    : "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/MycosoftLogo2%20%281%29-xROWyxHp25aKiDgPq9UA4kmT4JaGb4.png" // Light mode logo (black on white)
                }
                alt="Mycosoft Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span>Mycosoft</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4 mx-auto">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/natureos">
              <Cloud className="h-4 w-4 mr-2" />
              NatureOS
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/devices">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Devices
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/natureos/apps/fungal-database">
              <Database className="h-4 w-4 mr-2" />
              Data
            </Link>
          </Button>
        </nav>

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

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                    <AvatarFallback>{user.name[0]}</AvatarFallback>
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
