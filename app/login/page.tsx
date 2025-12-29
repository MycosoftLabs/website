"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { signIn } from "next-auth/react"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

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
          <div className="grid gap-2 mb-4">
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
                } finally {
                  setIsLoading(false)
                }
              }}
            >
              Continue with Google
            </Button>
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
                } finally {
                  setIsLoading(false)
                }
              }}
            >
              Continue with GitHub
            </Button>
          </div>
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
