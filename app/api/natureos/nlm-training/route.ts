/**
 * NLM Training API Route
 *
 * Proxies to MAS NLM + GPU Node APIs for real model training control.
 *
 * GET  - Fetch training status, model info, device fleet, GPU metrics
 * POST - Start/stop/pause training, save checkpoints, run inference
 *
 * NO MOCK DATA — returns real backend data or error if unavailable.
 */

import { NextRequest, NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

const MAS_API_URL = process.env.MAS_API_URL || "http://localhost:8001"
const MINDEX_API_URL = resolveMindexServerBaseUrl()

async function safeFetch(url: string, options?: RequestInit & { timeout?: number }) {
  const timeout = options?.timeout ?? 8000
  try {
    const res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(timeout),
      cache: "no-store",
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// GET: Aggregate training dashboard data from real backends
export async function GET(request: NextRequest) {
  const section = request.nextUrl.searchParams.get("section") || "all"

  try {
    // Parallel fetch from all real backends
    const [
      nlmHealth,
      nlmStatus,
      nlmModelInfo,
      nlmConfig,
      gpuStatus,
      devices,
      networkDevices,
      trainingRuns,
      checkpoints,
      dataStats,
    ] = await Promise.all([
      safeFetch(`${MAS_API_URL}/api/nlm/health`),
      safeFetch(`${MAS_API_URL}/api/nlm/model/status`),
      safeFetch(`${MAS_API_URL}/api/nlm/model/info`),
      safeFetch(`${MAS_API_URL}/api/nlm/training/config`),
      safeFetch(`${MAS_API_URL}/api/gpu-node/status`),
      safeFetch(`${MAS_API_URL}/api/mycobrain/devices`),
      safeFetch(`${MAS_API_URL}/api/devices`),
      safeFetch(`${MAS_API_URL}/api/nlm/training/runs`),
      safeFetch(`${MAS_API_URL}/api/nlm/training/checkpoints`),
      safeFetch(`${MINDEX_API_URL}/api/mindex/internal/stats`),
    ])

    // Merge device lists from MycoBrain + MAS Device Registry
    const mycoBrainDevices = (devices?.devices || []).map((d: any) => ({
      ...d,
      source: "mycobrain",
    }))
    const masDevices = (networkDevices?.devices || []).map((d: any) => ({
      ...d,
      source: "mas-registry",
    }))
    // Deduplicate by device_id
    const allDeviceMap = new Map<string, any>()
    for (const d of [...mycoBrainDevices, ...masDevices]) {
      const key = d.device_id || d.id
      if (key && !allDeviceMap.has(key)) allDeviceMap.set(key, d)
    }
    const allDevices = Array.from(allDeviceMap.values())

    // Parse GPU metrics
    const gpuMetrics = gpuStatus?.gpu
      ? {
          name: gpuStatus.gpu.name,
          memoryUsed: gpuStatus.gpu.memory_used_mb,
          memoryTotal: gpuStatus.gpu.memory_total_mb,
          memoryPercent: gpuStatus.gpu.memory_percent,
          utilization: gpuStatus.gpu.utilization_percent,
          temperature: gpuStatus.gpu.temperature_c,
          powerDraw: gpuStatus.gpu.power_draw_w,
        }
      : null

    // Build training state from real backend data
    const activeRun = trainingRuns?.runs?.find(
      (r: any) => r.status === "training" || r.status === "paused"
    )

    const trainingState = activeRun
      ? {
          status: activeRun.status,
          runId: activeRun.run_id,
          epoch: activeRun.current_epoch || 0,
          totalEpochs: activeRun.total_epochs || 0,
          loss: activeRun.metrics?.loss ?? null,
          accuracy: activeRun.metrics?.accuracy ?? null,
          learningRate: activeRun.config?.learning_rate ?? null,
          samplesProcessed: activeRun.metrics?.samples_processed ?? 0,
          gradientNorm: activeRun.metrics?.gradient_norm ?? null,
          elapsedTime: activeRun.metrics?.elapsed_seconds ?? 0,
          startedAt: activeRun.started_at,
          lossHistory: activeRun.metrics?.loss_history ?? [],
          accuracyHistory: activeRun.metrics?.accuracy_history ?? [],
        }
      : {
          status: "idle",
          runId: null,
          epoch: 0,
          totalEpochs: 0,
          loss: null,
          accuracy: null,
          learningRate: null,
          samplesProcessed: 0,
          gradientNorm: null,
          elapsedTime: 0,
          startedAt: null,
          lossHistory: [],
          accuracyHistory: [],
        }

    // NLM model config (real architecture params)
    const modelConfig = nlmConfig || nlmModelInfo
    const architecture = modelConfig
      ? {
          baseModel: modelConfig.base_model || modelConfig.architecture?.base_model || null,
          hiddenSize: modelConfig.architecture?.hidden_size || modelConfig.hidden_size || null,
          numLayers: modelConfig.architecture?.num_hidden_layers || modelConfig.num_layers || null,
          numAttentionHeads:
            modelConfig.architecture?.num_attention_heads || modelConfig.attention_heads || null,
          vocabSize: modelConfig.architecture?.vocab_size || null,
          maxPositionEmbeddings:
            modelConfig.architecture?.max_position_embeddings || null,
          useLora: modelConfig.architecture?.use_lora ?? null,
          loraR: modelConfig.architecture?.lora_r || null,
          loraAlpha: modelConfig.architecture?.lora_alpha || null,
        }
      : null

    const hyperparameters = nlmConfig?.training || null

    return NextResponse.json({
      training: trainingState,
      model: {
        health: nlmHealth,
        info: nlmModelInfo,
        architecture,
        hyperparameters,
      },
      gpu: gpuMetrics,
      gpuContainers: gpuStatus?.containers || [],
      devices: allDevices,
      deviceCount: allDevices.length,
      checkpoints: checkpoints?.checkpoints || [],
      dataStats: dataStats || null,
      connections: {
        mas: nlmHealth !== null,
        mindex: dataStats !== null,
        gpu: gpuMetrics !== null,
        mycobrain: mycoBrainDevices.length > 0,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("NLM Training API error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch training dashboard data",
        message: error instanceof Error ? error.message : "Unknown error",
        connections: { mas: false, mindex: false, gpu: false, mycobrain: false },
      },
      { status: 503 }
    )
  }
}

// POST: Training control actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...params } = body

    switch (action) {
      case "start": {
        const res = await fetch(`${MAS_API_URL}/api/nlm/training/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            learning_rate: params.learningRate,
            batch_size: params.batchSize,
            epochs: params.epochs,
            warmup_steps: params.warmupSteps,
            weight_decay: params.weightDecay,
            dropout: params.dropout,
            optimizer: params.optimizer,
            scheduler: params.scheduler,
            grad_clip: params.gradClip,
            attention_heads: params.attentionHeads,
            hidden_dim: params.hiddenDim,
            num_layers: params.numLayers,
            categories: params.categories,
            resume_from: params.resumeFrom,
          }),
          signal: AbortSignal.timeout(30000),
        })
        if (!res.ok) {
          const detail = await res.text()
          return NextResponse.json(
            { error: "Failed to start training", detail },
            { status: res.status }
          )
        }
        return NextResponse.json(await res.json())
      }

      case "stop": {
        const res = await fetch(`${MAS_API_URL}/api/nlm/training/stop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ run_id: params.runId }),
          signal: AbortSignal.timeout(15000),
        })
        if (!res.ok) {
          const detail = await res.text()
          return NextResponse.json(
            { error: "Failed to stop training", detail },
            { status: res.status }
          )
        }
        return NextResponse.json(await res.json())
      }

      case "pause": {
        const res = await fetch(`${MAS_API_URL}/api/nlm/training/pause`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ run_id: params.runId }),
          signal: AbortSignal.timeout(15000),
        })
        if (!res.ok) {
          const detail = await res.text()
          return NextResponse.json(
            { error: "Failed to pause training", detail },
            { status: res.status }
          )
        }
        return NextResponse.json(await res.json())
      }

      case "resume": {
        const res = await fetch(`${MAS_API_URL}/api/nlm/training/resume`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ run_id: params.runId }),
          signal: AbortSignal.timeout(15000),
        })
        if (!res.ok) {
          const detail = await res.text()
          return NextResponse.json(
            { error: "Failed to resume training", detail },
            { status: res.status }
          )
        }
        return NextResponse.json(await res.json())
      }

      case "checkpoint": {
        const res = await fetch(`${MAS_API_URL}/api/nlm/training/checkpoint`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            run_id: params.runId,
            label: params.label,
          }),
          signal: AbortSignal.timeout(30000),
        })
        if (!res.ok) {
          const detail = await res.text()
          return NextResponse.json(
            { error: "Failed to save checkpoint", detail },
            { status: res.status }
          )
        }
        return NextResponse.json(await res.json())
      }

      case "load_checkpoint": {
        const res = await fetch(`${MAS_API_URL}/api/nlm/training/load`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkpoint_id: params.checkpointId }),
          signal: AbortSignal.timeout(30000),
        })
        if (!res.ok) {
          const detail = await res.text()
          return NextResponse.json(
            { error: "Failed to load checkpoint", detail },
            { status: res.status }
          )
        }
        return NextResponse.json(await res.json())
      }

      case "inference": {
        const res = await fetch(`${MAS_API_URL}/api/nlm/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: params.text,
            query_type: params.queryType || "general",
            max_tokens: params.maxTokens || 512,
            temperature: params.temperature || 0.7,
            context: params.context,
          }),
          signal: AbortSignal.timeout(30000),
        })
        if (!res.ok) {
          const detail = await res.text()
          return NextResponse.json(
            { error: "Inference failed", detail },
            { status: res.status }
          )
        }
        return NextResponse.json(await res.json())
      }

      case "mutate": {
        const res = await fetch(`${MAS_API_URL}/api/nlm/training/mutate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            run_id: params.runId,
            mutation_type: params.mutationType,
            target_layer: params.targetLayer,
            magnitude: params.magnitude,
          }),
          signal: AbortSignal.timeout(15000),
        })
        if (!res.ok) {
          const detail = await res.text()
          return NextResponse.json(
            { error: "Mutation failed", detail },
            { status: res.status }
          )
        }
        return NextResponse.json(await res.json())
      }

      case "export": {
        const res = await fetch(`${MAS_API_URL}/api/nlm/training/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            run_id: params.runId,
            checkpoint_id: params.checkpointId,
            format: params.format || "gguf",
          }),
          signal: AbortSignal.timeout(60000),
        })
        if (!res.ok) {
          const detail = await res.text()
          return NextResponse.json(
            { error: "Export failed", detail },
            { status: res.status }
          )
        }
        return NextResponse.json(await res.json())
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("NLM Training action error:", error)
    return NextResponse.json(
      {
        error: "Training action failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
