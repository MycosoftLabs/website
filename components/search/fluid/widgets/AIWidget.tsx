/**
 * AIWidget - Feb 2026
 * 
 * AI conversation widget with:
 * - MYCA Brain responses
 * - Confidence indicators
 * - Source citations
 * - Follow-up suggestions
 */

"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Sparkles, 
  Send,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface AIAnswer {
  text: string
  confidence: number
  sources: string[]
}

interface AIWidgetProps {
  answer: AIAnswer
  isFocused: boolean
  onFollowUp?: (question: string) => void
  onFeedback?: (positive: boolean) => void
  className?: string
}

export function AIWidget({ 
  answer, 
  isFocused,
  onFollowUp,
  onFeedback,
  className,
}: AIWidgetProps) {
  const [followUpQuestion, setFollowUpQuestion] = useState("")
  const [showSources, setShowSources] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null)

  const handleFollowUp = () => {
    if (followUpQuestion.trim() && onFollowUp) {
      onFollowUp(followUpQuestion)
      setFollowUpQuestion("")
    }
  }

  const handleFeedback = (positive: boolean) => {
    setFeedbackGiven(positive)
    onFeedback?.(positive)
  }

  const confidenceColor = answer.confidence >= 0.8 
    ? "text-green-500" 
    : answer.confidence >= 0.5 
      ? "text-yellow-500" 
      : "text-red-500"

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-lg shrink-0">
          <Sparkles className="h-5 w-5 text-violet-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">MYCA AI</h3>
            <Badge 
              variant="outline" 
              className={cn("text-xs", confidenceColor)}
            >
              {Math.round(answer.confidence * 100)}% confident
            </Badge>
          </div>
        </div>
      </div>

      {/* Answer text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm leading-relaxed"
      >
        {answer.text}
      </motion.div>

      {/* Focused view - expanded features */}
      {isFocused && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4"
        >
          {/* Sources */}
          {answer.sources && answer.sources.length > 0 && (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setShowSources(!showSources)}
              >
                {showSources ? (
                  <ChevronUp className="h-3 w-3 mr-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 mr-1" />
                )}
                {answer.sources.length} sources
              </Button>
              
              {showSources && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="pl-4 border-l-2 border-muted space-y-1"
                >
                  {answer.sources.map((source, index) => (
                    <p key={index} className="text-xs text-muted-foreground">
                      {source}
                    </p>
                  ))}
                </motion.div>
              )}
            </div>
          )}

          {/* Feedback buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Was this helpful?</span>
            <Button
              variant={feedbackGiven === true ? "default" : "outline"}
              size="icon"
              className="h-7 w-7"
              onClick={() => handleFeedback(true)}
              disabled={feedbackGiven !== null}
            >
              <ThumbsUp className="h-3 w-3" />
            </Button>
            <Button
              variant={feedbackGiven === false ? "destructive" : "outline"}
              size="icon"
              className="h-7 w-7"
              onClick={() => handleFeedback(false)}
              disabled={feedbackGiven !== null}
            >
              <ThumbsDown className="h-3 w-3" />
            </Button>
          </div>

          {/* Follow-up question */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Ask a follow-up question
            </h4>
            <div className="flex gap-2">
              <Input
                value={followUpQuestion}
                onChange={(e) => setFollowUpQuestion(e.target.value)}
                placeholder="Type your question..."
                className="text-sm h-9"
                onKeyDown={(e) => e.key === "Enter" && handleFollowUp()}
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={handleFollowUp}
                disabled={!followUpQuestion.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Suggested follow-ups */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => onFollowUp?.("Tell me more about the chemical compounds")}
            >
              More about compounds
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => onFollowUp?.("What are the medicinal properties?")}
            >
              Medicinal properties
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => onFollowUp?.("How is this species cultivated?")}
            >
              Cultivation info
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default AIWidget
