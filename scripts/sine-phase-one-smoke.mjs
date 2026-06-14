#!/usr/bin/env node

const args = parseArgs(process.argv.slice(2))
const base = String(args.base || process.env.SINE_SMOKE_BASE || "http://localhost:3010").replace(/\/$/, "")
const jsonOutput = Boolean(args.json)
const runAnalysisProbe = Boolean(args["run-analysis"])
const selfTest = Boolean(args["self-test"])

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const report = {
  base,
  started_at: new Date().toISOString(),
  summary: {
    pass: 0,
    warn: 0,
    fail: 0,
  },
  checks: [],
  probes: {},
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

function addCheck(status, name, detail, extra = {}) {
  report.summary[status] += 1
  report.checks.push({ status, name, detail, context: extra })
}

async function fetchJson(path, timeoutMs = 45_000) {
  const url = `${base}${path}`
  const res = await fetch(url, {
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  return { url, status: res.status, ok: res.ok, text, data }
}

async function fetchPage(path, timeoutMs = 30_000) {
  const url = `${base}${path}`
  const res = await fetch(url, {
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  })
  const text = await res.text()
  return { url, status: res.status, ok: res.ok, text }
}

function arrayFromPayload(payload, keys) {
  if (!payload || typeof payload !== "object") return []
  for (const key of keys) {
    const value = payload[key]
    if (Array.isArray(value)) return value
  }
  return []
}

function acousticRows(payload) {
  return arrayFromPayload(payload, ["blobs", "files", "items", "rows"])
}

function uuidBacked(row) {
  if (!row || typeof row !== "object") return false
  return [row.id, row.blob_id, row.uuid, row.remote_id, row.analysis_id].some((value) => UUID_RE.test(String(value || "")))
}

function hasStream(row) {
  if (!row || typeof row !== "object") return false
  return Boolean(row.stream_url || row.streamUrl || row.stream)
}

function summarizeRows(rows) {
  const uuidBackedCount = rows.filter(uuidBacked).length
  const streamCount = rows.filter(hasStream).length
  return {
    count: rows.length,
    uuid_backed: uuidBackedCount,
    playback_only: rows.length - uuidBackedCount,
    stream_urls: streamCount,
    first_id: rows[0]?.id ?? null,
    first_path: rows[0]?.relative_path ?? rows[0]?.path ?? null,
  }
}

function modelRows(payload) {
  return arrayFromPayload(payload, ["models", "items", "rows", "registered_models"])
}

function prototypeRows(payload) {
  return arrayFromPayload(payload, ["prototypes", "items", "rows", "prototype_catalog", "catalog"])
}

const OPEN_SET_REVIEW_STATUSES = new Set([
  "ambiguous",
  "hold_for_review",
  "human_review",
  "low_confidence",
  "needs_review",
  "open_set_review",
  "out_of_domain",
  "out_of_domain_candidate",
  "ood",
  "ood_candidate",
  "queued_review",
  "review",
  "review_required",
  "unknown",
  "uncertain",
  "unconfirmed",
])

function normalizedStatus(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
}

function rowHasOpenSetReviewStatus(row) {
  if (!row || typeof row !== "object") return false
  return [
    row.ood_status,
    row.open_set_status,
    row.status,
    row.identification_status,
    row.review_status,
    row.verification_status,
  ].some((value) => OPEN_SET_REVIEW_STATUSES.has(normalizedStatus(value)))
}

function rowHasOpenSetMetricFailure(row) {
  if (!row || typeof row !== "object") return false
  const confidence = numberFrom(row.confidence ?? row.score ?? row.probability)
  const minConfidence = numberFrom(row.min_confidence ?? row.confidence_threshold ?? row.threshold)
  const oodScore = numberFrom(row.ood_score ?? row.out_of_domain_score)
  const oodThreshold = numberFrom(row.ood_threshold ?? row.out_of_domain_threshold)
  const margin = numberFrom(row.confidence_margin ?? row.margin)
  const minMargin = numberFrom(row.min_confidence_margin ?? row.margin_threshold)
  return (
    (confidence != null && minConfidence != null && confidence < minConfidence) ||
    (oodScore != null && oodThreshold != null && oodScore > oodThreshold) ||
    (margin != null && minMargin != null && margin < minMargin)
  )
}

function rowIsOpenSetReview(row) {
  return rowHasOpenSetReviewStatus(row) || rowHasOpenSetMetricFailure(row)
}

function rowHasModelProvenance(row) {
  if (!row || typeof row !== "object") return false
  const hasIdentity = Boolean(row.model_id || row.model_name || row.model || row.model_version || row.inference_id)
  const hasRuntime = Boolean(row.framework || row.runtime || row.artifact_uri || row.artifact_path || row.model_checksum || row.checksum)
  const hasOutput = Array.isArray(row.top_labels) ? row.top_labels.length > 0 : Boolean(row.label || row.top_label || row.category)
  return hasIdentity && hasRuntime && hasOutput
}

function rowHasPrototypeProof(row) {
  if (!row || typeof row !== "object") return false
  const hasIdentity = Boolean(row.prototype_id || row.embedding_id || row.vector_checksum || row.model_id || row.source)
  const hasScore = row.score != null || row.distance != null || row.similarity != null || row.confidence != null
  return hasIdentity && hasScore
}

function rowHasFusionProof(row) {
  if (!row || typeof row !== "object") return false
  const hasLink = Boolean(row.model_output_id || row.model_id || row.prototype_id || row.detector_event_id || row.event_id)
  const hasMeaning = Boolean(row.label || row.event_family || row.event_type || row.kind)
  return hasLink && hasMeaning
}

function transcriptHasEvidence(row) {
  if (!row || typeof row !== "object") return false
  return ["evidence_ids", "fusion_evidence_ids", "model_output_ids", "prototype_ids"].some((key) => Array.isArray(row[key]) && row[key].length > 0)
}

function analysisEvidenceSummary(payload) {
  const modelOutputs = arrayFromPayload(payload, ["model_outputs", "models", "model_predictions"])
  const fusionEvidence = arrayFromPayload(payload, ["fusion_evidence", "fusion", "evidence"])
  const prototypeMatches = [
    ...arrayFromPayload(payload, ["prototype_matches", "prototypes"]),
    ...arrayFromPayload(payload, ["deep_signal_matches", "deep_signal"]),
  ]
  const transcripts = arrayFromPayload(payload, ["sound_transcripts", "transcripts"])
  const identification = payload && typeof payload === "object" ? payload.identification_summary || payload.summary || null : null
  const hasIdentificationLabel = Boolean(
    identification &&
      typeof identification === "object" &&
      (identification.top_label || identification.label || identification.category || identification.type),
  )
  const provenModelOutputRows = modelOutputs.filter(rowHasModelProvenance)
  const openSetReviewModelOutputs = provenModelOutputRows.filter(rowIsOpenSetReview).length
  const confirmedModelOutputs = provenModelOutputRows.filter((row) => !rowIsOpenSetReview(row)).length
  const provenFusionEvidence = fusionEvidence.filter(rowHasFusionProof).length
  const provenPrototypeMatches = prototypeMatches.filter(rowHasPrototypeProof).length
  const evidenceBackedTranscripts = transcripts.filter(transcriptHasEvidence).length
  const hasConfirmedEvidence =
    confirmedModelOutputs > 0 || provenFusionEvidence > 0 || provenPrototypeMatches > 0 || evidenceBackedTranscripts > 0
  return {
    status: payload?.status ?? null,
    model_status: payload?.model_status ?? null,
    model_outputs: modelOutputs.length,
    proven_model_outputs: provenModelOutputRows.length,
    confirmed_model_outputs: confirmedModelOutputs,
    open_set_review_model_outputs: openSetReviewModelOutputs,
    fusion_evidence: fusionEvidence.length,
    proven_fusion_evidence: provenFusionEvidence,
    prototype_matches: prototypeMatches.length,
    proven_prototype_matches: provenPrototypeMatches,
    sound_transcripts: transcripts.length,
    evidence_backed_transcripts: evidenceBackedTranscripts,
    has_identification_label: hasIdentificationLabel,
    has_confirmed_evidence: hasConfirmedEvidence,
    contract_violation: hasIdentificationLabel && !hasConfirmedEvidence,
  }
}

function numberFrom(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function spectrogramShape(payload) {
  const spectrogram = payload && typeof payload === "object" ? payload.spectrogram || payload.spec || null : null
  if (!spectrogram || typeof spectrogram !== "object") return { rows: 0, columns: 0 }
  const matrix = spectrogram.power_db || spectrogram.powerDb || spectrogram.magnitude_db || spectrogram.matrix || spectrogram.values
  if (!Array.isArray(matrix) || !matrix.length) return { rows: 0, columns: 0 }
  const firstRow = Array.isArray(matrix[0]) ? matrix[0] : []
  return { rows: matrix.length, columns: firstRow.length }
}

function waveformPointCount(payload) {
  const waveform = payload && typeof payload === "object" ? payload.waveform || payload.wave || null : null
  if (!waveform || typeof waveform !== "object") return 0
  const amplitudes = waveform.amplitudes || waveform.samples || waveform.values || waveform.y
  return Array.isArray(amplitudes) ? amplitudes.length : 0
}

function visualisationSummary(payload) {
  const shape = spectrogramShape(payload)
  const waveformPoints = waveformPointCount(payload)
  const fftSize = numberFrom(payload?.fft_size ?? payload?.n_fft ?? payload?.fftSize ?? payload?.nFft)
  const hopLength = numberFrom(payload?.hop_length ?? payload?.hopLength)
  const sampleRate = numberFrom(payload?.sample_rate_hz ?? payload?.sample_rate ?? payload?.sampleRate)
  return {
    status: payload?.visualisation_status ?? payload?.status ?? null,
    quality: payload?.quality ?? payload?.colormap_hint ?? null,
    source: payload?.source ?? payload?.visualisation_source ?? null,
    waveform_points: waveformPoints,
    spectrogram_rows: shape.rows,
    spectrogram_columns: shape.columns,
    fft_size: fftSize,
    hop_length: hopLength,
    sample_rate_hz: sampleRate,
    high_definition:
      waveformPoints >= 4096 &&
      shape.rows >= 128 &&
      shape.columns >= 256 &&
      Boolean(fftSize || hopLength || sampleRate),
  }
}

function hasModelRuntimeProof(payload) {
  if (!payload || typeof payload !== "object") return false
  const rows = modelRows(payload)
  const active = payload.active_model || payload.model || null
  const candidates = [...rows, active].filter(Boolean)
  return candidates.some((row) => {
    if (!row || typeof row !== "object") return false
    const hasIdentity = Boolean(row.model_id || row.id || row.model_name || row.name)
    const hasRuntime = Boolean(row.framework || row.runtime || row.artifact_uri || row.artifact_path || row.model_checksum || row.checksum)
    const loaded = row.model_ready === true || row.model_loaded === true || row.loaded === true || String(row.status || "").toLowerCase().includes("ready")
    return hasIdentity && hasRuntime && loaded
  })
}

async function main() {
  let escFirstUuid = null

  try {
    const statusProbe = await fetchJson("/api/mindex/sine/status")
    report.probes.status = {
      status: statusProbe.status,
      product: statusProbe.data?.product ?? null,
      acoustic_blobs: statusProbe.data?.acoustic_blobs ?? null,
      detectors_registered: statusProbe.data?.detectors_registered ?? null,
      model_status: statusProbe.data?.model_status ?? null,
    }
    if (!statusProbe.ok) {
      addCheck("fail", "SINE status endpoint", `HTTP ${statusProbe.status}`)
    } else if (String(statusProbe.data?.product || "").toLowerCase() !== "sine") {
      addCheck("warn", "SINE status endpoint", "Endpoint returned 200 but did not identify product=SINE", report.probes.status)
    } else {
      addCheck("pass", "SINE status endpoint", "SINE status is reachable", report.probes.status)
    }
  } catch (error) {
    addCheck("fail", "SINE status endpoint", error.message)
  }

  for (const probe of [
    { key: "esc_catalog", name: "ESC-50 acoustic catalog", path: "/api/natureos/mindex/library?category=acoustic&limit=36&q=esc" },
    { key: "broad_catalog", name: "Broad acoustic catalog first page", path: "/api/natureos/mindex/library?category=acoustic&limit=36" },
  ]) {
    try {
      const result = await fetchJson(probe.path, 75_000)
      const rows = acousticRows(result.data)
      const summary = summarizeRows(rows)
      report.probes[probe.key] = { status: result.status, total_files: result.data?.total_files ?? result.data?.total ?? null, ...summary }
      if (probe.key === "esc_catalog" && summary.uuid_backed > 0) {
        const uuidRow = rows.find(uuidBacked)
        escFirstUuid = uuidRow?.id ?? uuidRow?.blob_id ?? uuidRow?.uuid ?? uuidRow?.remote_id ?? null
      }
      if (!result.ok) {
        addCheck("fail", probe.name, `HTTP ${result.status}`, report.probes[probe.key])
      } else if (!rows.length) {
        addCheck("fail", probe.name, "No playable acoustic rows returned", report.probes[probe.key])
      } else if (!summary.stream_urls) {
        addCheck("fail", probe.name, "Rows returned but no stream URLs were exposed", report.probes[probe.key])
      } else if (!summary.uuid_backed && probe.key === "esc_catalog") {
        addCheck("fail", probe.name, "ESC rows are streamable but none are UUID-backed for SINE analysis", report.probes[probe.key])
      } else if (!summary.uuid_backed) {
        addCheck("warn", probe.name, "Rows are streamable but playback-only; ESC registered rows still prove the SINE analysis path.", report.probes[probe.key])
      } else if (summary.playback_only > 0) {
        addCheck("warn", probe.name, `${summary.playback_only} row(s) are playback-only`, report.probes[probe.key])
      } else {
        addCheck("pass", probe.name, `${summary.count} row(s), all UUID-backed and streamable`, report.probes[probe.key])
      }
    } catch (error) {
      addCheck("fail", probe.name, error.message)
    }
  }

  if (escFirstUuid) {
    try {
      const qs = new URLSearchParams({
        start_sec: "0",
        end_sec: "5",
        max_waveform_points: "8192",
        waveform_points: "8192",
        max_time_frames: "1024",
        max_frequency_bins: "256",
        frequency_bins: "256",
        fft_size: "2048",
        n_fft: "2048",
        hop_length: "128",
        window_function: "hann",
        include_peaks: "true",
        quality: "oscilloscope",
      })
      const visualisationProbe = await fetchJson(`/api/mindex/sine/blobs/${encodeURIComponent(escFirstUuid)}/visualisation?${qs.toString()}`, 90_000)
      const summary = visualisationSummary(visualisationProbe.data || {})
      report.probes.visualisation_quality = {
        http_status: visualisationProbe.status,
        blob_id: escFirstUuid,
        ...summary,
      }
      if (!visualisationProbe.ok) {
        addCheck("fail", "Backend oscilloscope visualisation", `HTTP ${visualisationProbe.status}`, report.probes.visualisation_quality)
      } else if (summary.high_definition) {
        addCheck("pass", "Backend oscilloscope visualisation", "Backend returned dense real waveform/spectrogram scope data.", report.probes.visualisation_quality)
      } else {
        addCheck(
          "warn",
          "Backend oscilloscope visualisation",
          "Backend route is reachable, but it does not yet honor the high-definition oscilloscope visualisation request.",
          report.probes.visualisation_quality,
        )
      }
    } catch (error) {
      addCheck("fail", "Backend oscilloscope visualisation", error.message)
    }
  } else {
    addCheck("warn", "Backend oscilloscope visualisation", "Skipped because no UUID-backed ESC-50 row was available.")
  }

  if (runAnalysisProbe) {
    if (!escFirstUuid) {
      addCheck("fail", "Optional short-clip analysis contract", "No UUID-backed ESC-50 row was available for analysis.")
    } else {
      try {
        const qs = new URLSearchParams({
          require_real_audio: "true",
          require_model_evidence: "true",
          allow_detector_only: "true",
          semantic_fallback: "false",
          llm_fallback: "false",
          prototype_matching: "true",
          sound_transcripts: "evidence_backed_only",
        })
        const url = `${base}/api/mindex/sine/blobs/${encodeURIComponent(escFirstUuid)}/analyze?${qs.toString()}`
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "phase_one_smoke_short_clip",
            require_real_audio: true,
            require_model_evidence: true,
            allow_detector_only: true,
            semantic_fallback: false,
            llm_fallback: false,
            prototype_matching: true,
            sound_transcripts: "evidence_backed_only",
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(150_000),
        })
        const text = await res.text()
        let payload = null
        try {
          payload = text ? JSON.parse(text) : null
        } catch {
          payload = null
        }
        const evidence = analysisEvidenceSummary(payload || {})
        report.probes.analysis_contract = {
          status: res.status,
          blob_id: escFirstUuid,
          ...evidence,
        }
        if (!res.ok) {
          addCheck("fail", "Optional short-clip analysis contract", `HTTP ${res.status}`, report.probes.analysis_contract)
        } else if (evidence.contract_violation) {
          addCheck(
            "fail",
            "Optional short-clip analysis contract",
            "Backend returned semantic identification without confirmed model/prototype/fusion/transcript evidence.",
            report.probes.analysis_contract,
          )
        } else if (evidence.has_confirmed_evidence) {
          addCheck("pass", "Optional short-clip analysis contract", "Confirmed model/prototype/fusion/transcript evidence is present.", report.probes.analysis_contract)
        } else if (evidence.open_set_review_model_outputs > 0) {
          addCheck("warn", "Optional short-clip analysis contract", "Analysis returned model output held for OOD/open-set review, but no confirmed acoustic identity.", report.probes.analysis_contract)
        } else {
          addCheck("warn", "Optional short-clip analysis contract", "Analysis returned without semantic contract violation, but no confirmed model evidence is present.", report.probes.analysis_contract)
        }
      } catch (error) {
        addCheck("fail", "Optional short-clip analysis contract", error.message)
      }
    }
  }

  try {
    const modelsProbe = await fetchJson("/api/mindex/sine/models")
    const rows = modelRows(modelsProbe.data)
    report.probes.models = {
      status: modelsProbe.status,
      rows: rows.length,
      runtime_proof: hasModelRuntimeProof(modelsProbe.data),
    }
    if (!modelsProbe.ok) {
      addCheck("fail", "SINE model registry route", `HTTP ${modelsProbe.status}`)
    } else if (report.probes.models.runtime_proof) {
      addCheck("pass", "SINE model registry route", "Model runtime proof is present", report.probes.models)
    } else {
      addCheck("warn", "SINE model registry route", "Route is reachable, but no loaded model runtime proof is present", report.probes.models)
    }
  } catch (error) {
    addCheck("fail", "SINE model registry route", error.message)
  }

  try {
    const prototypesProbe = await fetchJson("/api/mindex/sine/prototypes")
    const rows = prototypeRows(prototypesProbe.data)
    report.probes.prototypes = { status: prototypesProbe.status, rows: rows.length }
    if (!prototypesProbe.ok) {
      addCheck("fail", "SINE prototype catalog route", `HTTP ${prototypesProbe.status}`)
    } else if (rows.length) {
      addCheck("pass", "SINE prototype catalog route", `${rows.length} prototype row(s) returned`, report.probes.prototypes)
    } else {
      addCheck("warn", "SINE prototype catalog route", "Route is reachable, but no prototype rows are present", report.probes.prototypes)
    }
  } catch (error) {
    addCheck("fail", "SINE prototype catalog route", error.message)
  }

  for (const page of [
    { key: "public_sine", name: "Public SINE page", path: "/sensing/sine" },
    { key: "sine_player", name: "Standalone SINE player", path: "/sensing/sine/player" },
  ]) {
    try {
      const result = await fetchPage(page.path)
      report.probes[page.key] = { status: result.status, bytes: result.text.length }
      if (!result.ok) {
        addCheck("warn", page.name, `HTTP ${result.status}; rendered-player browser smoke is the authoritative route check`, report.probes[page.key])
      } else {
        addCheck("pass", page.name, "Page route is reachable", report.probes[page.key])
      }
    } catch (error) {
      addCheck("warn", page.name, `${error.message}; rendered-player browser smoke is the authoritative route check`)
    }
  }

  report.finished_at = new Date().toISOString()
  report.phase_one_status =
    report.summary.fail > 0
      ? "not_ready"
      : report.summary.warn > 0
        ? "instrument_ready_ai_pending"
        : "instrument_ready"

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printHumanReport(report)
  }

  process.exitCode = report.summary.fail > 0 ? 1 : 0
}

function printHumanReport(result) {
  console.log("SINE Phase One smoke")
  console.log(`Base: ${result.base}`)
  console.log(`Status: ${result.phase_one_status}`)
  console.log(`Checks: ${result.summary.pass} pass, ${result.summary.warn} warn, ${result.summary.fail} fail`)
  console.log("")
  for (const check of result.checks) {
    const icon = check.status === "pass" ? "PASS" : check.status === "warn" ? "WARN" : "FAIL"
    console.log(`[${icon}] ${check.name}`)
    console.log(`       ${check.detail}`)
  }
  console.log("")
  console.log("Classifier truth:")
  if (result.probes.models?.runtime_proof) {
    console.log("- Model runtime proof is present. Confirm per-run model_outputs/fusion/transcripts before calling SINE scientifically ready.")
  } else {
    console.log("- No loaded model runtime proof is present. SINE is an instrument/workbench right now, not a completed AI classifier.")
  }
  if (result.probes.visualisation_quality?.high_definition) {
    console.log("- Backend oscilloscope visualisation is high-definition.")
  } else if (result.probes.visualisation_quality) {
    const scope = result.probes.visualisation_quality
    console.log(
      `- Backend oscilloscope visualisation is still low resolution: waveform=${scope.waveform_points}, spectrogram=${scope.spectrogram_rows}x${scope.spectrogram_columns}.`,
    )
  }
  if (!runAnalysisProbe) {
    console.log("- Optional mutating check skipped. Use --run-analysis to POST one short ESC-50 evidence-contract probe.")
  }
}

function runSelfTest() {
  const openSetSummary = analysisEvidenceSummary({
    identification_summary: { top_label: "UAV rotor", confidence: 0.82 },
    model_outputs: [
      {
        model_id: "sine-test-model",
        model_version: "self-test",
        framework: "onnxruntime",
        artifact_path: "/mnt/nas/mindex/models/acoustic/self-test/model.onnx",
        top_label: "UAV rotor",
        confidence: 0.42,
        min_confidence: 0.8,
        ood_status: "low_confidence",
      },
    ],
  })
  const confirmedSummary = analysisEvidenceSummary({
    identification_summary: { top_label: "UAV rotor", confidence: 0.92 },
    model_outputs: [
      {
        model_id: "sine-test-model",
        model_version: "self-test",
        framework: "onnxruntime",
        artifact_path: "/mnt/nas/mindex/models/acoustic/self-test/model.onnx",
        top_label: "UAV rotor",
        confidence: 0.92,
        min_confidence: 0.8,
        ood_status: "in_domain",
      },
    ],
  })
  const failures = []
  if (openSetSummary.proven_model_outputs !== 1) failures.push("OOD row should still count as proven model output")
  if (openSetSummary.confirmed_model_outputs !== 0) failures.push("OOD row must not count as confirmed model identity")
  if (openSetSummary.open_set_review_model_outputs !== 1) failures.push("OOD row should count as open-set review evidence")
  if (!openSetSummary.contract_violation) failures.push("Semantic label from only OOD model evidence must be a contract violation")
  if (confirmedSummary.confirmed_model_outputs !== 1) failures.push("Non-OOD model row should count as confirmed model identity")
  if (!confirmedSummary.has_confirmed_evidence) failures.push("Non-OOD model row should satisfy confirmed evidence")
  if (confirmedSummary.contract_violation) failures.push("Confirmed model evidence should not be a contract violation")

  const result = { status: failures.length ? "fail" : "pass", failures, open_set_summary: openSetSummary, confirmed_summary: confirmedSummary }
  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log("SINE Phase One smoke self-test")
    console.log(`Status: ${result.status}`)
    for (const failure of failures) console.log(`[FAIL] ${failure}`)
  }
  process.exitCode = failures.length ? 1 : 0
}

;(selfTest ? Promise.resolve(runSelfTest()) : main()).catch((error) => {
  console.error(error)
  process.exit(1)
})
