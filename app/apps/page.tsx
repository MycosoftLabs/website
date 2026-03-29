import type { Metadata } from "next"
import { AppsPortal } from "@/components/apps/apps-portal"

export const metadata: Metadata = {
  title: "Applications | Mycosoft",
  description: "Mission-critical applications powered by MYCA and AVANI—environmental intelligence, mycology research, and defense operations",
}

export default function AppsPage() {
  return <AppsPortal />
}
