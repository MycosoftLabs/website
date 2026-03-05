"use client"

import { useState, useRef, useEffect } from "react"
import { Send } from "lucide-react"
import { VesselBadge } from "./VesselBadge"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface TrainingChatProps {
  sessionId: string
  vesselStage: string
  history?: Message[]
}

export function TrainingChat({
  sessionId,
  vesselStage,
  history = [],
}: TrainingChatProps) {
  const [messages, setMessages] = useState<Message[]>(history)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: text }])
    setLoading(true)
    try {
      const res = await fetch(`/api/ethics-training/sandbox/${sessionId}/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()
      const reply = data?.response ?? "No response."
      setMessages((prev) => [...prev, { role: "assistant", content: reply }])
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error: Could not get response." },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-[300px] rounded-lg border border-gray-700 bg-gray-900/50">
      <div className="p-3 border-b border-gray-700 flex items-center gap-2">
        <VesselBadge stage={vesselStage} />
        <span className="text-sm text-gray-400">Chat with sandbox MYCA</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[400px]">
        {messages.length === 0 && (
          <p className="text-gray-500 text-sm">Send a message to start the conversation.</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 text-sm ${
                m.role === "user"
                  ? "bg-amber-600/30 text-amber-100"
                  : "bg-gray-700/50 text-gray-200"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-700/50 rounded-lg px-4 py-2 text-sm text-gray-400">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-gray-700 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Type a message..."
          className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="min-h-[44px] min-w-[44px] rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        >
          <Send className="h-5 w-5 text-white" />
        </button>
      </div>
    </div>
  )
}
