export interface FormSpacePaperMetadata {
  title: string
  subtitle: string
  author: string
  date: string
  version: string
  lang: string
}

export interface FormSpacePaper {
  metadata: FormSpacePaperMetadata
  body: string
}

export interface FormSpaceTocEntry {
  title: string
  id: string
  depth: number
}

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

const ASSET_PATHS: Record<string, string> = {
  "assets/recovery_demo.png": "/assets/formspace-white-paper/recovery-demo.png",
  "assets/architecture.png": "/assets/formspace-white-paper/architecture.png",
}

const ASSET_WIDTHS: Record<string, string> = {
  "/assets/formspace-white-paper/recovery-demo.png": "92%",
  "/assets/formspace-white-paper/architecture.png": "98%",
}

function parseMetadata(frontmatter: string): FormSpacePaperMetadata {
  const values = new Map<string, string>()

  for (const line of frontmatter.split(/\r?\n/)) {
    const separator = line.indexOf(":")
    if (separator < 0) continue
    values.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim())
  }

  return {
    title: values.get("title") ?? "FormSpace",
    subtitle: values.get("subtitle") ?? "",
    author: values.get("author") ?? "Mycosoft",
    date: values.get("date") ?? "",
    version: values.get("version") ?? "",
    lang: values.get("lang") ?? "en-US",
  }
}

export function parseFormSpacePaper(source: string): FormSpacePaper {
  const match = FRONTMATTER_PATTERN.exec(source)
  if (!match) throw new Error("FormSpace paper is missing YAML frontmatter")

  return {
    metadata: parseMetadata(match[1]),
    body: source.slice(match[0].length).trimStart(),
  }
}

export function extractFormSpaceExcerpt(body: string): string {
  const abstractStart = body.indexOf("# Abstract")
  const sectionTwoStart = body.indexOf("# 2 Scientific motivation and scope")

  if (abstractStart < 0 || sectionTwoStart < 0 || sectionTwoStart <= abstractStart) {
    throw new Error("FormSpace paper is missing the Abstract or Purpose boundary")
  }

  return body.slice(abstractStart, sectionTwoStart).trimEnd()
}

export function resolveFormSpaceAsset(source: string): string {
  return ASSET_PATHS[source] ?? source
}

export function getFormSpaceAssetWidth(source: string): string {
  return ASSET_WIDTHS[source] ?? "100%"
}

export function formSpaceSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function buildFormSpaceToc(markdown: string): FormSpaceTocEntry[] {
  return markdown
    .split(/\r?\n/)
    .map((line) => /^(#{1,3})\s+(.+)$/.exec(line))
    .filter((match): match is RegExpExecArray => Boolean(match))
    .map((match) => ({
      title: match[2].trim(),
      id: formSpaceSlug(match[2]),
      depth: match[1].length,
    }))
}

export function prepareFormSpaceMarkdown(markdown: string): string {
  return markdown.replace(
    /(!\[[^\]]*\]\()((?:assets\/)[^)]+)(\))\{width=\d+%\}/g,
    (_match, opening: string, source: string, closing: string) =>
      `${opening}${resolveFormSpaceAsset(source)}${closing}`,
  )
}
