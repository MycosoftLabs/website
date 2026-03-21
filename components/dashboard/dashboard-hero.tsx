"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { motion } from "framer-motion"
import {
  Globe, Database, Cpu, Brain, Activity, Shield,
  TrendingUp, Leaf, FlaskConical, Building2, Clock
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface DashboardHeroProps {
  displayName: string
  isSuperAdmin: boolean
}

const capabilities = [
  { icon: Globe, label: "Environmental Monitoring", color: "text-emerald-400", borderColor: "border-emerald-500/30" },
  { icon: Database, label: "Species Intelligence (MINDEX)", color: "text-blue-400", borderColor: "border-blue-500/30" },
  { icon: Cpu, label: "Device Fleet (MycoBrain)", color: "text-purple-400", borderColor: "border-purple-500/30" },
  { icon: Brain, label: "AI Agents (MYCA)", color: "text-amber-400", borderColor: "border-amber-500/30" },
  { icon: Activity, label: "Earth Simulation (CREP)", color: "text-red-400", borderColor: "border-red-500/30" },
  { icon: Shield, label: "Biosecurity & Defense", color: "text-teal-400", borderColor: "border-teal-500/30" },
]

const sectors = [
  {
    icon: Building2,
    name: "Business & Enterprise",
    color: "text-emerald-400",
    borderColor: "border-l-emerald-500",
    description: "Environmental risk monitoring, compliance reporting, and supply chain intelligence powered by real-time nature data.",
  },
  {
    icon: Shield,
    name: "Military & Defense",
    color: "text-red-400",
    borderColor: "border-l-red-500",
    description: "Operational environmental intelligence, biosurveillance, and critical infrastructure monitoring across all domains.",
  },
  {
    icon: FlaskConical,
    name: "Pharmacies & Biotech",
    color: "text-purple-400",
    borderColor: "border-l-purple-500",
    description: "Compound analysis, species identification, medicinal fungi research, and genomic data for drug discovery.",
  },
  {
    icon: Leaf,
    name: "Farms & Agriculture",
    color: "text-green-400",
    borderColor: "border-l-green-500",
    description: "Plant pathogen surveillance, soil health monitoring, fungal bloom alerts, and crop protection intelligence.",
  },
  {
    icon: FlaskConical,
    name: "Scientists & Researchers",
    color: "text-blue-400",
    borderColor: "border-l-blue-500",
    description: "Mycological studies, genomics, biological computing, experiment tracking, and access to the MINDEX species database.",
  },
  {
    icon: Globe,
    name: "Government & Agencies",
    color: "text-teal-400",
    borderColor: "border-l-teal-500",
    description: "Environmental compliance, disaster response coordination, ecological monitoring, and public health biosurveillance.",
  },
]

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

const staggerContainerSlow = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
}

export function DashboardHero({ displayName, isSuperAdmin }: DashboardHeroProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 sm:p-8">
        {/* Date & Time */}
        <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
          <Clock className="w-4 h-4" />
          <time dateTime={now.toISOString()}>
            {format(now, "EEEE, MMMM d, yyyy 'at' h:mm a")}
          </time>
        </div>

        {/* Branding */}
        <div className="flex items-center gap-3 mb-3">
          <Globe className="w-8 h-8 text-emerald-400 shrink-0" />
          <h2 className="text-2xl sm:text-3xl font-bold text-white">NatureOS</h2>
          <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 text-xs">
            Cloud OS
          </Badge>
        </div>

        {/* Tagline */}
        <motion.p
          className="text-xl sm:text-2xl font-semibold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          All Nature Data in One Single Place
        </motion.p>

        {/* Description */}
        <p className="text-slate-300 leading-relaxed max-w-4xl">
          NatureOS is Mycosoft&apos;s environmental operating system — your unified command center for real-time planetary events, living systems, sensor fleets, and AI-driven action. Monitor earthquakes, weather systems, wildfires, volcanic activity, air, soil, biodiversity, spores, and mycelial networks; manage IoT devices, lab infrastructure, robotics, and autonomous agents; and turn raw environmental and biological signals into a live, queryable model of the world. From biosurveillance and ecological forecasting to precision agriculture, remediation, and autonomous science, NatureOS transforms nature data into actionable intelligence.
        </p>

        {isSuperAdmin && (
          <p className="text-slate-400 text-sm mt-3">
            As Super Admin, you have full platform oversight.{" "}
            <Link href="/admin" className="text-amber-400 hover:text-amber-300 underline">
              Open Admin Control Center
            </Link>
          </p>
        )}
      </div>

      {/* Platform Capabilities */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">
          Platform Capabilities
        </h3>
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {capabilities.map((cap) => {
            const Icon = cap.icon
            return (
              <motion.div
                key={cap.label}
                variants={fadeUp}
                className={`flex items-center gap-2 px-3 py-2.5 bg-slate-800/50 rounded-lg border border-slate-700 ${cap.borderColor}`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${cap.color}`} />
                <span className="text-xs text-slate-300 font-medium leading-tight">{cap.label}</span>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {/* Sector Use Cases */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">
          Who NatureOS Serves
        </h3>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={staggerContainerSlow}
          initial="hidden"
          animate="visible"
        >
          {sectors.map((sector) => {
            const Icon = sector.icon
            return (
              <motion.div key={sector.name} variants={fadeUp}>
                <Card className={`bg-slate-800/50 border-slate-700 border-l-2 ${sector.borderColor} h-full`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base text-white">
                      <Icon className={`w-5 h-5 ${sector.color}`} />
                      {sector.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-400 leading-relaxed">{sector.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </motion.div>
  )
}
