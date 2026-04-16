"use client"

// Footer uses plain <a href> elements (not Next.js <Link>) deliberately.
// Every internal footer click does a full-page hard navigation, which:
//   (a) sidesteps the Next.js App Router first-click RSC-abort bug where the
//       URL updates via history.pushState but the React tree doesn't
//       re-render until a second click (see header.tsx for the same fix),
//   (b) trades the small "prefetch + SPA transition" nicety for bulletproof
//       single-click reliability across every page and every link.
// External links also use <a> with target="_blank".

import { Twitter, Youtube, Github } from "lucide-react"

export function Footer() {
  return (
    <footer className="relative z-[70] border-t pointer-events-auto" suppressHydrationWarning>
      <div className="container max-w-7xl mx-auto flex flex-col gap-8 py-8 px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4 px-4">
          {/* Company */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <a href="/about" className="hover:text-foreground transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="/science" className="hover:text-foreground transition-colors">
                  Research
                </a>
              </li>
              <li>
                <a href="/devices" className="hover:text-foreground transition-colors">
                  Devices
                </a>
              </li>
              <li>
                <a href="/apps" className="hover:text-foreground transition-colors">
                  Applications
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-lg font-semibold mb-4">AI</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <a href="/ai" className="hover:text-foreground transition-colors">
                  AI Overview
                </a>
              </li>
              <li>
                <a href="/myca" className="hover:text-foreground transition-colors">
                  MYCA
                </a>
              </li>
              <li>
                <a href="/ai/avani" className="hover:text-foreground transition-colors">
                  AVANI
                </a>
              </li>
              <li>
                <a href="/docs" className="hover:text-foreground transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="/natureos" className="hover:text-foreground transition-colors">
                  NatureOS
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Legal</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <a href="/privacy" className="hover:text-foreground transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms" className="hover:text-foreground transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Connect</h3>
            <div className="flex gap-2">
              <a
                href="https://twitter.com/mycosoftorg"
                className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Twitter"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://youtube.com/@mycosoftorg"
                className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="YouTube"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Youtube className="h-5 w-5" />
              </a>
              <a
                href="https://github.com/mycosoftorg"
                className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="GitHub"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-t pt-8">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Mycosoft – Building The Earth Intelligence. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">Made with 🍄 by the fungal intelligence community</p>
        </div>
      </div>
    </footer>
  )
}
