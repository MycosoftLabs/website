import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ETHICS_TRAINING_ALLOWED_EMAILS } from "@/lib/access/routes"
import { ETSidebar } from "@/components/ethics-training/ETSidebar"

export const dynamic = "force-dynamic"

export default async function EthicsTrainingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const email = user?.email?.toLowerCase() ?? ""
  const role = (user?.user_metadata?.role as string | undefined) ?? ""

  if (!user) {
    redirect("/login?redirectTo=/ethics-training")
  }

  const allowedByEmail = ETHICS_TRAINING_ALLOWED_EMAILS.includes(email)
  const allowedByRole = role === "owner" || role === "admin"
  if (!allowedByEmail && !allowedByRole) {
    redirect("/?error=access_denied&message=Ethics+training+is+restricted+to+authorized+users")
  }

  return (
    <div className="min-h-dvh flex bg-[#0A1929] text-white">
      <ETSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
