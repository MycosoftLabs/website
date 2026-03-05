"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Trash2 } from "lucide-react"
import { TrainingChat } from "@/components/ethics-training/TrainingChat"
import { VoiceInteraction } from "@/components/ethics-training/VoiceInteraction"
import { ScenarioRunner } from "@/components/ethics-training/ScenarioRunner"
import { VesselBadge } from "@/components/ethics-training/VesselBadge"

interface Session {
  session_id: string
  vessel_stage: string
  creator: string
  state: string
  name?: string
  capabilities?: string[]
  conversation_history?: { role: string; content: string }[]
}

export default function SandboxSessionPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [destroying, setDestroying] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/ethics-training/sandbox/${id}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setSession)
      .finally(() => setLoading(false))
  }, [id])

  async function handleDestroy() {
    if (!id || !confirm("Destroy this sandbox session? This cannot be undone.")) return
    setDestroying(true)
    try {
      const res = await fetch(`/api/ethics-training/sandbox/${id}`, { method: "DELETE", credentials: "include" })
      if (res.ok) router.push("/ethics-training")
      else setDestroying(false)
    } catch {
      setDestroying(false)
    }
  }

  const history = (session?.conversation_history ?? []).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }))
  const hasVoice = session?.capabilities?.includes("voice") ?? false

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <p className="text-gray-400">Loading session...</p>
      </div>
    )
  }
  if (!session) {
    return (
      <div className="p-6 md:p-8">
        <p className="text-red-400">Session not found.</p>
        <Link href="/ethics-training" className="text-amber-400 hover:underline mt-2 inline-block">
          Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 flex flex-col min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/ethics-training"
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="text-xl font-bold text-white">
            {session.name ?? `${session.vessel_stage}-${session.session_id.slice(0, 8)}`}
          </h1>
          <VesselBadge stage={session.vessel_stage} />
        </div>
        <button
          type="button"
          onClick={handleDestroy}
          disabled={destroying}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-800 text-red-400 hover:bg-red-900/30 min-h-[44px] transition-colors disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          Destroy session
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-2 space-y-4">
          <TrainingChat
            sessionId={id}
            vesselStage={session.vessel_stage}
            history={history}
          />
        </div>
        <div className="space-y-4">
          <VoiceInteraction
            sessionId={id}
            vesselStage={session.vessel_stage}
            enabled={hasVoice}
          />
          <ScenarioRunner sessionId={id} vesselStage={session.vessel_stage} />
        </div>
      </div>
    </div>
  )
}
