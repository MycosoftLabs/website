import { NextResponse } from "next/server"

/**
 * Returns a list of all known n8n workflows in the MAS repository
 * This provides visibility into workflows even when n8n isn't running
 */

interface WorkflowInfo {
  id: string
  name: string
  description: string
  category: "myca" | "native" | "ops" | "speech" | "defense" | "other"
  file: string
  active?: boolean
}

const KNOWN_WORKFLOWS: WorkflowInfo[] = [
  // MYCA Core Workflows
  { id: "01", name: "MYCA Command API", description: "Main MYCA command interface", category: "myca", file: "01_myca_command_api.json" },
  { id: "01b", name: "MYCA Event Intake", description: "Event ingestion for MYCA", category: "myca", file: "01b_myca_event_intake.json" },
  { id: "02", name: "Router Integration Dispatch", description: "Routes requests to appropriate integrations", category: "myca", file: "02_router_integration_dispatch.json" },
  
  // Native Integrations
  { id: "03", name: "Native AI", description: "AI model integrations (OpenAI, Anthropic)", category: "native", file: "03_native_ai.json" },
  { id: "04", name: "Native Comms", description: "Communication integrations (Email, SMS, Slack)", category: "native", file: "04_native_comms.json" },
  { id: "05", name: "Native DevTools", description: "Developer tools (GitHub, GitLab)", category: "native", file: "05_native_devtools.json" },
  { id: "06", name: "Native Data Storage", description: "Data storage integrations", category: "native", file: "06_native_data_storage.json" },
  { id: "07", name: "Native Finance", description: "Financial integrations", category: "native", file: "07_native_finance.json" },
  { id: "08", name: "Native Productivity", description: "Productivity tools (Notion, Calendar)", category: "native", file: "08_native_productivity.json" },
  { id: "09", name: "Native Utility", description: "Utility integrations", category: "native", file: "09_native_utility.json" },
  { id: "10", name: "Native Security", description: "Security integrations", category: "native", file: "10_native_security.json" },
  { id: "11", name: "Native Space Weather", description: "Space weather data integration", category: "native", file: "11_native_space_weather.json" },
  { id: "12", name: "Native Environmental", description: "Environmental data integration", category: "native", file: "12_native_environmental.json" },
  { id: "13", name: "Generic Connector", description: "Generic HTTP connector", category: "native", file: "13_generic_connector.json" },
  { id: "14", name: "Audit Logger", description: "Centralized audit logging", category: "native", file: "14_audit_logger.json" },
  { id: "15", name: "Native Earth Science", description: "Earth science data integration", category: "native", file: "15_native_earth_science.json" },
  { id: "16", name: "Native Analytics", description: "Analytics integrations", category: "native", file: "16_native_analytics.json" },
  { id: "17", name: "Native Automation", description: "Automation integrations", category: "native", file: "17_native_automation.json" },
  
  // Operations Workflows
  { id: "20", name: "Ops: Proxmox", description: "Proxmox VM management", category: "ops", file: "20_ops_proxmox.json" },
  { id: "21", name: "Ops: UniFi", description: "UniFi network management", category: "ops", file: "21_ops_unifi.json" },
  { id: "22", name: "Ops: NAS Health", description: "NAS health monitoring", category: "ops", file: "22_ops_nas_health.json" },
  { id: "23", name: "Ops: GPU Job", description: "GPU job management", category: "ops", file: "23_ops_gpu_job.json" },
  { id: "24", name: "Ops: UART Ingest", description: "UART data ingestion", category: "ops", file: "24_ops_uart_ingest.json" },
  
  // Defense Workflows
  { id: "30", name: "Defense Connector", description: "Defense and OEI integrations", category: "defense", file: "30_defense_connector.json" },
  
  // MYCA Agent Workflows
  { id: "myca-brain", name: "MYCA Master Brain", description: "Core MYCA intelligence", category: "myca", file: "myca-master-brain.json" },
  { id: "myca-router", name: "MYCA Agent Router", description: "Routes MYCA agent requests", category: "myca", file: "myca-agent-router.json" },
  { id: "myca-tools", name: "MYCA Tools Hub", description: "MYCA tool orchestration", category: "myca", file: "myca-tools-hub.json" },
  { id: "myca-orch", name: "MYCA Orchestrator", description: "MYCA workflow orchestration", category: "myca", file: "myca-orchestrator.json" },
  { id: "myca-jarvis", name: "MYCA Jarvis Unified", description: "Unified assistant interface", category: "myca", file: "myca-jarvis-unified.json" },
  { id: "myca-monitor", name: "MYCA Proactive Monitor", description: "System monitoring", category: "myca", file: "myca-proactive-monitor.json" },
  { id: "myca-system", name: "MYCA System Control", description: "System control operations", category: "myca", file: "myca-system-control.json" },
  { id: "myca-biz", name: "MYCA Business Ops", description: "Business operations", category: "myca", file: "myca-business-ops.json" },
  
  // Speech Workflows
  { id: "speech-complete", name: "MYCA Speech Complete", description: "Full speech pipeline", category: "speech", file: "myca-speech-complete.json" },
  { id: "speech-v2", name: "Speech Interface v2", description: "Updated speech interface", category: "speech", file: "speech-interface-v2.json" },
  { id: "speech-tts", name: "Text to Speech", description: "TTS only workflow", category: "speech", file: "speech-text-to-speech.json" },
  { id: "speech-trans", name: "Transcribe Only", description: "Speech transcription", category: "speech", file: "speech-transcribe-only.json" },
  { id: "text-chat", name: "Text Chat", description: "Text chat workflow", category: "other", file: "text-chat-workflow.json" },
  { id: "voice-chat", name: "Voice Chat", description: "Voice chat workflow", category: "speech", file: "voice-chat-workflow.json" },
]

export async function GET() {
  // Group workflows by category
  const byCategory = KNOWN_WORKFLOWS.reduce((acc, wf) => {
    if (!acc[wf.category]) acc[wf.category] = []
    acc[wf.category].push(wf)
    return acc
  }, {} as Record<string, WorkflowInfo[]>)
  
  return NextResponse.json({
    total: KNOWN_WORKFLOWS.length,
    categories: {
      myca: byCategory.myca?.length || 0,
      native: byCategory.native?.length || 0,
      ops: byCategory.ops?.length || 0,
      speech: byCategory.speech?.length || 0,
      defense: byCategory.defense?.length || 0,
      other: byCategory.other?.length || 0,
    },
    workflows: KNOWN_WORKFLOWS,
    byCategory,
  })
}





























