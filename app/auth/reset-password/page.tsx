'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'

interface PasswordStrength {
  score: number
  label: string
  color: string
  requirements: {
    length: boolean
    uppercase: boolean
    lowercase: boolean
    number: boolean
    special: boolean
  }
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [tokenValid, setTokenValid] = useState(true)

  // Check for token validity on mount
  useEffect(() => {
    const checkToken = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session) {
          setTokenValid(false)
          setError('Invalid or expired reset link. Please request a new password reset.')
        }
      } catch (err) {
        setTokenValid(false)
        setError('Failed to validate reset link. Please try again.')
      }
    }

    checkToken()
  }, [supabase.auth])

  // Password strength calculation
  const passwordStrength = useMemo((): PasswordStrength => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    }

    const metRequirements = Object.values(requirements).filter(Boolean).length
    const score = (metRequirements / 5) * 100

    let label = 'Weak'
    let color = 'bg-red-500'

    if (score >= 80) {
      label = 'Strong'
      color = 'bg-green-500'
    } else if (score >= 60) {
      label = 'Good'
      color = 'bg-yellow-500'
    } else if (score >= 40) {
      label = 'Fair'
      color = 'bg-orange-500'
    }

    return { score, label, color, requirements }
  }, [password])

  // Form validation
  const canSubmit = useMemo(() => {
    return (
      password.length >= 8 &&
      password === confirmPassword &&
      passwordStrength.score >= 60 &&
      !isLoading &&
      tokenValid
    )
  }, [password, confirmPassword, passwordStrength.score, isLoading, tokenValid])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!canSubmit) {
      return
    }

    setIsLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        throw updateError
      }

      setSuccess(true)

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/auth/login?reset=success')
      }, 2000)
    } catch (err) {
      console.error('[Reset Password] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to reset password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!tokenValid) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Invalid Reset Link
            </CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Link Expired</AlertTitle>
              <AlertDescription>
                Password reset links expire after 1 hour. Please request a new one.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => router.push('/auth/forgot-password')}
              className="w-full"
            >
              Request New Link
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Password Reset Successful
            </CardTitle>
            <CardDescription>
              Your password has been updated successfully.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>
                Redirecting you to login...
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
          <CardDescription>
            Enter a new password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  disabled={isLoading}
                  aria-invalid={password.length > 0 && passwordStrength.score < 60}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {password.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Password strength:</span>
                    <span className={`font-medium ${
                      passwordStrength.score >= 60 ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <Progress 
                    value={passwordStrength.score} 
                    className={`h-2 ${passwordStrength.color}`}
                  />

                  <div className="space-y-1 text-xs">
                    <p className="text-muted-foreground font-medium">Requirements:</p>
                    <ul className="space-y-0.5">
                      <li className={`flex items-center gap-1.5 ${
                        passwordStrength.requirements.length ? 'text-green-600' : 'text-muted-foreground'
                      }`}>
                        {passwordStrength.requirements.length ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        At least 8 characters
                      </li>
                      <li className={`flex items-center gap-1.5 ${
                        passwordStrength.requirements.uppercase ? 'text-green-600' : 'text-muted-foreground'
                      }`}>
                        {passwordStrength.requirements.uppercase ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        One uppercase letter
                      </li>
                      <li className={`flex items-center gap-1.5 ${
                        passwordStrength.requirements.lowercase ? 'text-green-600' : 'text-muted-foreground'
                      }`}>
                        {passwordStrength.requirements.lowercase ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        One lowercase letter
                      </li>
                      <li className={`flex items-center gap-1.5 ${
                        passwordStrength.requirements.number ? 'text-green-600' : 'text-muted-foreground'
                      }`}>
                        {passwordStrength.requirements.number ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        One number
                      </li>
                      <li className={`flex items-center gap-1.5 ${
                        passwordStrength.requirements.special ? 'text-green-600' : 'text-muted-foreground'
                      }`}>
                        {passwordStrength.requirements.special ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        One special character
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  disabled={isLoading}
                  aria-invalid={confirmPassword.length > 0 && password !== confirmPassword}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Passwords do not match
                </p>
              )}
              {confirmPassword.length > 0 && password === confirmPassword && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Passwords match
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={!canSubmit}
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Resetting Password...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button
            variant="link"
            onClick={() => router.push('/auth/login')}
            className="text-sm text-muted-foreground"
          >
            Back to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
