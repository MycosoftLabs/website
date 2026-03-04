import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ETHICS_TRAINING_ALLOWED_EMAILS } from "@/lib/access/routes"
import { ETSidebar } from "@/components/ethics-training/ETSidebar"

export default async function EthicsTrainingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const email = user?.email?.toLowerCase() ?? ""

  if (!user) {
    redirect("/login?redirectTo=/ethics-training")
  }

  if (!ETHICS_TRAINING_ALLOWED_EMAILS.includes(email)) {
    redirect("/?error=access_denied&message=Ethics+training+is+restricted+to+authorized+users")
  }

  return (
    <div className="min-h-dvh flex bg-[#0A1929] text-white">
      <ETSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
