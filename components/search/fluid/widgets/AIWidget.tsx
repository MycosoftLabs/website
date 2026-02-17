/**
 * AIWidget - Feb 2026
 *
 * AI conversation widget with working follow-up input.
 * Connects to /api/search/ai for responses.
 * Shows confidence, sources, suggested follow-ups.
 */

"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles,
  Send,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Loader2,
  Database,
  GripVertical,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface AIAnswer {
  text: string
  confidence: number
  sources: string[]
}

interface FollowUpResponse {
  text: string
  confidence: number
  sources: string[]
}

interface AIWidgetProps {
  answer: AIAnswer
  isFocused: boolean
  isLoading?: boolean
  onFollowUp?: (question: string) => void
  onFeedback?: (positive: boolean) => void
  onAddToNotepad?: (item: { type: string; title: string; content: string; source?: string }) => void
  className?: string
}

function AILoadingSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="flex gap-2 mt-4">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
    </div>
  )
}

export function AIWidget({
  answer,
  isFocused,
  isLoading = false,
  onFollowUp,
  onFeedback,
  onAddToNotepad,
  className,
}: AIWidgetProps) {
  const [followUpQuestion, setFollowUpQuestion] = useState("")
  const [followUpResponses, setFollowUpResponses] = useState<Array<{ question: string; answer: FollowUpResponse }>>([])
  const [isAsking, setIsAsking] = useState(false)
  const [showSources, setShowSources] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null)

  const handleFollowUp = useCallback(
    async (question?: string) => {
      const q = (question || followUpQuestion).trim()
      if (!q) return
      setFollowUpQuestion("")
      setIsAsking(true)

      try {
        const res = await fetch(`/api/search/ai?q=${encodeURIComponent(q)}`, {
          signal: AbortSignal.timeout(15000),
        })
        if (res.ok) {
          const data = await res.json()
          setFollowUpResponses((prev) => [
            ...prev,
            {
              question: q,
              answer: {
                text: data.result?.answer || "No response available.",
                confidence: data.result?.confidence || 0.5,
                sources: [data.result?.source || "ai"],
              },
            },
          ])
        } else {
          setFollowUpResponses((prev) => [
            ...prev,
            {
              question: q,
              answer: {
                text: "Unable to get a response. Please try again.",
                confidence: 0.3,
                sources: ["error"],
              },
            },
          ])
        }
      } catch {
        setFollowUpResponses((prev) => [
          ...prev,
          {
            question: q,
            answer: {
              text: "Request timed out. Please try again.",
              confidence: 0.3,
              sources: ["timeout"],
            },
          },
        ])
      } finally {
        setIsAsking(false)
      }

      onFollowUp?.(q)
    },
    [followUpQuestion, onFollowUp]
  )

  const handleFeedback = (positive: boolean) => {
    setFeedbackGiven(positive)
    onFeedback?.(positive)
  }

  // Loading state check AFTER all hooks
  if (isLoading) {
    return <AILoadingSkeleton />
  }

  const confidenceColor =
    answer.confidence >= 0.8
      ? "text-green-500"
      : answer.confidence >= 0.5
        ? "text-yellow-500"
        : "text-red-500"

  return (
    <div className={cn("space-y-3 sm:space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="p-1.5 sm:p-2 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-md sm:rounded-lg shrink-0">
          <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-violet-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <h3 className="font-semibold text-sm sm:text-base">MYCA AI</h3>
            <Badge variant="outline" className={cn("text-[10px] sm:text-xs", confidenceColor)}>
              {Math.round(answer.confidence * 100)}%
            </Badge>
          </div>
        </div>
      </div>

      {/* Main answer */}
      <div className="text-xs sm:text-sm leading-relaxed">{answer.text}</div>

      {/* Follow-up conversation */}
      <AnimatePresence>
        {followUpResponses.map((fu, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2 pl-4 border-l-2 border-violet-500/30"
          >
            <p className="text-xs font-medium text-violet-600 dark:text-violet-400">
              Q: {fu.question}
            </p>
            <p className="text-sm leading-relaxed">{fu.answer.text}</p>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Loading indicator */}
      {isAsking && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground pl-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          MYCA is thinking...
        </div>
      )}

      {/* Follow-up input -- ALWAYS visible */}
      <div className="space-y-2">
        <div className="flex gap-1.5 sm:gap-2">
          <Input
            value={followUpQuestion}
            onChange={(e) => setFollowUpQuestion(e.target.value)}
            placeholder="Ask a follow-up..."
            className="text-sm h-10 sm:h-9"
            onKeyDown={(e) => e.key === "Enter" && handleFollowUp()}
            disabled={isAsking}
          />
          <Button
            size="icon"
            className="h-10 w-10 sm:h-9 sm:w-9 shrink-0"
            onClick={() => handleFollowUp()}
            disabled={!followUpQuestion.trim() || isAsking}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Suggested follow-ups */}
      {isFocused && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-2 sm:space-y-3"
        >
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 sm:h-7 px-2.5 sm:px-3 text-[10px] sm:text-xs"
              onClick={() => handleFollowUp("Tell me more about the chemical compounds")}
              disabled={isAsking}
            >
              Compounds
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 sm:h-7 px-2.5 sm:px-3 text-[10px] sm:text-xs"
              onClick={() => handleFollowUp("What are the medicinal properties?")}
              disabled={isAsking}
            >
              Medicinal
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 sm:h-7 px-2.5 sm:px-3 text-[10px] sm:text-xs"
              onClick={() => handleFollowUp("How is this species cultivated?")}
              disabled={isAsking}
            >
              Cultivation
            </Button>
          </div>

          {/* Feedback */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-[10px] sm:text-xs text-muted-foreground">Helpful?</span>
            <Button
              variant={feedbackGiven === true ? "default" : "outline"}
              size="icon"
              className="h-8 w-8 sm:h-7 sm:w-7"
              onClick={() => handleFeedback(true)}
              disabled={feedbackGiven !== null}
            >
              <ThumbsUp className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
            </Button>
            <Button
              variant={feedbackGiven === false ? "destructive" : "outline"}
              size="icon"
              className="h-8 w-8 sm:h-7 sm:w-7"
              onClick={() => handleFeedback(false)}
              disabled={feedbackGiven !== null}
            >
              <ThumbsDown className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
            </Button>
            {onAddToNotepad && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-8 sm:h-7 px-2"
                onClick={() =>
                  onAddToNotepad({
                    type: "ai",
                    title: "MYCA AI Answer",
                    content: answer.text.slice(0, 200),
                    source: "MYCA",
                  })
                }
              >
                <GripVertical className="h-3 w-3 mr-0.5" />
                <span className="text-[10px] sm:text-xs">Save</span>
              </Button>
            )}
          </div>

          {/* Sources */}
          {answer.sources?.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground"
                onClick={() => setShowSources(!showSources)}
              >
                {showSources ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                <Database className="h-3 w-3 mr-1" />
                Sources ({answer.sources.length})
              </Button>
              {showSources && (
                <div className="flex flex-wrap gap-1 mt-1 pl-4">
                  {answer.sources.map((src, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{src}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

export default AIWidget
