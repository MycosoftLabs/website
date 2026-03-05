"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

/**
 * Password login using server Supabase client.
 * Session is written to cookies by Supabase's setAll, so redirect works correctly.
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function loginWithPassword(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const redirectTo = (formData.get("redirectTo") as string) || "/dashboard"

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Email and password are required")}&redirectTo=${encodeURIComponent(redirectTo)}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&redirectTo=${encodeURIComponent(redirectTo)}`)
  }

  const path = redirectTo.includes("://") ? "/dashboard" : redirectTo.startsWith("/") ? redirectTo : `/${redirectTo}`
  redirect(path)
}
