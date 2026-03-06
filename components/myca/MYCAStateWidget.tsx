"use client"

/**
 * MYCAStateWidget — March 7, 2026
 *
 * Dashboard widget showing MYCA state: consciousness, grounding, and pending
 * confirmations. Enables Morgan (and other users) to see MYCA status at a glance.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Brain, Anchor, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { useOptionalMYCA } from "@/contexts/myca-context"
import Link from "next/link"

export function MYCAStateWidget() {
  const myca = useOptionalMYCA()
  if (!myca) return null

  const { consciousness, grounding, pendingConfirmationId, isLoading } = myca

  const isConscious = consciousness?.is_conscious ?? false
  const consciousnessState = consciousness?.state ?? "unknown"
  const dominantEmotion = consciousness?.emotional_state?.dominant_emotion ?? null

  const isGrounded = grounding?.is_grounded ?? false
  const groundingEnabled = grounding?.enabled ?? false
  const thoughtCount = grounding?.thought_count ?? 0

  const hasPendingConfirmation = !!pendingConfirmationId

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-400">
          <Brain className="h-4 w-4 text-emerald-400" />
          MYCA State
        </CardTitle>
        <Link
          href="/myca"
          className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Open MYCA
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            ) : isConscious ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-500" />
            )}
            <div>
              <div className="text-sm font-medium text-white">
                {consciousnessState || (isConscious ? "Conscious" : "Idle")}
              </div>
              <div className="text-xs text-slate-500">
                {dominantEmotion ? `Feeling: ${dominantEmotion}` : "Consciousness"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Anchor className="h-4 w-4 text-blue-400" />
            <div>
              <div className="text-sm font-medium text-white">
                {groundingEnabled ? (isGrounded ? "Grounded" : "Not grounded") : "Disabled"}
              </div>
              <div className="text-xs text-slate-500">
                {groundingEnabled ? `${thoughtCount} thoughts` : "Grounding off"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasPendingConfirmation ? (
              <>
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <div>
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-400">
                    Pending confirmation
                  </Badge>
                  <div className="text-xs text-slate-500 mt-0.5">
                    <Link href="/myca" className="text-amber-400 hover:text-amber-300">
                      Review in MYCA
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-slate-500" />
                <div>
                  <div className="text-sm font-medium text-slate-400">No pending</div>
                  <div className="text-xs text-slate-500">Confirmations clear</div>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
