"use client"

import { Shield, Lock, ArrowRight, Brain } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface AIStudioUnauthorizedProps {
  reason: "unauthenticated" | "unauthorized"
  email?: string
}

/**
 * Unauthorized access page for AI Studio.
 * Shown when a user is not logged in or does not have an allowed email domain.
 */
export function AIStudioUnauthorized({ reason, email }: AIStudioUnauthorizedProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-red-500/20 bg-card/80 backdrop-blur">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          {/* Icon */}
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield className="h-10 w-10 text-red-500" />
            </div>
            <div className="absolute -top-1 -right-1">
              <Lock className="h-5 w-5 text-red-400" />
            </div>
          </div>

          {/* Badge */}
          <Badge variant="outline" className="border-red-500/30 text-red-400">
            Authorized Personnel Only
          </Badge>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
              <Brain className="h-6 w-6 text-purple-500" />
              MYCA AI Studio
            </h1>
            <p className="text-lg font-semibold text-muted-foreground">
              Access Restricted
            </p>
          </div>

          {/* Description */}
          <div className="space-y-3 text-sm text-muted-foreground">
            {reason === "unauthenticated" ? (
              <>
                <p>
                  The MYCA AI Studio is an internal tool restricted to authorized
                  Mycosoft team members only.
                </p>
                <p>
                  Please sign in with your <strong className="text-foreground">@mycosoft.org</strong> or{" "}
                  <strong className="text-foreground">@mycosoft.com</strong> email
                  address to access this area.
                </p>
              </>
            ) : (
              <>
                <p>
                  The MYCA AI Studio is an internal tool available only to
                  authorized Mycosoft team members.
                </p>
                {email && (
                  <p className="text-xs bg-muted/50 rounded-lg px-3 py-2">
                    Signed in as <strong className="text-foreground">{email}</strong> — this
                    account does not have access to the AI Studio.
                  </p>
                )}
                <p>
                  Access is limited to users with a{" "}
                  <strong className="text-foreground">@mycosoft.org</strong> or{" "}
                  <strong className="text-foreground">@mycosoft.com</strong> email
                  address.
                </p>
              </>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {reason === "unauthenticated" ? (
              <Button asChild className="w-full">
                <a href="/login?redirectTo=/natureos/ai-studio">
                  Sign In
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
            ) : (
              <Button asChild variant="outline" className="w-full">
                <a href="/natureos">
                  Back to NatureOS
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
            )}

            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <a href="/">Return to Homepage</a>
            </Button>
          </div>

          {/* Footer note */}
          <p className="text-xs text-muted-foreground/60">
            For access requests, contact your Mycosoft administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
