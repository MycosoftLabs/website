"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Github, Twitter, Linkedin, Mail, MapPin, Phone } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="font-bold text-lg">Mycosoft</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              Advanced mycological research platform powered by AI and cutting-edge biotechnology.
            </p>
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="https://github.com/mycosoft" target="_blank" rel="noopener noreferrer">
                  <Github className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="https://twitter.com/mycosoft" target="_blank" rel="noopener noreferrer">
                  <Twitter className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="https://linkedin.com/company/mycosoft" target="_blank" rel="noopener noreferrer">
                  <Linkedin className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Research */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Research</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/fungal-database" className="text-muted-foreground hover:text-foreground transition-colors">
                  Fungal Database
                </Link>
              </li>
              <li>
                <Link href="/papers" className="text-muted-foreground hover:text-foreground transition-colors">
                  Research Papers
                </Link>
              </li>
              <li>
                <Link href="/compounds" className="text-muted-foreground hover:text-foreground transition-colors">
                  Compound Library
                </Link>
              </li>
              <li>
                <Link href="/ancestry" className="text-muted-foreground hover:text-foreground transition-colors">
                  Phylogenetic Trees
                </Link>
              </li>
              <li>
                <Link href="/species/submit" className="text-muted-foreground hover:text-foreground transition-colors">
                  Submit Species
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/natureos" className="text-muted-foreground hover:text-foreground transition-colors">
                  NatureOS
                </Link>
              </li>
              <li>
                <Link href="/apps" className="text-muted-foreground hover:text-foreground transition-colors">
                  Applications
                </Link>
              </li>
              <li>
                <Link href="/devices" className="text-muted-foreground hover:text-foreground transition-colors">
                  IoT Devices
                </Link>
              </li>
              <li>
                <Link href="/myca-ai" className="text-muted-foreground hover:text-foreground transition-colors">
                  MYCA AI
                </Link>
              </li>
              <li>
                <Link href="/api/docs" className="text-muted-foreground hover:text-foreground transition-colors">
                  API Documentation
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Stay Updated</h3>
            <p className="text-sm text-muted-foreground">Get the latest research updates and platform news.</p>
            <div className="flex space-x-2">
              <Input placeholder="Enter your email" className="flex-1" />
              <Button size="sm">Subscribe</Button>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Mail className="h-3 w-3" />
                <span>contact@mycosoft.org</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-3 w-3" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-3 w-3" />
                <span>San Francisco, CA</span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:space-y-0">
          <div className="flex flex-col space-y-2 text-sm text-muted-foreground md:flex-row md:space-y-0 md:space-x-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link href="/about" className="hover:text-foreground transition-colors">
              About Us
            </Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">
              Contact
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">© 2024 Mycosoft. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
