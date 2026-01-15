"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle } from "lucide-react"
import { signIn } from "next-auth/react"

interface OAuthProviders {
  google: boolean
  github: boolean
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [oauthProviders, setOauthProviders] = useState<OAuthProviders>({ google: false, github: false })
  const [providersLoading, setProvidersLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Check for OAuth error from redirect
  useEffect(() => {
    const errorParam = searchParams.get("error")
    if (errorParam) {
      if (errorParam === "OAuthAccountNotLinked") {
        setError("This email is already linked to another account. Please sign in with credentials.")
      } else if (errorParam === "OAuthCallback") {
        setError("OAuth callback error. Please check your OAuth configuration.")
      } else if (errorParam === "OAuthSignin") {
        setError("OAuth sign-in error. The provider may not be properly configured.")
      } else {
        setError(`Authentication error: ${errorParam}`)
      }
    }
  }, [searchParams])
  
  // Check which OAuth providers are available
  useEffect(() => {
    async function checkProviders() {
      try {
        const res = await fetch("/api/auth/providers")
        if (res.ok) {
          const data = await res.json()
          setOauthProviders({
            google: data.providers?.google ?? false,
            github: data.providers?.github ?? false,
          })
        }
      } catch (e) {
        console.warn("Failed to check OAuth providers:", e)
      } finally {
        setProvidersLoading(false)
      }
    }
    checkProviders()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      const result = await signIn("credentials", { 
        email, 
        password, 
        redirect: false 
      })
      
      if (result?.error) {
        setError("Invalid email or password")
      } else if (result?.ok) {
        // Get callback URL from query params or default to /profile
        const urlParams = new URLSearchParams(window.location.search)
        const callbackUrl = urlParams.get("callbackUrl") || "/profile"
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>Enter your email and password to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          {/* OAuth Buttons - only show if providers are configured */}
          {!providersLoading && (oauthProviders.google || oauthProviders.github) && (
            <div className="grid gap-2 mb-4">
              {oauthProviders.google && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  onClick={async () => {
                    setIsLoading(true)
                    setError("")
                    try {
                      await signIn("google", { callbackUrl: "/profile" })
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Failed to sign in with Google")
                      setIsLoading(false)
                    }
                  }}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>
              )}
              {oauthProviders.github && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  onClick={async () => {
                    setIsLoading(true)
                    setError("")
                    try {
                      await signIn("github", { callbackUrl: "/profile" })
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Failed to sign in with GitHub")
                      setIsLoading(false)
                    }
                  }}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  Continue with GitHub
                </Button>
              )}
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Show message if no OAuth providers configured */}
          {!providersLoading && !oauthProviders.google && !oauthProviders.github && (
            <Alert variant="default" className="mb-4 border-yellow-500/50 bg-yellow-500/10">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-sm text-yellow-600 dark:text-yellow-400">
                OAuth providers not configured. Use email/password to sign in.
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="morgan@mycosoft.org"
                required
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required disabled={isLoading} />
            </div>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-muted-foreground">
            <span className="mr-1">Don&apos;t have an account?</span>
            <Link href="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
          <Link href="/reset-password" className="text-sm text-primary hover:underline">
            Forgot password?
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
