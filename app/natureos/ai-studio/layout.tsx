import { createClient } from "@/lib/supabase/server"
import { AIStudioUnauthorized } from "./_components/unauthorized"

export const dynamic = "force-dynamic"

/**
 * AI Studio Access Gate
 *
 * INTERNAL ONLY - restricted to @mycosoft.org and @mycosoft.com email addresses.
 * Used for demos to investors and Enterprise users to showcase MYCA control.
 * No public user should be able to access this.
 */
const ALLOWED_EMAIL_DOMAINS = ["mycosoft.org", "mycosoft.com"]

export default async function AIStudioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in - show unauthorized page
  if (!user || !user.email) {
    return <AIStudioUnauthorized reason="unauthenticated" />
  }

  // Check email domain
  const emailDomain = user.email.toLowerCase().split("@")[1]
  const isAllowedDomain = ALLOWED_EMAIL_DOMAINS.includes(emailDomain)

  if (!isAllowedDomain) {
    return <AIStudioUnauthorized reason="unauthorized" email={user.email} />
  }

  return <>{children}</>
}
