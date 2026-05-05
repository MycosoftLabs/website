"use client"

import { motion } from "framer-motion"
import { Container, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GlassCard, GlowingStatus } from "@/components/ui/glowing-border"

import type { DockerContainer } from "./mindex-dashboard-types"

export function ContainersSection({
  containers,
  fetchContainers,
}: {
  containers: DockerContainer[]
  fetchContainers: () => void
}) {
  return (
    <div className="space-y-6">
      <GlassCard color="cyan">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Container className="h-5 w-5 text-cyan-400" />
            MINDEX Docker Containers
          </h3>
          <Button variant="outline" size="sm" onClick={fetchContainers} className="border-cyan-500/30 text-cyan-300">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="space-y-3">
          {containers.map((container, i) => (
            <motion.div
              key={container.id}
              className="flex items-center justify-between p-4 rounded-lg bg-white/5"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex items-center gap-3">
                <GlowingStatus status={container.status === "running" ? "online" : "offline"} size={10} />
                <div>
                  <div className="font-medium text-white">{container.name}</div>
                  <div className="text-sm text-gray-500">{container.image}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  className={`${
                    container.status === "running" ? "bg-green-500/20 text-green-300" : "bg-gray-500/20 text-gray-300"
                  } border-none`}
                >
                  {container.status}
                </Badge>
                {container.ports.length > 0 ? (
                  <span className="text-xs text-gray-500 font-mono">{container.ports.join(", ")}</span>
                ) : null}
              </div>
            </motion.div>
          ))}

          {containers.length === 0 ? (
            <div className="text-center py-12">
              <Container className="h-12 w-12 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400 mb-2">No MINDEX containers found</p>
              <code className="text-xs text-gray-500 bg-black/40 px-3 py-2 rounded block max-w-md mx-auto">
                docker-compose -f docker-compose.mindex.yml up -d
              </code>
            </div>
          ) : null}
        </div>
      </GlassCard>
    </div>
  )
}
