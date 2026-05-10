"use client"

// Footer uses plain <a href> elements (not Next.js <Link>) deliberately.
// Every internal footer click does a full-page hard navigation, which:
//   (a) sidesteps the Next.js App Router first-click RSC-abort bug where the
//       URL updates via history.pushState but the React tree doesn't
//       re-render until a second click (see header.tsx for the same fix),
//   (b) trades the small "prefetch + SPA transition" nicety for bulletproof
//       single-click reliability across every page and every link.
// External links also use <a> with target="_blank".

import { Youtube, Github } from "lucide-react"

function XLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.96 6.817H1.69l7.73-8.835L1.254 2.25h6.826l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"
      />
    </svg>
  )
}

export function Footer() {
  return (
    <footer className="relative z-[210] border-t bg-background pointer-events-auto" suppressHydrationWarning>
      <div className="container max-w-7xl mx-auto flex flex-col gap-8 py-8 px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4 px-4">
          {/* Company */}
          <div>
            <h3 className="text-lg font-semibold mb-4" suppressHydrationWarning>
              Company
            </h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <a href="/about" className="hover:text-foreground transition-colors" suppressHydrationWarning>
                  About Us
                </a>
              </li>
              <li>
                <a href="/science" className="hover:text-foreground transition-colors" suppressHydrationWarning>
                  Research
                </a>
              </li>
              <li>
                <a href="/devices" className="hover:text-foreground transition-colors" suppressHydrationWarning>
                  Devices
                </a>
              </li>
              <li>
                <a href="/apps" className="hover:text-foreground transition-colors" suppressHydrationWarning>
                  Applications
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-lg font-semibold mb-4" suppressHydrationWarning>
              AI
            </h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <a href="/ai" className="hover:text-foreground transition-colors" suppressHydrationWarning>
                  AI Overview
                </a>
              </li>
              <li>
                <a href="/myca" className="hover:text-foreground transition-colors" suppressHydrationWarning>
                  MYCA
                </a>
              </li>
              <li>
                <a href="/ai/avani" className="hover:text-foreground transition-colors" suppressHydrationWarning>
                  AVANI
                </a>
              </li>
              <li>
                <a href="/docs" className="hover:text-foreground transition-colors" suppressHydrationWarning>
                  Documentation
                </a>
              </li>
              <li>
                <a href="/natureos" className="hover:text-foreground transition-colors" suppressHydrationWarning>
                  NatureOS
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-semibold mb-4" suppressHydrationWarning>
              Legal
            </h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <a href="/privacy" className="hover:text-foreground transition-colors" suppressHydrationWarning>
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms" className="hover:text-foreground transition-colors" suppressHydrationWarning>
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="text-lg font-semibold mb-4" suppressHydrationWarning>
              Connect
            </h3>
            <div className="flex gap-2">
              <a
                href="https://x.com/Mycosoft"
                className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="X"
                target="_blank"
                rel="noopener noreferrer"
                suppressHydrationWarning
              >
                <XLogo className="h-5 w-5" />
              </a>
              <a
                href="https://www.youtube.com/channel/UCUUEOg35426XDmZ9sPXbDYg"
                className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="YouTube"
                target="_blank"
                rel="noopener noreferrer"
                suppressHydrationWarning
              >
                <Youtube className="h-5 w-5" />
              </a>
              <a
                href="https://github.com/MycosoftLabs"
                className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="GitHub"
                target="_blank"
                rel="noopener noreferrer"
                suppressHydrationWarning
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-t pt-8">
          <p className="text-sm text-muted-foreground" suppressHydrationWarning>
            © {new Date().getFullYear()} Mycosoft – Building The Earth Intelligence. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground" suppressHydrationWarning>Made with Nature</p>
        </div>
      </div>
    </footer>
  )
}
