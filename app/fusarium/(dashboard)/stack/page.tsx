import type { Metadata } from "next"
import { StackInventoryPage } from "@/components/fusarium/stack-inventory/stack-inventory-page"

export const metadata: Metadata = {
  title: "Stack Inventory — FUSARIUM",
}

export default function StackInventoryRoute() {
  return <StackInventoryPage />
}
