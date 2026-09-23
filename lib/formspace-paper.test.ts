import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  buildFormSpaceToc,
  extractFormSpaceExcerpt,
  extractFormSpacePanelSections,
  parseFormSpacePaper,
  resolveFormSpaceAsset,
} from "./formspace-paper"

const canonicalPaper = fs.readFileSync(
  path.join(process.cwd(), "docs", "ai", "formspace.md"),
  "utf8",
)

describe("FormSpace public white paper", () => {
  it("parses the supplied publication metadata and article body", () => {
    const paper = parseFormSpacePaper(canonicalPaper)

    expect(paper.metadata).toMatchObject({
      title: "FormSpace",
      subtitle: "A mathematical framework for learning organization and emergent behavior",
      author: "Mycosoft",
      date: "",
      version: "1.1 public review draft",
      lang: "en-US",
    })
    expect(paper.body).toMatch(/^# Abstract/)
  })

  it("extracts the publication-safe Abstract and Purpose sections", () => {
    const paper = parseFormSpacePaper(canonicalPaper)
    const excerpt = extractFormSpaceExcerpt(paper.body)

    expect(excerpt).toContain(
      "FormSpace is Mycosoft’s chart for the organized states of biological, physical, and artificial systems.",
    )
    expect(excerpt).toContain("# 1 Purpose and contribution")
    expect(excerpt).not.toContain("# 2 Scientific motivation and scope")
  })

  it("splits the excerpt into Overview, Abstract, and Description panel sections", () => {
    const paper = parseFormSpacePaper(canonicalPaper)
    const sections = extractFormSpacePanelSections(paper.body)

    expect(sections.overview).toContain("# Overview")
    expect(sections.overview).toContain("FormSpace is Mycosoft’s chart")
    expect(sections.overview).not.toMatch(/compress/i)
    expect(sections.keywords).toContain("FormSpace")
    expect(sections.abstract).toMatch(/^# Abstract/)
    expect(sections.abstract).toContain("**Keywords:**")
    expect(sections.abstract).not.toContain("# 1 Purpose and contribution")
    expect(sections.description).toMatch(/^# 1 Purpose and contribution/)
    expect(sections.description).not.toContain("# 2 Scientific motivation and scope")
  })

  it("contains no prohibited demonstration identifiers", () => {
    expect(canonicalPaper).not.toMatch(/\bITDX(?:26)?\b/i)
    expect(canonicalPaper).not.toMatch(/\bArmy\b/i)
    expect(canonicalPaper).not.toContain("organizer objectives")
    expect(canonicalPaper).not.toContain("RUN_WEKA.py")
    expect(canonicalPaper).not.toContain("25,728")
  })

  it("retains the complete scientific equation sequence", () => {
    const tags = [...canonicalPaper.matchAll(/\\tag\{(\d+)\}/g)].map((match) =>
      Number(match[1]),
    )

    expect(tags).toEqual(Array.from({ length: 26 }, (_, index) => index + 1))
  })

  it("maps paper figure paths to the public asset directory", () => {
    expect(resolveFormSpaceAsset("assets/recovery_demo.png")).toBe(
      "/assets/formspace-white-paper/recovery-demo.png",
    )
    expect(resolveFormSpaceAsset("assets/architecture.png")).toBe(
      "/assets/formspace-white-paper/architecture.png",
    )
  })

  it("builds a complete hierarchical table of contents", () => {
    const paper = parseFormSpacePaper(canonicalPaper)
    const tableOfContents = buildFormSpaceToc(paper.body)

    expect(tableOfContents[0]).toMatchObject({ title: "Abstract", depth: 1 })
    expect(tableOfContents.some((entry) => entry.title === "3.1 Observation and state")).toBe(true)
    expect(tableOfContents.at(-1)?.title).toBe("Appendix A Source consolidation and evidence status")
  })
})
