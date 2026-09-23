import type { Metadata } from "next"
import { ProductDownloads } from "@/components/product/product-downloads"
import type { DownloadSection } from "@/lib/model-downloads"

const MYCA_DOWNLOADS: DownloadSection[] = [
  {
    id: "software",
    title: "Software",
    entries: [
      {
        name: "Open source",
        detail: "MYCA’s operating core and the agents it coordinates are in the Multi-Agent System repository.",
        links: [
          { host: "github", href: "https://github.com/MycosoftLabs/mycosoft-mas", note: "MycosoftLabs/mycosoft-mas" },
          { host: "huggingface", note: "MYCA is not a Hugging Face model." },
        ],
      },
      {
        name: "Operating core",
        detail: "The public entry for MYCA’s operating system is core.py in that repository.",
        links: [
          {
            host: "github",
            href: "https://github.com/MycosoftLabs/mycosoft-mas/blob/main/mycosoft_mas/myca/os/core.py",
            note: "mycosoft_mas/myca/os/core.py",
          },
          { host: "huggingface", note: "Not published on Hugging Face." },
        ],
      },
    ],
  },
  {
    id: "weights",
    title: "Weights",
    entries: [
      {
        name: "Model weights",
        detail:
          "MYCA does not publish a standalone weight file. The Nature Learning Model reference, its versions, and the training data are on that downloads page.",
        links: [
          { host: "github", note: "No MYCA weight file is in the public repository." },
          { host: "huggingface", note: "No weight repository on Hugging Face." },
          { host: "mycosoft", href: "/myca/nlm/downloads", note: "Nature Learning Model downloads" },
        ],
      },
    ],
  },
]

export const metadata: Metadata = {
  title: "MYCA downloads | Mycosoft",
  description: "MYCA open source. Model weight files are not on a public release.",
}

export default function MycaDownloadsPage() {
  return (
    <ProductDownloads
      title="MYCA downloads"
      parentHref="/myca"
      parentLabel="MYCA"
      intro="MYCA’s source is public. She does not publish a separate weight file. Model versions, weights, and training data are listed on the Nature Learning Model downloads page."
      sections={MYCA_DOWNLOADS}
    />
  )
}
