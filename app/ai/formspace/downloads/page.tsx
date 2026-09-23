import type { Metadata } from "next"
import { ProductDownloads } from "@/components/product/product-downloads"
import { MODEL_DOWNLOAD_SECTIONS } from "@/lib/model-downloads"

export const metadata: Metadata = {
  title: "FormSpace downloads | Mycosoft",
  description:
    "FormSpace software, demonstrator, harness, model versions, weights, and source training data.",
}

export default function FormspaceDownloadsPage() {
  return (
    <ProductDownloads
      title="FormSpace downloads"
      parentHref="/ai/formspace"
      parentLabel="FormSpace"
      intro="Software, the live demonstrator, the public harness, model versions, weights, and source training data. Available artifacts open their verified host; planned release cards show where the signed package will appear."
      sections={MODEL_DOWNLOAD_SECTIONS}
    />
  )
}
