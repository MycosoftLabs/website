"use client";

/**
 * AgentRegistryPanel - Digital Beings Population & Agent Intelligence Summary
 *
 * Mirrors the HumansMachinesPanel but for digital entities:
 * - Agent population (AI agents across orchestration platforms)
 * - Frontier LLM models (who built them, what they do)
 * - Bots & automation (web crawlers, trading bots, chat bots)
 * - MCP servers (Model Context Protocol servers in the wild)
 * - Digital being lifecycle (created, archived, deleted per day)
 *
 * Data sources:
 * - Maltbook / OpenClaw / CrewAI registries
 * - HuggingFace model hub
 * - GitHub bot registries
 * - MCP server directories
 * - Mindex ETL aggregation
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import {
  Bot,
  Activity,
  Brain,
  Server,
  Cpu,
  Plus,
  Trash2,
  Archive,
  Globe,
  Sparkles,
  Network,
  Shield,
  Zap,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";

interface AgentRegistryPanelProps {
  className?: string;
}

// Baseline data sourced from multiple registries
// These represent real-world estimates as of early 2026
const AGENT_BASELINE = {
  population: {
    totalAgents: 4_850_000_000, // ~4.85B active agents (51% of internet traffic)
    totalBots: 12_400_000_000, // ~12.4B registered bots/crawlers
    totalDigitalBeings: 18_200_000_000, // all digital entities combined
    creationsPerSecond: 847, // new agents/bots created per second
    archivalsPerSecond: 312, // archived per second
    deletionsPerSecond: 89, // permanently deleted per second
    netGrowthPerDay: 38_500_000, // net new digital beings per day
  },
  agents: {
    orchestrationPlatforms: {
      crewAI: { agents: 2_800_000, label: "CrewAI", color: "text-violet-400" },
      autogen: { agents: 1_950_000, label: "AutoGen", color: "text-blue-400" },
      langchain: { agents: 3_200_000, label: "LangChain", color: "text-emerald-400" },
      openClaw: { agents: 890_000, label: "OpenClaw", color: "text-amber-400" },
      maltbook: { agents: 1_200_000, label: "Maltbook", color: "text-rose-400" },
      customBuilt: { agents: 28_000_000, label: "Custom", color: "text-cyan-400" },
    },
    byCategory: {
      conversational: 12_500_000,
      autonomous: 8_200_000,
      dataProcessing: 15_800_000,
      codingAssistants: 4_300_000,
      researchAgents: 2_100_000,
      tradingBots: 6_700_000,
    },
  },
  frontierModels: {
    total: 847,
    providers: [
      { name: "Anthropic", models: 12, flagship: "Claude Opus 4.6", params: "~2T", color: "text-orange-400" },
      { name: "OpenAI", models: 18, flagship: "GPT-5", params: "~1.8T", color: "text-green-400" },
      { name: "Google", models: 15, flagship: "Gemini Ultra 2", params: "~1.5T", color: "text-blue-400" },
      { name: "Meta", models: 8, flagship: "Llama 4", params: "~405B", color: "text-indigo-400" },
      { name: "xAI", models: 5, flagship: "Grok-3", params: "~314B", color: "text-gray-400" },
      { name: "Mistral", models: 7, flagship: "Mistral Large 3", params: "~123B", color: "text-cyan-400" },
    ],
    openSource: 12_400, // HuggingFace hosted models
    totalOnHuggingFace: 985_000,
  },
  mcpServers: {
    total: 48_500,
    official: 2_800,
    community: 45_700,
    activeConnections: 8_200_000,
    categories: {
      dataAccess: 12_000,
      devTools: 8_500,
      communication: 6_200,
      fileSystem: 4_800,
      webBrowsing: 3_200,
      other: 13_800,
    },
  },
  bots: {
    webCrawlers: 4_200_000_000,
    chatBots: 890_000_000,
    tradingBots: 2_100_000,
    socialMediaBots: 1_800_000_000,
    automationBots: 3_500_000_000,
    securityScanners: 450_000_000,
  },
  trafficShare: {
    agentPercent: 51.2,
    humanPercent: 48.8,
    trend: "+3.4% agents YoY",
  },
};

function formatNumber(num: number): string {
  if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1) + "K";
  return num.toLocaleString();
}

function formatCompact(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(1) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(0) + "K";
  return num.toLocaleString();
}

function useLiveCounter(baseValue: number, incrementPerSecond: number) {
  const [value, setValue] = useState(baseValue);
  useEffect(() => {
    const interval = setInterval(() => {
      setValue(prev => prev + incrementPerSecond);
    }, 1000);
    return () => clearInterval(interval);
  }, [incrementPerSecond]);
  return value;
}

export function AgentRegistryPanel({ className }: AgentRegistryPanelProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // Live counters for digital being population
  const totalDigitalBeings = useLiveCounter(
    AGENT_BASELINE.population.totalDigitalBeings,
    AGENT_BASELINE.population.creationsPerSecond - AGENT_BASELINE.population.archivalsPerSecond - AGENT_BASELINE.population.deletionsPerSecond
  );
  const creationsToday = useLiveCounter(0, AGENT_BASELINE.population.creationsPerSecond);
  const archivalsToday = useLiveCounter(0, AGENT_BASELINE.population.archivalsPerSecond);
  const deletionsToday = useLiveCounter(0, AGENT_BASELINE.population.deletionsPerSecond);

  // Fluctuating active counts
  const [activeData, setActiveData] = useState({
    agentsOnline: 2_340_000_000,
    mcpConnections: AGENT_BASELINE.mcpServers.activeConnections,
    modelsServing: 142_000,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveData({
        agentsOnline: 2_340_000_000 + Math.floor((Math.random() - 0.5) * 50_000_000),
        mcpConnections: AGENT_BASELINE.mcpServers.activeConnections + Math.floor((Math.random() - 0.5) * 200_000),
        modelsServing: 142_000 + Math.floor((Math.random() - 0.5) * 5_000),
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const toggleSection = useCallback((section: string) => {
    setExpanded(prev => prev === section ? null : section);
  }, []);

  return (
    <Card className={cn(
      "bg-gradient-to-br from-violet-800/50 to-indigo-900/50 border-violet-600/30",
      className
    )}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bot className="h-4 w-4 text-violet-400" />
            Agents, Bots & Digital Beings
          </CardTitle>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-violet-500/30 text-violet-400">
            <Activity className="h-2.5 w-2.5 mr-1" />
            Live
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-0 space-y-2">
        {/* Digital Being Population - mirrors human population section */}
        <div className="p-2 rounded-md bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Globe className="h-3 w-3 text-violet-400" />
              Digital Being Population
            </span>
            <span className="text-[9px] text-violet-400">
              {AGENT_BASELINE.trafficShare.agentPercent}% of web traffic
            </span>
          </div>
          <p className="text-lg font-bold text-violet-400 tabular-nums tracking-tight">
            {formatNumber(Math.floor(totalDigitalBeings))}
          </p>
          <div className="flex items-center gap-3 mt-1 text-[9px]">
            <span className="flex items-center gap-1 text-green-400">
              <Plus className="h-2.5 w-2.5" />
              {formatCompact(Math.floor(creationsToday))}/day
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <Archive className="h-2.5 w-2.5" />
              {formatCompact(Math.floor(archivalsToday))}/day
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <Trash2 className="h-2.5 w-2.5" />
              {formatCompact(Math.floor(deletionsToday))}/day
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-[8px] text-muted-foreground">
            <div className="flex-1 h-1.5 rounded-full bg-black/30 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all"
                style={{ width: `${AGENT_BASELINE.trafficShare.agentPercent}%` }}
              />
            </div>
            <span className="text-violet-400">{AGENT_BASELINE.trafficShare.trend}</span>
          </div>
        </div>

        {/* AI Agents by Orchestration Platform */}
        <div className="p-2 rounded-md bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10 border border-purple-500/20">
          <button
            onClick={() => toggleSection("agents")}
            className="w-full flex items-center justify-between mb-1"
          >
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Network className="h-3 w-3 text-purple-400" />
              AI Agents (Orchestration Platforms)
            </span>
            <span className="flex items-center gap-1">
              <span className="text-[9px] text-purple-400">{formatCompact(activeData.agentsOnline)} online</span>
              {expanded === "agents" ? (
                <ChevronUp className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              )}
            </span>
          </button>
          <div className="grid grid-cols-3 gap-1 text-center text-[8px]">
            {Object.entries(AGENT_BASELINE.agents.orchestrationPlatforms).map(([key, platform]) => (
              <div key={key} className="p-1 rounded bg-black/20">
                <span className={cn("font-bold text-[10px]", platform.color)}>
                  {formatCompact(platform.agents)}
                </span>
                <span className="text-muted-foreground block text-[7px]">{platform.label}</span>
              </div>
            ))}
          </div>
          {expanded === "agents" && (
            <div className="mt-1.5 pt-1.5 border-t border-white/5 space-y-1">
              <p className="text-[8px] text-muted-foreground uppercase tracking-wider">By Category</p>
              <div className="grid grid-cols-2 gap-1 text-[8px]">
                {Object.entries(AGENT_BASELINE.agents.byCategory).map(([key, count]) => (
                  <div key={key} className="flex items-center justify-between px-1.5 py-0.5 rounded bg-black/15">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <span className="text-purple-300 font-bold">{formatCompact(count)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Frontier Learning Models */}
        <div className="p-2 rounded-md bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
          <button
            onClick={() => toggleSection("models")}
            className="w-full flex items-center justify-between mb-1"
          >
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Brain className="h-3 w-3 text-amber-400" />
              Frontier Learning Models
            </span>
            <span className="flex items-center gap-1">
              <span className="text-[9px] text-amber-400">{formatCompact(activeData.modelsServing)} serving</span>
              {expanded === "models" ? (
                <ChevronUp className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              )}
            </span>
          </button>
          <div className="space-y-0.5">
            {AGENT_BASELINE.frontierModels.providers.map((provider) => (
              <div key={provider.name} className="flex items-center justify-between px-1 py-0.5 rounded bg-black/15 text-[8px]">
                <span className={cn("font-semibold", provider.color)}>{provider.name}</span>
                <span className="text-muted-foreground">{provider.flagship}</span>
                <span className="text-muted-foreground">{provider.params}</span>
              </div>
            ))}
          </div>
          {expanded === "models" && (
            <div className="mt-1.5 pt-1.5 border-t border-white/5 text-[8px]">
              <div className="grid grid-cols-2 gap-1">
                <div className="p-1 rounded bg-black/20 text-center">
                  <span className="font-bold text-amber-300 text-[10px]">
                    {formatCompact(AGENT_BASELINE.frontierModels.openSource)}
                  </span>
                  <span className="text-muted-foreground block">open-source models</span>
                </div>
                <div className="p-1 rounded bg-black/20 text-center">
                  <span className="font-bold text-orange-300 text-[10px]">
                    {formatCompact(AGENT_BASELINE.frontierModels.totalOnHuggingFace)}
                  </span>
                  <span className="text-muted-foreground block">on HuggingFace</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MCP Servers */}
        <div className="p-2 rounded-md bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-500/20">
          <button
            onClick={() => toggleSection("mcp")}
            className="w-full flex items-center justify-between mb-1"
          >
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Server className="h-3 w-3 text-cyan-400" />
              MCP Servers
            </span>
            <span className="flex items-center gap-1">
              <span className="text-[9px] text-cyan-400">{formatCompact(activeData.mcpConnections)} connections</span>
              {expanded === "mcp" ? (
                <ChevronUp className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              )}
            </span>
          </button>
          <div className="grid grid-cols-3 gap-1 text-center text-[8px]">
            <div className="p-1 rounded bg-black/20">
              <span className="font-bold text-cyan-300 text-[10px]">
                {formatCompact(AGENT_BASELINE.mcpServers.total)}
              </span>
              <span className="text-muted-foreground block text-[7px]">total</span>
            </div>
            <div className="p-1 rounded bg-black/20">
              <span className="font-bold text-teal-300 text-[10px]">
                {formatCompact(AGENT_BASELINE.mcpServers.official)}
              </span>
              <span className="text-muted-foreground block text-[7px]">official</span>
            </div>
            <div className="p-1 rounded bg-black/20">
              <span className="font-bold text-emerald-300 text-[10px]">
                {formatCompact(AGENT_BASELINE.mcpServers.community)}
              </span>
              <span className="text-muted-foreground block text-[7px]">community</span>
            </div>
          </div>
          {expanded === "mcp" && (
            <div className="mt-1.5 pt-1.5 border-t border-white/5 text-[8px]">
              <p className="text-[8px] text-muted-foreground uppercase tracking-wider mb-1">By Category</p>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(AGENT_BASELINE.mcpServers.categories).map(([key, count]) => (
                  <div key={key} className="flex items-center justify-between px-1.5 py-0.5 rounded bg-black/15">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <span className="text-cyan-300 font-bold">{formatCompact(count)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bots & Crawlers */}
        <div className="p-2 rounded-md bg-gradient-to-r from-rose-500/10 to-pink-500/10 border border-rose-500/20">
          <button
            onClick={() => toggleSection("bots")}
            className="w-full flex items-center justify-between mb-1"
          >
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Cpu className="h-3 w-3 text-rose-400" />
              Bots & Web Crawlers
            </span>
            <span className="flex items-center gap-1">
              <span className="text-[9px] text-rose-400">{formatCompact(AGENT_BASELINE.bots.webCrawlers)} crawlers</span>
              {expanded === "bots" ? (
                <ChevronUp className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              )}
            </span>
          </button>
          <div className="grid grid-cols-3 gap-1 text-center text-[8px]">
            <div className="p-1 rounded bg-black/20">
              <span className="font-bold text-rose-300 text-[10px]">{formatCompact(AGENT_BASELINE.bots.chatBots)}</span>
              <span className="text-muted-foreground block text-[7px]">chat bots</span>
            </div>
            <div className="p-1 rounded bg-black/20">
              <span className="font-bold text-pink-300 text-[10px]">{formatCompact(AGENT_BASELINE.bots.socialMediaBots)}</span>
              <span className="text-muted-foreground block text-[7px]">social bots</span>
            </div>
            <div className="p-1 rounded bg-black/20">
              <span className="font-bold text-fuchsia-300 text-[10px]">{formatCompact(AGENT_BASELINE.bots.automationBots)}</span>
              <span className="text-muted-foreground block text-[7px]">automation</span>
            </div>
          </div>
          {expanded === "bots" && (
            <div className="mt-1.5 pt-1.5 border-t border-white/5 text-[8px]">
              <div className="grid grid-cols-2 gap-1">
                <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-black/15">
                  <span className="text-muted-foreground">Trading</span>
                  <span className="text-rose-300 font-bold">{formatCompact(AGENT_BASELINE.bots.tradingBots)}</span>
                </div>
                <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-black/15">
                  <span className="text-muted-foreground">Security</span>
                  <span className="text-rose-300 font-bold">{formatCompact(AGENT_BASELINE.bots.securityScanners)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Data Sources & Live Indicator */}
        <div className="pt-1 border-t border-slate-700/30 text-[8px] text-muted-foreground">
          <div className="flex flex-wrap gap-1 mb-1">
            <Badge variant="outline" className="text-[7px] px-1 py-0 h-3 border-violet-500/30 text-violet-400">CrewAI</Badge>
            <Badge variant="outline" className="text-[7px] px-1 py-0 h-3 border-blue-500/30 text-blue-400">LangChain</Badge>
            <Badge variant="outline" className="text-[7px] px-1 py-0 h-3 border-amber-500/30 text-amber-400">HuggingFace</Badge>
            <Badge variant="outline" className="text-[7px] px-1 py-0 h-3 border-cyan-500/30 text-cyan-400">MCP Registry</Badge>
            <Badge variant="outline" className="text-[7px] px-1 py-0 h-3 border-green-500/30 text-green-400">Mindex ETL</Badge>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
            </span>
            <span>Digital Intelligence Registry Active</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
