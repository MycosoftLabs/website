"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Shield, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Link from "next/link"

const ALLOWED_DOMAIN = "mycosoft.org"

function isCompanyEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return email.endsWith(`@${ALLOWED_DOMAIN}`)
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="container py-16 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container py-16 max-w-lg mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto p-3 rounded-full bg-muted w-fit mb-4">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              You must be signed in with a company email to access the platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link href="/login?redirectTo=/platform">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isCompanyEmail(user.email)) {
    return (
      <div className="container py-16 max-w-lg mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto p-3 rounded-full bg-destructive/10 w-fit mb-4">
              <Shield className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Platform access is restricted to authorized users with a <strong>@{ALLOWED_DOMAIN}</strong> email address.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>Signed in as: {user.email}</p>
            <p className="mt-2">Contact your administrator if you believe this is an error.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-8">
      {children}
    </div>
  )
}
