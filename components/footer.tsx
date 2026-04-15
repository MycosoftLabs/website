"use client"

import { Twitter, Youtube, Github } from "lucide-react"

export function Footer() {
  function hardNavigate(url: string) {
    if (typeof window !== "undefined") {
      window.location.assign(url)
    }
  }

  function attachHardNav(url: string) {
    return {
      onMouseDown: (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
        hardNavigate(url)
      },
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
        hardNavigate(url)
      },
    }
  }

  return (
    <footer className="relative z-[70] border-t pointer-events-auto" suppressHydrationWarning>
      <div className="container max-w-7xl mx-auto flex flex-col gap-8 py-8 px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4 px-4">
          {/* Company */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <button type="button" {...attachHardNav("/about")} className="hover:text-foreground transition-colors text-left">
                  About Us
                </button>
              </li>
              <li>
                <button type="button" {...attachHardNav("/science")} className="hover:text-foreground transition-colors text-left">
                  Research
                </button>
              </li>
              <li>
                <button type="button" {...attachHardNav("/devices")} className="hover:text-foreground transition-colors text-left">
                  Devices
                </button>
              </li>
              <li>
                <button type="button" {...attachHardNav("/apps")} className="hover:text-foreground transition-colors text-left">
                  Applications
                </button>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-lg font-semibold mb-4">AI</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <button type="button" {...attachHardNav("/ai")} className="hover:text-foreground transition-colors text-left">
                  AI Overview
                </button>
              </li>
              <li>
                <button type="button" {...attachHardNav("/myca")} className="hover:text-foreground transition-colors text-left">
                  MYCA
                </button>
              </li>
              <li>
                <button type="button" {...attachHardNav("/ai/avani")} className="hover:text-foreground transition-colors text-left">
                  AVANI
                </button>
              </li>
              <li>
                <button type="button" {...attachHardNav("/docs")} className="hover:text-foreground transition-colors text-left">
                  Documentation
                </button>
              </li>
              <li>
                <button type="button" {...attachHardNav("/natureos")} className="hover:text-foreground transition-colors text-left">
                  NatureOS
                </button>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Legal</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <button type="button" {...attachHardNav("/privacy")} className="hover:text-foreground transition-colors text-left">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button type="button" {...attachHardNav("/terms")} className="hover:text-foreground transition-colors text-left">
                  Terms of Service
                </button>
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
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://youtube.com/@mycosoftorg"
                className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="YouTube"
              >
                <Youtube className="h-5 w-5" />
              </a>
              <a
                href="https://github.com/mycosoftorg"
                className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="GitHub"
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
