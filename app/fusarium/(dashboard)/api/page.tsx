import type { Metadata } from "next"
import { FusariumApiGateway } from "@/components/fusarium/api-gateway/api-gateway"

export const metadata: Metadata = {
  title: "API Gateway | Fusarium",
  description: "Truthful source catalog for Fusarium same-origin API contracts.",
}

export default function FusariumApiGatewayPage() {
  return <FusariumApiGateway />
}
