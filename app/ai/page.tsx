import { redirect } from "next/navigation"

/** Legacy /ai overview -> /si */
export default function AiOverviewRedirect() {
  redirect("/si")
}
