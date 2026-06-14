#!/usr/bin/env node

import { readFile } from "node:fs/promises"
import { relative, resolve } from "node:path"

const root = process.cwd()
const jsonOutput = process.argv.includes("--json")

const targetFiles = [
  "components/sensing/sine-acoustic-player.tsx",
  "components/mindex/tabs/library-tab.tsx",
  "app/sensing/[slug]/page.tsx",
  "app/sensing/sine/player/page.tsx",
  "app/api/mindex/sine/blobs/[id]/analysis/route.ts",
  "app/api/mindex/sine/blobs/[id]/analyze/route.ts",
  "app/api/mindex/sine/blobs/[id]/visualisation/route.ts",
  "app/api/mindex/sine/status/route.ts",
  "app/api/mindex/sine/models/route.ts",
  "app/api/mindex/sine/models/[model_id]/route.ts",
  "app/api/mindex/sine/prototypes/route.ts",
  "app/api/natureos/mindex/library/route.ts",
  "app/api/natureos/mindex/library/classify/route.ts",
  "app/api/natureos/mindex/sine/training/human-tags/route.ts",
  "lib/mindex/sine-contract.ts",
]

const rules = [
  {
    id: "google_genai_import",
    description: "SINE Website lane must not import or instantiate Google Gemini/GenAI.",
    pattern: /(from\s+["']@google\/genai["']|require\(["']@google\/genai["']\)|new\s+GoogleGenAI\b|GEMINI_API_KEY|model\s*:\s*["']gemini-)/i,
    severity: "fail",
  },
  {
    id: "mock_catalog",
    description: "SINE Website lane must not use AI Studio mock acoustic catalogs.",
    pattern: /(import\s+\{?\s*mockAcousticBlobs\b|from\s+["'][^"']*acousticData["']|mockAcousticBlobs\.(find|map|filter|length)|items\s*:\s*mockAcousticBlobs)/i,
    severity: "fail",
  },
  {
    id: "generated_audio",
    description: "SINE Website lane must not generate fake WAV/audio files.",
    pattern: /(function\s+generateWavBuffer\b|const\s+generateWavBuffer\b|generateWavBuffer\s*\(|Buffer\.alloc\(44\)|header\.write\(["']RIFF["'])/i,
    severity: "fail",
  },
  {
    id: "fake_visualisation_matrix",
    description: "SINE Website lane must not synthesize fake spectrogram or waveform matrices as backend truth.",
    pattern: /(const\s+power_db\s*:\s*number\[\]\[\]\s*=\s*\[\]|for\s*\(\s*let\s+fIdx\s*=|Compose highly distinct power spectra|generated visuali[sz]ation matrices)/i,
    severity: "fail",
  },
  {
    id: "llm_semantic_fallback_enabled",
    description: "SINE semantic fallback through LLMs must stay disabled.",
    pattern: /(llm_fallback["']?\s*[:,]\s*["']?true|allow_llm_semantic_fallback\s*:\s*true|semantic_fallback["']?\s*[:,]\s*["']?true|allow_filename_semantic_fallback\s*:\s*true|allow_metadata_semantic_fallback\s*:\s*true)/i,
    severity: "fail",
  },
  {
    id: "hardcoded_fake_labels",
    description: "Website SINE lane must not hard-code detector-only semantic labels as final meaning.",
    pattern: /\b(bird_likely|uav_rotor_likely|spectral_embedding|mindex_sine_v1|SINE-Embed-v1\.0\.0)\b/i,
    severity: "fail",
  },
]

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length
}

function lineTextForIndex(text, index) {
  const before = text.slice(0, index)
  const lineStart = before.lastIndexOf("\n") + 1
  const lineEndRaw = text.indexOf("\n", index)
  const lineEnd = lineEndRaw === -1 ? text.length : lineEndRaw
  return text.slice(lineStart, lineEnd).trim()
}

async function scanFile(file) {
  const absolute = resolve(root, file)
  const text = await readFile(absolute, "utf8")
  const findings = []
  for (const rule of rules) {
    const matches = text.matchAll(new RegExp(rule.pattern.source, `${rule.pattern.flags.includes("i") ? "i" : ""}g`))
    for (const match of matches) {
      const index = match.index ?? 0
      const line = lineTextForIndex(text, index)
      if (rule.allow?.test(line)) continue
      findings.push({
        rule: rule.id,
        severity: rule.severity,
        description: rule.description,
        file,
        line: lineNumberForIndex(text, index),
        text: line,
      })
    }
  }
  return findings
}

async function main() {
  const report = {
    started_at: new Date().toISOString(),
    scanned_files: targetFiles.length,
    summary: {
      pass: 0,
      warn: 0,
      fail: 0,
    },
    findings: [],
    status: "pending",
  }

  for (const file of targetFiles) {
    const findings = await scanFile(file)
    report.findings.push(...findings)
  }

  report.status = report.findings.some((finding) => finding.severity === "fail") ? "not_ready" : "clean"
  report.summary.fail = report.findings.filter((finding) => finding.severity === "fail").length
  report.summary.warn = report.findings.length - report.summary.fail
  report.summary.pass = report.findings.length ? 0 : 1
  report.finished_at = new Date().toISOString()

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log("SINE frontend no-fake-semantics smoke")
    console.log(`Status: ${report.status}`)
    console.log(`Scanned: ${report.scanned_files} files`)
    console.log(`Findings: ${report.findings.length}`)
    for (const finding of report.findings) {
      console.log("")
      console.log(`[${finding.severity.toUpperCase()}] ${finding.rule}`)
      console.log(`  ${relative(root, resolve(root, finding.file))}:${finding.line}`)
      console.log(`  ${finding.description}`)
      console.log(`  ${finding.text}`)
    }
  }

  process.exitCode = report.status === "not_ready" ? 1 : 0
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
