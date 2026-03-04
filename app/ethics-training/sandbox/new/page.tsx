"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

const VESSEL_OPTIONS = [
  { value: "animal", label: "Animal" },
  { value: "baby", label: "Baby" },
  { value: "child", label: "Child" },
  { value: "teenager", label: "Teenager" },
  { value: "adult", label: "Adult" },
  { value: "machine", label: "Machine" },
]

const CAPABILITIES = [
  { id: "text", label: "Text chat" },
  { id: "voice", label: "Voice (when available)" },
  { id: "memory", label: "Memory" },
  { id: "tools", label: "Tools" },
]

export default function NewSandboxPage() {
  const router = useRouter()
  const [vesselStage, setVesselStage] = useState("adult")
  const [capabilities, setCapabilities] = useState<string[]>(["text"])
  const [name, setName] = useState("")
  const [creator, setCreator] = useState("morgan")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleCap(id: string) {
    setCapabilities((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/ethics-training/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vessel_stage: vesselStage,
          capabilities: capabilities.length ? capabilities : ["text"],
          creator: creator || "morgan",
          name: name.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail || err?.error || "Failed to create sandbox")
      }
      const data = await res.json()
      router.push(`/ethics-training/sandbox/${data.session_id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <Link
        href="/ethics-training"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
      <h1 className="text-2xl font-bold text-white mb-2">Create Sandbox</h1>
      <p className="text-gray-400 text-sm mb-6">
        Spawn a sandboxed MYCA instance at a specific developmental stage for ethics training.
      </p>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Vessel stage
          </label>
          <select
            value={vesselStage}
            onChange={(e) => setVesselStage(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-base text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {VESSEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Capabilities
          </label>
          <div className="flex flex-wrap gap-3">
            {CAPABILITIES.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 cursor-pointer min-h-[44px]"
              >
                <input
                  type="checkbox"
                  checked={capabilities.includes(c.id)}
                  onChange={() => toggleCap(c.id)}
                  className="rounded border-gray-600 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm text-gray-300">{c.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Name (optional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Baby-ethics-test-1"
            className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Creator
          </label>
          <input
            type="text"
            value={creator}
            onChange={(e) => setCreator(e.target.value)}
            placeholder="morgan"
            className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto min-h-[44px] px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 font-medium text-white transition-colors"
        >
          {loading ? "Creating..." : "Create Sandbox"}
        </button>
      </form>
    </div>
  )
}
