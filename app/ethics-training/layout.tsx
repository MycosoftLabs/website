import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { ETHICS_TRAINING_ALLOWED_EMAILS } from "@/lib/access/routes"
import { ETSidebar } from "@/components/ethics-training/ETSidebar"

export default async function EthicsTrainingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase() ?? ""
  const user = session?.user as { role?: string; isAdmin?: boolean } | undefined

  if (!session?.user) {
    redirect("/login?redirectTo=/ethics-training")
  }

  const allowedByEmail = ETHICS_TRAINING_ALLOWED_EMAILS.includes(email)
  const allowedByRole = user?.role === "owner" || user?.isAdmin === true
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
