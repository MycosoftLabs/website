"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, Mail, CheckCircle, ArrowLeft, KeyRound } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState("")
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const emailValue = formData.get("email") as string
    setEmail(emailValue)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailValue, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
      })
      
      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="container flex min-h-screen w-screen flex-col items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-green-500/10">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
            </div>
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
            <CardDescription className="text-base">
              We've sent a password reset link to:
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="font-medium text-lg">{email}</p>
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p>Click the link in the email to reset your password.</p>
              <p className="mt-2">The link will expire in 1 hour.</p>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Didn't receive the email?</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Check your spam or junk folder</li>
                <li>Make sure you entered the correct email</li>
                <li>Wait a few minutes and try again</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                setSuccess(false)
                setEmail("")
              }}
            >
              Try a Different Email
            </Button>
            <Link href="/login" className="text-sm text-primary hover:underline">
              <span className="flex items-center gap-2 justify-center">
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </span>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container flex min-h-screen w-screen flex-col items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-primary/10">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Reset Your Password</CardTitle>
          <CardDescription className="text-center">
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                disabled={isLoading}
                autoFocus
              />
            </div>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Mail className="mr-2 h-4 w-4" />
              Send Reset Link
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
