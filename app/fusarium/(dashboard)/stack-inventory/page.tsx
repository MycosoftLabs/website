import { redirect } from "next/navigation"
import { STACK_CONTEXT_KEYS } from "@/lib/fusarium/stack-inventory/contracts"

/** Compatibility route for the user-facing name used in older deep links. */
export default async function StackInventoryCompatibilityRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const incoming = await searchParams
  const preserved = new URLSearchParams()
  for (const key of STACK_CONTEXT_KEYS) {
    const value = incoming[key]
    if (typeof value === "string" && value) preserved.set(key, value)
  }
  const query = preserved.toString()
  redirect(query ? `/fusarium/stack?${query}` : "/fusarium/stack")
}
