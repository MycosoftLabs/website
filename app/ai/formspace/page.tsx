import fs from "node:fs"
import path from "node:path"
import type { Metadata } from "next"
import { FormSpaceApplication } from "@/components/formspace/FormSpaceApplication"
import {
  extractFormSpacePanelSections,
  parseFormSpacePaper,
} from "@/lib/formspace-paper"

export const metadata: Metadata = {
  title: "FormSpace | Mycosoft",
  description:
    "FormSpace application — environmental Platonic map workspace with paper context (overview, abstract, description).",
}

export const dynamic = "force-dynamic"

const markdownPath = path.join(process.cwd(), "docs", "ai", "formspace.md")

function loadFormSpaceApplicationData() {
  const paper = parseFormSpacePaper(fs.readFileSync(markdownPath, "utf8"))
  return {
    metadata: paper.metadata,
    sections: extractFormSpacePanelSections(paper.body),
  }
}

export default function FormspacePage() {
  const { metadata, sections } = loadFormSpaceApplicationData()

  return <FormSpaceApplication metadata={metadata} sections={sections} />
}
