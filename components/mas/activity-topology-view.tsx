"use client"

/**
 * Activity (Circulatory) Topology View – Pipeline 3D
 * Uses PipelineTopology3D: same stack as Agent Topology (flow, particles). Frontend → APIs → Infrastructure.
 */

import type { ActivityNode } from "./topology/activity-types"
import { PipelineTopology3D } from "./topology/pipeline-topology-3d"

interface ActivityTopologyViewProps {
  className?: string
  onNodeClick?: (node: ActivityNode) => void
}

export function ActivityTopologyView({ className, onNodeClick }: ActivityTopologyViewProps) {
  return <PipelineTopology3D className={className} onNodeClick={onNodeClick} />
}
