"use client"

/**
 * Incident Overlay Component
 * Displays security incidents and causality chains on the topology
 */

import { useState, useCallback, useMemo } from "react"
import {
  AlertTriangle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Activity,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Clock,
  Zap,
  GitBranch,
  X,
} from "lucide-react"
import type { TopologyIncident, TopologyNode, CausalityLink, IncidentSeverity, IncidentStatus } from "./types"

// Severity colors
const SEVERITY_COLORS: Record<IncidentSeverity, { bg: string; border: string; text: string; glow: string }> = {
  critical: { bg: "bg-red-950", border: "border-red-500", text: "text-red-400", glow: "shadow-red-500/50" },
  high: { bg: "bg-orange-950", border: "border-orange-500", text: "text-orange-400", glow: "shadow-orange-500/50" },
  medium: { bg: "bg-yellow-950", border: "border-yellow-500", text: "text-yellow-400", glow: "shadow-yellow-500/50" },
  low: { bg: "bg-blue-950", border: "border-blue-500", text: "text-blue-400", glow: "shadow-blue-500/50" },
  info: { bg: "bg-slate-800", border: "border-slate-500", text: "text-slate-400", glow: "" },
}

// Status icons
const STATUS_ICONS: Record<IncidentStatus, typeof Shield> = {
  active: ShieldAlert,
  investigating: Activity,
  resolved: ShieldCheck,
  ignored: Shield,
}

interface IncidentOverlayProps {
  incidents: TopologyIncident[]
  predictions: TopologyIncident[]
  nodes: TopologyNode[]
  onNodeHighlight: (nodeIds: string[]) => void
  onNodeSelect: (nodeId: string) => void
  onIncidentResolve?: (incidentId: string) => Promise<void>
  className?: string
}

export function IncidentOverlay({
  incidents,
  predictions,
  nodes,
  onNodeHighlight,
  onNodeSelect,
  onIncidentResolve,
  className = "",
}: IncidentOverlayProps) {
  const [expandedIncidentId, setExpandedIncidentId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"active" | "predictions">("active")
  const [isMinimized, setIsMinimized] = useState(false)

  // Group incidents by severity
  const incidentsBySeverity = useMemo(() => {
    const grouped: Record<IncidentSeverity, TopologyIncident[]> = {
      critical: [],
      high: [],
      medium: [],
      low: [],
      info: [],
    }
    incidents.forEach((inc) => {
      grouped[inc.severity].push(inc)
    })
    return grouped
  }, [incidents])

  // Get node name by ID
  const getNodeName = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId)
      return node?.shortName || nodeId
    },
    [nodes]
  )

  // Handle incident click
  const handleIncidentClick = useCallback(
    (incident: TopologyIncident) => {
      if (expandedIncidentId === incident.id) {
        setExpandedIncidentId(null)
        onNodeHighlight([])
      } else {
        setExpandedIncidentId(incident.id)
        onNodeHighlight(incident.affectedNodeIds)
      }
    },
    [expandedIncidentId, onNodeHighlight]
  )

  // Render causality chain
  const renderCausalityChain = (chain: CausalityLink[]) => (
    <div className="mt-3 p-2 bg-black/40 rounded border border-white/10">
      <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
        <GitBranch className="h-3 w-3" />
        <span>Causality Chain</span>
      </div>
      <div className="space-y-1">
        {chain.map((link, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <button
              onClick={() => onNodeSelect(link.fromNodeId)}
              className="text-cyan-400 hover:text-cyan-300 hover:underline"
            >
              {getNodeName(link.fromNodeId)}
            </button>
            <span className="text-gray-500">→</span>
            <button
              onClick={() => onNodeSelect(link.toNodeId)}
              className="text-cyan-400 hover:text-cyan-300 hover:underline"
            >
              {getNodeName(link.toNodeId)}
            </button>
            <span className={`ml-auto ${link.probability > 0.7 ? "text-red-400" : link.probability > 0.4 ? "text-yellow-400" : "text-gray-500"}`}>
              {(link.probability * 100).toFixed(0)}%
            </span>
            <span className="text-gray-600 text-[10px]">{link.impactType}</span>
          </div>
        ))}
      </div>
    </div>
  )

  // Render single incident
  const renderIncident = (incident: TopologyIncident, isPrediction = false) => {
    const colors = SEVERITY_COLORS[incident.severity]
    const StatusIcon = STATUS_ICONS[incident.status]
    const isExpanded = expandedIncidentId === incident.id

    return (
      <div
        key={incident.id}
        className={`
          ${colors.bg} ${colors.border} border rounded-lg p-3 cursor-pointer
          transition-all duration-200 hover:brightness-110
          ${isExpanded ? `shadow-lg ${colors.glow}` : ""}
          ${isPrediction ? "opacity-80 border-dashed" : ""}
        `}
        onClick={() => handleIncidentClick(incident)}
      >
        {/* Header */}
        <div className="flex items-start gap-2">
          <StatusIcon className={`h-4 w-4 mt-0.5 ${colors.text}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-medium text-sm ${colors.text}`}>
                {incident.severity.toUpperCase()}
              </span>
              {isPrediction && (
                <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/30 text-purple-300 rounded">
                  PREDICTED
                </span>
              )}
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 ml-auto text-gray-400" />
              ) : (
                <ChevronRight className="h-3 w-3 ml-auto text-gray-400" />
              )}
            </div>
            <h4 className="text-white text-sm font-medium truncate mt-1">
              {incident.title}
            </h4>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-3 space-y-3">
            <p className="text-gray-300 text-xs">{incident.description}</p>

            {/* Affected nodes */}
            <div className="flex flex-wrap gap-1">
              {incident.affectedNodeIds.slice(0, 5).map((nodeId) => (
                <button
                  key={nodeId}
                  onClick={(e) => {
                    e.stopPropagation()
                    onNodeSelect(nodeId)
                  }}
                  className="text-[10px] px-1.5 py-0.5 bg-white/10 hover:bg-white/20 text-gray-300 rounded transition-colors"
                >
                  {getNodeName(nodeId)}
                </button>
              ))}
              {incident.affectedNodeIds.length > 5 && (
                <span className="text-[10px] px-1.5 py-0.5 text-gray-500">
                  +{incident.affectedNodeIds.length - 5} more
                </span>
              )}
            </div>

            {/* Causality chain */}
            {incident.causalityChain && incident.causalityChain.length > 0 && (
              renderCausalityChain(incident.causalityChain)
            )}

            {/* Confidence (for predictions) */}
            {isPrediction && (
              <div className="flex items-center gap-2 text-xs">
                <Zap className="h-3 w-3 text-purple-400" />
                <span className="text-gray-400">Confidence:</span>
                <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${incident.confidence * 100}%` }}
                  />
                </div>
                <span className="text-purple-400">{(incident.confidence * 100).toFixed(0)}%</span>
              </div>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-4 text-[10px] text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{new Date(incident.detectedAt).toLocaleTimeString()}</span>
              </div>
              {incident.resolverAgentId && (
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-green-500" />
                  <span className="text-green-400">{getNodeName(incident.resolverAgentId)}</span>
                </div>
              )}
            </div>

            {/* Playbook */}
            {incident.playbook && (
              <div className="p-2 bg-blue-950/50 border border-blue-500/30 rounded text-xs">
                <div className="flex items-center gap-1 text-blue-400 mb-1">
                  <Shield className="h-3 w-3" />
                  <span>Recommended Playbook</span>
                </div>
                <p className="text-gray-300">{incident.playbook}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              {onIncidentResolve && incident.status !== "resolved" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onIncidentResolve(incident.id)
                  }}
                  className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition-colors"
                >
                  Mark Resolved
                </button>
              )}
              <a
                href={`/security/incidents/${incident.id}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
              >
                <span>Details</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Count badges
  const criticalCount = incidentsBySeverity.critical.length
  const highCount = incidentsBySeverity.high.length

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className={`
          fixed top-20 right-4 z-50 flex items-center gap-2 
          px-3 py-2 bg-slate-900/95 backdrop-blur-md rounded-lg 
          border border-white/10 hover:border-white/20 transition-colors
          ${className}
        `}
      >
        <AlertTriangle className={criticalCount > 0 ? "h-4 w-4 text-red-500 animate-pulse" : "h-4 w-4 text-yellow-500"} />
        <span className="text-white text-sm font-medium">
          {incidents.length} Incidents
        </span>
        {criticalCount > 0 && (
          <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-bold">
            {criticalCount}
          </span>
        )}
      </button>
    )
  }

  return (
    <div
      className={`
        fixed top-20 right-4 z-50 w-80 max-h-[70vh] 
        bg-slate-900/95 backdrop-blur-md rounded-lg 
        border border-white/10 shadow-2xl overflow-hidden
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <AlertTriangle className={criticalCount > 0 ? "h-5 w-5 text-red-500 animate-pulse" : "h-5 w-5 text-yellow-500"} />
          <h3 className="text-white font-semibold">Security Incidents</h3>
        </div>
        <div className="flex items-center gap-1">
          {criticalCount > 0 && (
            <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-bold">
              {criticalCount}
            </span>
          )}
          {highCount > 0 && (
            <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[10px] rounded-full font-bold">
              {highCount}
            </span>
          )}
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-white/10 rounded transition-colors ml-2"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab("active")}
          className={`
            flex-1 px-4 py-2 text-sm font-medium transition-colors
            ${activeTab === "active" ? "text-white border-b-2 border-cyan-500" : "text-gray-400 hover:text-white"}
          `}
        >
          Active ({incidents.length})
        </button>
        <button
          onClick={() => setActiveTab("predictions")}
          className={`
            flex-1 px-4 py-2 text-sm font-medium transition-colors
            ${activeTab === "predictions" ? "text-white border-b-2 border-purple-500" : "text-gray-400 hover:text-white"}
          `}
        >
          Predicted ({predictions.length})
        </button>
      </div>

      {/* Content */}
      <div className="p-3 overflow-y-auto max-h-[calc(70vh-120px)] space-y-2">
        {activeTab === "active" ? (
          incidents.length > 0 ? (
            <>
              {incidentsBySeverity.critical.map((inc) => renderIncident(inc))}
              {incidentsBySeverity.high.map((inc) => renderIncident(inc))}
              {incidentsBySeverity.medium.map((inc) => renderIncident(inc))}
              {incidentsBySeverity.low.map((inc) => renderIncident(inc))}
              {incidentsBySeverity.info.map((inc) => renderIncident(inc))}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-sm">No active incidents</p>
            </div>
          )
        ) : predictions.length > 0 ? (
          predictions.map((pred) => renderIncident(pred, true))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <p className="text-sm">No predicted incidents</p>
          </div>
        )}
      </div>
    </div>
  )
}
