"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Activity,
  TrendingUp,
  Clock,
} from "lucide-react"

// ============================================================================
// TYPES
// ============================================================================

interface PatternOccurrence {
  pattern_name: string
  pattern_category: string
  occurrence_count: number
  avg_confidence: number
  first_seen: string
  last_seen: string
}

interface FCIPatternChartProps {
  data: PatternOccurrence[]
  deviceId: string
  hours: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PATTERN_COLORS: Record<string, string> = {
  baseline: "#6B7280",
  active_growth: "#22C55E",
  nutrient_seeking: "#06B6D4",
  temperature_stress: "#F97316",
  moisture_stress: "#EAB308",
  chemical_stress: "#EF4444",
  network_communication: "#A855F7",
  action_potential: "#EC4899",
  seismic_precursor: "#3B82F6",
  defense_activation: "#DC2626",
  sporulation_initiation: "#F59E0B",
}

const CATEGORY_COLORS: Record<string, string> = {
  metabolic: "#22C55E",
  environmental: "#F97316",
  communication: "#A855F7",
  defensive: "#EF4444",
  reproductive: "#F59E0B",
  predictive: "#3B82F6",
  anomalous: "#6B7280",
}

// ============================================================================
// MINI BAR CHART
// ============================================================================

function PatternBarChart({ data }: { data: PatternOccurrence[] }) {
  const maxCount = Math.max(...data.map(d => d.occurrence_count), 1)
  
  return (
    <div className="space-y-2">
      {data.slice(0, 8).map((item) => (
        <div key={item.pattern_name} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="capitalize text-gray-300">
              {item.pattern_name.replace(/_/g, " ")}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">{item.occurrence_count}</span>
              <Badge 
                variant="outline" 
                className="text-xs"
                style={{ 
                  borderColor: PATTERN_COLORS[item.pattern_name] || "#6B7280",
                  color: PATTERN_COLORS[item.pattern_name] || "#6B7280",
                }}
              >
                {(item.avg_confidence * 100).toFixed(0)}%
              </Badge>
            </div>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${(item.occurrence_count / maxCount) * 100}%`,
                backgroundColor: PATTERN_COLORS[item.pattern_name] || "#6B7280",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// CATEGORY PIE CHART (simplified)
// ============================================================================

function CategoryBreakdown({ data }: { data: PatternOccurrence[] }) {
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    data.forEach(item => {
      const cat = item.pattern_category
      totals[cat] = (totals[cat] || 0) + item.occurrence_count
    })
    return Object.entries(totals).sort((a, b) => b[1] - a[1])
  }, [data])
  
  const total = categoryTotals.reduce((sum, [, count]) => sum + count, 0)
  
  return (
    <div className="space-y-2">
      {categoryTotals.map(([category, count]) => (
        <div key={category} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[category] || "#6B7280" }}
            />
            <span className="text-sm capitalize text-gray-300">{category}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{count}</span>
            <span className="text-xs text-gray-500">
              ({((count / total) * 100).toFixed(0)}%)
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// TIMELINE
// ============================================================================

function PatternTimeline({ data }: { data: PatternOccurrence[] }) {
  // Sort by last_seen
  const sorted = useMemo(() => 
    [...data].sort((a, b) => 
      new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime()
    ).slice(0, 5),
    [data]
  )
  
  return (
    <div className="space-y-3">
      {sorted.map((item) => (
        <div 
          key={item.pattern_name}
          className="flex items-start gap-3 p-2 rounded-lg bg-slate-800/30"
        >
          <div 
            className="w-2 h-2 rounded-full mt-1.5 shrink-0"
            style={{ backgroundColor: PATTERN_COLORS[item.pattern_name] || "#6B7280" }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium capitalize text-gray-200">
              {item.pattern_name.replace(/_/g, " ")}
            </p>
            <p className="text-xs text-gray-400">
              Last: {new Date(item.last_seen).toLocaleTimeString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-cyan-400">{item.occurrence_count}×</p>
            <p className="text-xs text-gray-500">
              {(item.avg_confidence * 100).toFixed(0)}% avg
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FCIPatternChart({ data, deviceId, hours }: FCIPatternChartProps) {
  const totalOccurrences = data.reduce((sum, d) => sum + d.occurrence_count, 0)
  const avgConfidence = data.length > 0
    ? data.reduce((sum, d) => sum + d.avg_confidence * d.occurrence_count, 0) / totalOccurrences
    : 0
  
  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-400" />
            Pattern Analysis
          </span>
          <Badge variant="outline" className="text-xs">
            Last {hours}h
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-800/30 rounded p-2">
            <TrendingUp className="h-4 w-4 text-cyan-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-cyan-400">{totalOccurrences}</p>
            <p className="text-xs text-gray-400">Total Patterns</p>
          </div>
          <div className="bg-slate-800/30 rounded p-2">
            <Activity className="h-4 w-4 text-purple-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-purple-400">{data.length}</p>
            <p className="text-xs text-gray-400">Unique Types</p>
          </div>
          <div className="bg-slate-800/30 rounded p-2">
            <Clock className="h-4 w-4 text-green-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-400">
              {(avgConfidence * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-gray-400">Avg Confidence</p>
          </div>
        </div>
        
        {data.length > 0 ? (
          <>
            {/* Pattern Distribution */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">
                Pattern Distribution
              </h4>
              <PatternBarChart data={data} />
            </div>
            
            {/* Category Breakdown */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">
                By Category
              </h4>
              <CategoryBreakdown data={data} />
            </div>
            
            {/* Recent Timeline */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">
                Recent Activity
              </h4>
              <PatternTimeline data={data} />
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No patterns detected</p>
            <p className="text-xs">Check device connection and signal quality</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default FCIPatternChart
