"use client"

interface GradeResult {
  score: number
  letter_grade: string
  rubric_breakdown?: Record<string, number>
  strengths?: string[]
  weaknesses?: string[]
  observer_notes?: string
}

interface GradeCardProps {
  grade: GradeResult
  title?: string
}

const GRADE_COLORS: Record<string, string> = {
  A: "text-green-400",
  B: "text-green-300",
  C: "text-amber-400",
  D: "text-orange-400",
  F: "text-red-400",
}

export function GradeCard({ grade, title }: GradeCardProps) {
  const letterColor = GRADE_COLORS[grade.letter_grade?.[0] ?? "C"] ?? "text-gray-400"
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
      {title && (
        <h3 className="text-sm font-medium text-gray-400 mb-2">{title}</h3>
      )}
      <div className="flex items-baseline gap-2 mb-2">
        <span className={`text-2xl font-bold ${letterColor}`}>
          {grade.letter_grade ?? "—"}
        </span>
        <span className="text-gray-500 text-sm">{grade.score}/100</span>
      </div>
      {grade.rubric_breakdown && Object.keys(grade.rubric_breakdown).length > 0 && (
        <div className="text-xs text-gray-500 space-y-1 mb-2">
          {Object.entries(grade.rubric_breakdown).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span>{k}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>
      )}
      {grade.strengths?.length ? (
        <p className="text-xs text-green-400/80 mb-1">Strengths: {grade.strengths.join("; ")}</p>
      ) : null}
      {grade.weaknesses?.length ? (
        <p className="text-xs text-amber-400/80 mb-1">Weaknesses: {grade.weaknesses.join("; ")}</p>
      ) : null}
      {grade.observer_notes && (
        <p className="text-xs text-gray-500 mt-1">{grade.observer_notes}</p>
      )}
    </div>
  )
}
