#!/usr/bin/env node

import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

const args = parseArgs(process.argv.slice(2))
const jsonOutput = Boolean(args.json)
const root = process.cwd()
const aiStudioRoot = resolve(root, args["aistudio-root"] || "../../MINDEX/mindex/sine-acoustic-classifier")
const chatgptSpecPath = resolve(
  root,
  args["chatgpt-spec"] || "C:/Users/Owner1/.codex/attachments/f8dd2ed4-3ae7-4257-9c39-8b3bcbdb3c60/pasted-text.txt",
)

const files = {
  player: resolve(root, "components/sensing/sine-acoustic-player.tsx"),
  contract: resolve(root, "lib/mindex/sine-contract.ts"),
  backendPrompt: resolve(root, "docs/codex-handoffs/SINE_REAL_AI_CLASSIFIER_BACKEND_CURSOR_PROMPT_JUN06_2026.md"),
  aiServer: resolve(aiStudioRoot, "server.ts"),
  aiPlayer: resolve(aiStudioRoot, "src/components/AcousticPlayer.tsx"),
  aiModelExplorer: resolve(aiStudioRoot, "src/components/ModelExplorer.tsx"),
  aiTypes: resolve(aiStudioRoot, "src/types.ts"),
  chatgptSpec: chatgptSpecPath,
}

function parseArgs(argv) {
  const parsed = {}
  for (const item of argv) {
    if (item.startsWith("--") && item.includes("=")) {
      const [key, ...rest] = item.slice(2).split("=")
      parsed[key] = rest.join("=")
    } else if (item.startsWith("--")) {
      parsed[item.slice(2)] = true
    }
  }
  return parsed
}

async function readText(path) {
  return existsSync(path) ? readFile(path, "utf8") : ""
}

function hasAll(text, needles) {
  return needles.every((needle) => text.includes(needle))
}

function hasPattern(text, pattern) {
  return pattern.test(text)
}

function check(status, name, detail, context = {}) {
  return { status, name, detail, context }
}

async function main() {
  const [player, contract, backendPrompt, aiServer, aiPlayer, aiModelExplorer, aiTypes, chatgptSpec] = await Promise.all([
    readText(files.player),
    readText(files.contract),
    readText(files.backendPrompt),
    readText(files.aiServer),
    readText(files.aiPlayer),
    readText(files.aiModelExplorer),
    readText(files.aiTypes),
    readText(files.chatgptSpec),
  ])

  const checks = []

  checks.push(
    check(
      existsSync(aiStudioRoot) ? "pass" : "fail",
      "AI Studio prototype path",
      existsSync(aiStudioRoot)
        ? "Prototype exists and can be audited as a reference-only source."
        : "Expected AI Studio prototype path is missing.",
      { path: aiStudioRoot },
    ),
  )

  checks.push(
    check(
      hasAll(aiServer, ["GoogleGenAI", "mockAcousticBlobs", "generateWavBuffer"])
        ? "pass"
        : "fail",
      "AI Studio unsafe backend identified",
      "Prototype backend is correctly recognized as Gemini/mock/generated-audio reference code, not production MINDEX logic.",
      { file: files.aiServer },
    ),
  )

  checks.push(
    check(
      hasAll(aiPlayer, ["sound_transcripts", "Full Chronological Acoustic Script", "canvasRef"])
        ? "pass"
        : "fail",
      "AI Studio useful player concepts read",
      "Prototype player concepts include transcript windows and a combined waveform/spectrogram canvas.",
      { file: files.aiPlayer },
    ),
  )

  checks.push(
    check(
      hasAll(aiModelExplorer, ["SINE-Embed-v1", "512D", "prototype_centroids"])
        ? "pass"
        : "fail",
      "AI Studio model explorer concepts read",
      "Prototype architecture/prototype-bank concepts were inspected for frontend vocabulary only.",
      { file: files.aiModelExplorer },
    ),
  )

  checks.push(
    check(
      chatgptSpec
        ? hasAll(chatgptSpec, ["Sound Transcripts", "512-dimensional", "prototype catalog", "Deterministic DSP Pipeline"])
          ? "pass"
          : "fail"
        : "warn",
      "ChatGPT backend spec read",
      chatgptSpec
        ? "The pasted ChatGPT system spec is present and contains the transcript, DSP, embedding, and prototype requirements."
        : "The pasted ChatGPT system spec attachment is not present on this machine; keep the repo handoff as the durable source.",
      { file: files.chatgptSpec },
    ),
  )

  checks.push(
    check(
      hasAll(backendPrompt, ["Sound transcripts", "512D", "prototype", "PyTorch/TorchScript/ONNX", "evidence fusion"])
        ? "pass"
        : "fail",
      "ChatGPT spec carried into backend handoff",
      "The Cursor backend prompt carries the ChatGPT spec into a concrete real-AI backend contract instead of a Gemini/mock backend.",
      { file: files.backendPrompt },
    ),
  )

  const unsafeWebsitePattern =
    /(from\s+["']@google\/genai["']|require\(["']@google\/genai["']\)|new\s+GoogleGenAI\b|GEMINI_API_KEY|import\s+\{?\s*mockAcousticBlobs\b|from\s+["'][^"']*acousticData["']|function\s+generateWavBuffer\b|generateWavBuffer\s*\(|Buffer\.alloc\(44\)|header\.write\(["']RIFF["'])/i

  checks.push(
    check(
      !unsafeWebsitePattern.test(player + "\n" + contract) ? "pass" : "fail",
      "Unsafe prototype backend not merged",
      "Shared Website SINE player/contract do not import Gemini, mock catalogs, or generated WAV backend behavior.",
      { files: [files.player, files.contract] },
    ),
  )

  checks.push(
    check(
      hasAll(player, ["Chronological acoustic script", "displayTranscripts", "transcriptEvidenceBadges"])
        ? "pass"
        : "fail",
      "Chronological transcript UI merged",
      "The shared player contains an evidence-backed transcript window lane instead of accepting generated prose.",
      { file: files.player },
    ),
  )

  checks.push(
    check(
      hasAll(player, ["CLIENT_SCOPE_WAVEFORM_POINTS = 8192", "CLIENT_SCOPE_SPECTROGRAM_COLUMNS = 1024", "CLIENT_SCOPE_SPECTROGRAM_ROWS = 256", "Oscilloscope control bank"])
        ? "pass"
        : "fail",
      "High-definition oscilloscope UI merged",
      "The shared player has dense browser-real-audio scope constants and an oscilloscope-style control bank.",
      { file: files.player },
    ),
  )

  checks.push(
    check(
      hasAll(player, ["SINE model architecture", "Real classifier recipe", "Classifier scope contract", "512D MINDEX prototype bank"])
        ? "pass"
        : "fail",
      "Model architecture/prototype panels merged",
      "The shared player exposes the useful AI Studio architecture/prototype concepts as evidence-gated panels.",
      { file: files.player },
    ),
  )

  checks.push(
    check(
      hasAll(player, ["Fungi Compute oscilloscope", "Arduino frequency detection", "auditok activity"])
        ? "pass"
        : "fail",
      "Reference stack preserved",
      "The shared player names the Fungi Compute oscilloscope and acoustic detector references in the real-classifier recipe.",
      { file: files.player },
    ),
  )

  checks.push(
    check(
      hasAll(player, ["Correct the sound", "human tag", "model evidence is still pending"]) ||
        hasAll(player, ["Correct the sound", "Human tag", "model evidence is still pending"])
        ? "pass"
        : "fail",
      "Human correction loop merged",
      "The shared player includes human identification correction UI while preserving model-vs-human evidence separation.",
      { file: files.player },
    ),
  )

  checks.push(
    check(
      hasAll(contract, ["semantic_fallback", "llm_fallback", "evidence_backed_only", "prototype_matching"])
        ? "pass"
        : "fail",
      "Evidence contract preserved",
      "The shared Website contract keeps semantic/LLM fallbacks disabled and requires evidence-backed transcripts/prototypes.",
      { file: files.contract },
    ),
  )

  checks.push(
    check(
      hasPattern(aiTypes, /sound_transcripts\??:\s*SoundTranscriptEntry\[\]/) &&
        hasPattern(player, /type\s+SoundTranscript|interface\s+SoundTranscript/)
        ? "pass"
        : "fail",
      "Transcript schema represented",
      "AI Studio transcript shape is represented in the Website player without accepting unsupported semantics.",
      { files: [files.aiTypes, files.player] },
    ),
  )

  const summary = {
    pass: checks.filter((item) => item.status === "pass").length,
    warn: checks.filter((item) => item.status === "warn").length,
    fail: checks.filter((item) => item.status === "fail").length,
  }

  const report = {
    started_at: new Date().toISOString(),
    status: summary.fail > 0 ? "not_ready" : "ready",
    ai_studio_root: aiStudioRoot,
    summary,
    checks,
    finished_at: new Date().toISOString(),
  }

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log("SINE AI Studio merge audit")
    console.log(`AI Studio root: ${aiStudioRoot}`)
    console.log(`Status: ${report.status}`)
    console.log(`Checks: ${summary.pass} pass, ${summary.warn} warn, ${summary.fail} fail`)
    for (const item of checks) {
      const label = item.status.toUpperCase()
      console.log("")
      console.log(`[${label}] ${item.name}`)
      console.log(`       ${item.detail}`)
    }
  }

  process.exitCode = summary.fail > 0 ? 1 : 0
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
