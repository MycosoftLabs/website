import {
  Activity,
  Beaker,
  BookOpen,
  Bot,
  Database,
  Archive,
  LayoutDashboard,
  Layers,
  Network,
  Shield,
  Wallet,
  Waves,
} from "lucide-react"

import type { NavItem } from "./mindex-dashboard-types"

export const MINDEX_NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, color: "#8B5CF6" },
  { id: "data", label: "Data", icon: Database, color: "#10B981" },
  { id: "library", label: "Library", icon: Archive, color: "#F97316" },
  { id: "encyclopedia", label: "Encyclopedia", icon: BookOpen, color: "#22D3EE" },
  { id: "pipeline", label: "Pipeline", icon: Activity, color: "#10B981" },
  { id: "integrity", label: "Integrity", icon: Shield, color: "#F59E0B" },
  { id: "ledger", label: "Ledger", icon: Wallet, color: "#3B82F6" },
  { id: "network", label: "Network", icon: Network, color: "#06B6D4" },
  { id: "bio", label: "Bio", icon: Layers, color: "#EC4899" },
  { id: "chemistry", label: "Chemistry", icon: Beaker, color: "#84CC16" },
  { id: "mwave", label: "M-Wave", icon: Waves, color: "#F97316" },
  { id: "agents", label: "Agents", icon: Bot, color: "#6366F1" },
]
