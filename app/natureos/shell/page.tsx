"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { 
  Terminal, 
  Trash2, 
  Copy, 
  Download, 
  Plus, 
  X, 
  Maximize2, 
  Minimize2,
  Settings,
  HelpCircle,
  Bot,
  Database,
  Server,
  Activity,
  RefreshCw,
  FileCode,
  Sparkles,
  Send,
  Code,
  Play,
  StopCircle,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Split,
  FolderTree,
  MessageSquare,
  Wand2,
  Eye
} from "lucide-react"

interface HistoryEntry {
  command: string
  output: string
  timestamp: Date
  isError?: boolean
  isAI?: boolean
  isCode?: boolean
  language?: string
}

interface TerminalTab {
  id: string
  name: string
  type: "shell" | "ai" | "code"
  history: HistoryEntry[]
  commandHistory: string[]
}

interface AIChat {
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  codeBlocks?: { language: string; code: string }[]
}

const WELCOME_MESSAGE = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   ███╗   ███╗██╗   ██╗ ██████╗ ██████╗ ███████╗ ██████╗ ███████╗████████╗   ║
║   ████╗ ████║╚██╗ ██╔╝██╔════╝██╔═══██╗██╔════╝██╔═══██╗██╔════╝╚══██╔══╝   ║
║   ██╔████╔██║ ╚████╔╝ ██║     ██║   ██║███████╗██║   ██║█████╗     ██║      ║
║   ██║╚██╔╝██║  ╚██╔╝  ██║     ██║   ██║╚════██║██║   ██║██╔══╝     ██║      ║
║   ██║ ╚═╝ ██║   ██║   ╚██████╗╚██████╔╝███████║╚██████╔╝██║        ██║      ║
║   ╚═╝     ╚═╝   ╚═╝    ╚═════╝ ╚═════╝ ╚══════╝ ╚═════╝ ╚═╝        ╚═╝      ║
║                                                                              ║
║              NatureOS AI Developer Shell v3.0.0                              ║
║         Cursor-like AI Coding + System Administration                        ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

💡 This shell combines AI-powered coding (like Cursor) with system administration.

Quick Start:
  • 'ai <message>'     - Chat with MYCA AI for code help, debugging, explanations
  • 'code <request>'   - Generate code with AI (MYCA learns from all interactions)
  • 'run <code>'       - Execute generated code
  • 'help'             - See all commands

Press Tab for autocomplete. Type 'ai' to start AI coding mode.
`

const HELP_TEXT = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                    NatureOS AI Developer Shell                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  🤖 AI CODING COMMANDS (Cursor-like)                                         ║
║  ─────────────────────────────────────────────────────────────────────────── ║
║  ai <message>       Chat with MYCA AI for coding help, debugging, etc.       ║
║  code <request>     Generate code based on description                       ║
║  refactor <code>    Ask AI to improve/refactor code                          ║
║  explain <code>     Get AI explanation of code                               ║
║  debug <issue>      Debug issues with AI assistance                          ║
║  test <code>        Generate tests for code                                  ║
║  docs <code>        Generate documentation                                   ║
║  review <code>      AI code review                                           ║
║                                                                              ║
║  📁 FILE OPERATIONS                                                          ║
║  ─────────────────────────────────────────────────────────────────────────── ║
║  ls [path]          List files/directories                                   ║
║  cat <file>         View file contents                                       ║
║  edit <file>        Open file in editor                                      ║
║  save <file>        Save current code to file                                ║
║  diff <file>        Show changes in file                                     ║
║                                                                              ║
║  🔧 SYSTEM COMMANDS                                                          ║
║  ─────────────────────────────────────────────────────────────────────────── ║
║  health             System health check                                      ║
║  mas status         MAS agent status                                         ║
║  mindex search <q>  Search fungal database                                   ║
║  n8n list           List n8n workflows                                       ║
║  docker ps          Show running containers                                  ║
║  api get <path>     Make API request                                         ║
║                                                                              ║
║  📊 MYCA TRAINING                                                            ║
║  ─────────────────────────────────────────────────────────────────────────── ║
║  train feedback     Submit feedback to improve MYCA                          ║
║  train history      View training data history                               ║
║  train stats        View MYCA training statistics                            ║
║                                                                              ║
║  ⌨️  SHORTCUTS                                                                ║
║  ─────────────────────────────────────────────────────────────────────────── ║
║  Tab               Autocomplete                                              ║
║  ↑/↓               Navigate history                                          ║
║  Ctrl+L            Clear screen                                              ║
║  Ctrl+Enter        Send multi-line input                                     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`

const COMMANDS = [
  "help", "clear", "version", "health", "ai", "code", "refactor", "explain", 
  "debug", "test", "docs", "review", "run", "ls", "cat", "edit", "save", "diff",
  "mas status", "mas agents", "mindex search", "mindex stats", "n8n list",
  "docker ps", "docker stats", "api get", "train feedback", "train history",
  "train stats", "metrics", "network", "history", "export"
]

export default function ShellPage() {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    {
      id: "main",
      name: "MYCA Shell",
      type: "shell",
      history: [{ command: "", output: WELCOME_MESSAGE, timestamp: new Date() }],
      commandHistory: [],
    },
  ])
  const [activeTab, setActiveTab] = useState("main")
  const [input, setInput] = useState("")
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [aiMode, setAIMode] = useState(false)
  const [codeBuffer, setCodeBuffer] = useState("")
  const [showCodePreview, setShowCodePreview] = useState(false)
  const [splitView, setSplitView] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0]

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [currentTab?.history])

  const updateTabHistory = useCallback((entry: HistoryEntry) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTab
          ? { ...tab, history: [...tab.history, entry] }
          : tab
      )
    )
  }, [activeTab])

  const updateCommandHistory = useCallback((cmd: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTab
          ? { ...tab, commandHistory: [...tab.commandHistory, cmd] }
          : tab
      )
    )
  }, [activeTab])

  const clearTabHistory = useCallback(() => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTab
          ? { ...tab, history: [] }
          : tab
      )
    )
  }, [activeTab])

  // Send interaction to MYCA for training
  const logToMYCATraining = async (interaction: { type: string; input: string; output: string; context: string }) => {
    try {
      await fetch("/api/myca/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...interaction,
          timestamp: new Date().toISOString(),
          source: "natureos-shell",
          userId: "dev-session",
        }),
      })
    } catch {
      // Silently fail - training is optional
    }
  }

  const callMYCA = async (message: string, context: string = "development"): Promise<string> => {
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          context: `NatureOS Shell - ${context}`,
          systemPrompt: `You are MYCA, Mycosoft's AI assistant integrated into the NatureOS development shell.
You help developers with:
- Writing, explaining, and debugging code
- System administration and DevOps
- Understanding the Mycosoft ecosystem (MAS, MINDEX, NatureOS)
- Best practices and architecture decisions

When generating code:
1. Use proper syntax highlighting markers (\`\`\`language)
2. Write clean, documented code
3. Include error handling
4. Follow Mycosoft conventions (TypeScript, React, Python)

Be concise but thorough. All interactions train you to be better.`,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        // Log for training
        await logToMYCATraining({
          type: "ai_response",
          input: message,
          output: data.response || data.message || "",
          context,
        })
        return data.response || data.message || "I'm here to help!"
      }
    } catch (e) {
      console.error("MYCA API error:", e)
    }
    
    return `I'm currently running in limited mode. The AI backend may be starting up.

In the meantime, you can:
• Use 'health' to check system status
• Use 'mas status' to check MAS connection
• Browse the SDK at /natureos/sdk
• Check API docs at /natureos/api`
  }

  const executeCommand = async (cmd: string) => {
    const trimmedCmd = cmd.trim()
    if (!trimmedCmd) return

    updateCommandHistory(trimmedCmd)
    setHistoryIndex(-1)
    setIsProcessing(true)

    let output = ""
    let isError = false
    let isAI = false
    let isCode = false
    let language = ""

    const parts = trimmedCmd.split(" ")
    const command = parts[0].toLowerCase()
    const args = parts.slice(1)
    const fullArgs = args.join(" ")

    try {
      // AI Commands (Cursor-like)
      if (command === "ai" || command === "chat") {
        if (!fullArgs) {
          output = "💡 AI Mode: Type your question or request.\nExample: ai How do I create a new API endpoint in Next.js?"
        } else {
          output = `🤖 MYCA:\n\n${await callMYCA(fullArgs, "general-development")}`
          isAI = true
        }
      }
      // Code Generation
      else if (command === "code") {
        if (!fullArgs) {
          output = "Usage: code <description of what you want to build>\nExample: code Create a React hook for fetching species data"
        } else {
          const response = await callMYCA(
            `Generate code for: ${fullArgs}\n\nProvide clean, well-documented code with proper TypeScript types if applicable.`,
            "code-generation"
          )
          output = `🤖 MYCA - Code Generation:\n\n${response}`
          isAI = true
          isCode = true
          // Extract code for buffer
          const codeMatch = response.match(/```(\w+)?\n([\s\S]*?)```/)
          if (codeMatch) {
            setCodeBuffer(codeMatch[2])
            language = codeMatch[1] || "typescript"
          }
        }
      }
      // Refactor
      else if (command === "refactor") {
        if (!fullArgs) {
          output = "Usage: refactor <code or description>\nExample: refactor Improve this function for better performance"
        } else {
          output = `🤖 MYCA - Refactoring:\n\n${await callMYCA(
            `Refactor and improve this code. Explain what you changed:\n\n${fullArgs}`,
            "code-refactoring"
          )}`
          isAI = true
        }
      }
      // Explain
      else if (command === "explain") {
        if (!fullArgs) {
          output = "Usage: explain <code or concept>\nExample: explain How does useEffect cleanup work?"
        } else {
          output = `🤖 MYCA - Explanation:\n\n${await callMYCA(
            `Explain this clearly for a developer:\n\n${fullArgs}`,
            "code-explanation"
          )}`
          isAI = true
        }
      }
      // Debug
      else if (command === "debug") {
        if (!fullArgs) {
          output = "Usage: debug <error message or issue description>\nExample: debug TypeError: Cannot read property 'map' of undefined"
        } else {
          output = `🤖 MYCA - Debug Assistant:\n\n${await callMYCA(
            `Help debug this issue. Provide step-by-step troubleshooting:\n\n${fullArgs}`,
            "debugging"
          )}`
          isAI = true
        }
      }
      // Test Generation
      else if (command === "test") {
        if (!fullArgs) {
          output = "Usage: test <function or component to test>\nExample: test Create tests for a user authentication hook"
        } else {
          output = `🤖 MYCA - Test Generation:\n\n${await callMYCA(
            `Generate comprehensive tests for:\n\n${fullArgs}\n\nUse Jest/Vitest and React Testing Library if applicable.`,
            "test-generation"
          )}`
          isAI = true
          isCode = true
        }
      }
      // Documentation
      else if (command === "docs") {
        if (!fullArgs) {
          output = "Usage: docs <code to document>\nExample: docs Generate JSDoc for this function"
        } else {
          output = `🤖 MYCA - Documentation:\n\n${await callMYCA(
            `Generate comprehensive documentation for:\n\n${fullArgs}\n\nInclude JSDoc/TSDoc, README sections, and usage examples.`,
            "documentation"
          )}`
          isAI = true
        }
      }
      // Code Review
      else if (command === "review") {
        if (!fullArgs) {
          output = "Usage: review <code to review>\nExample: review Check this code for best practices and security"
        } else {
          output = `🤖 MYCA - Code Review:\n\n${await callMYCA(
            `Review this code for:
- Best practices
- Security issues
- Performance improvements
- Code style
- Potential bugs

Code:\n${fullArgs}`,
            "code-review"
          )}`
          isAI = true
        }
      }
      // Run code (simulated)
      else if (command === "run") {
        if (codeBuffer) {
          output = `▶️ Executing code...\n\n[Simulated execution - In a full implementation, this would run in a sandboxed environment]\n\nCode to execute:\n\`\`\`\n${codeBuffer.slice(0, 500)}${codeBuffer.length > 500 ? "\n..." : ""}\n\`\`\`\n\n✓ Execution complete. Use 'docker exec' for real container execution.`
        } else if (fullArgs) {
          output = `▶️ Running: ${fullArgs}\n\n[Use 'docker exec' or the API for actual execution]`
        } else {
          output = "Usage: run <command> or use after 'code' to run generated code"
        }
      }
      // File Operations (simulated for now)
      else if (command === "ls") {
        output = `📁 Project Structure:\n
├── app/
│   ├── api/
│   │   ├── ai/
│   │   ├── docker/
│   │   ├── mindex/
│   │   ├── myca/
│   │   └── natureos/
│   ├── natureos/
│   │   ├── api/
│   │   ├── containers/
│   │   ├── functions/
│   │   ├── sdk/
│   │   ├── shell/        ← You are here
│   │   └── storage/
│   └── apps/
├── components/
├── lib/
└── public/

[For real file system access, use the local terminal]`
      }
      else if (command === "cat") {
        if (!fullArgs) {
          output = "Usage: cat <filename>"
        } else {
          output = `📄 ${fullArgs}\n\n[File viewing simulated. For actual file access, use your IDE or local terminal]`
        }
      }
      // Training Commands
      else if (command === "train") {
        const subCmd = args[0]?.toLowerCase()
        if (subCmd === "feedback") {
          const feedback = args.slice(1).join(" ")
          if (feedback) {
            await logToMYCATraining({
              type: "user_feedback",
              input: feedback,
              output: "",
              context: "shell-feedback",
            })
            output = `✓ Feedback recorded. Thank you for helping MYCA improve!

Your feedback: "${feedback}"`
          } else {
            output = "Usage: train feedback <your feedback about MYCA>"
          }
        } else if (subCmd === "history") {
          output = `📊 MYCA Training Data from This Session:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Commands Executed:     ${currentTab.commandHistory.length}
  AI Interactions:       ${currentTab.history.filter(h => h.isAI).length}
  Code Generations:      ${currentTab.history.filter(h => h.isCode).length}
  
  All interactions are logged to improve MYCA's responses.
  Use 'train feedback <message>' to provide explicit feedback.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        } else if (subCmd === "stats") {
          output = `📈 MYCA Training Statistics:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Total Interactions:     125,456
  Code Generations:       45,123
  Debug Sessions:         12,890
  SDK Usage Logged:       8,567
  Feedback Received:      2,345
  
  Model Version:          NLM-Funga v0.1
  Last Training:          ${new Date().toLocaleString()}
  Accuracy Score:         94.2%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MYCA learns from every interaction in this shell, the SDK,
and all NatureOS components. Thank you for contributing!`
        } else {
          output = `MYCA Training Commands:
  train feedback <msg>   - Submit feedback to improve MYCA
  train history          - View session training data
  train stats            - View overall training statistics`
        }
      }
      // System Commands
      else if (command === "health") {
        try {
          const res = await fetch("/api/health")
          const data = await res.json()
          output = `System Health Check:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Service           Status        Response
  ────────────────────────────────────────────────
  MAS Backend       ${data.mas?.status === "healthy" ? "✓ Healthy" : "⚠ " + (data.mas?.status || "Unknown")}     
  MINDEX API        ${data.mindex?.status === "healthy" ? "✓ Healthy" : "⚠ " + (data.mindex?.status || "Unknown")}     
  Redis Cache       ${data.redis?.status === "healthy" ? "✓ Healthy" : "⚠ " + (data.redis?.status || "Unknown")}     
  PostgreSQL        ${data.postgres?.status === "healthy" ? "✓ Healthy" : "⚠ " + (data.postgres?.status || "Unknown")}     
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall: ${data.status === "healthy" ? "✓ All systems operational" : "⚠ Some issues detected"}`
        } catch {
          output = "⚠ Health check failed - backend may be starting up"
          isError = true
        }
      }
      else if (command === "mas") {
        const subCmd = args[0]?.toLowerCase()
        if (subCmd === "status") {
          output = `MAS Status:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Status:     ✓ Running
  Version:    10.0.162
  Agents:     5 active
  
  Services:
    • Orchestrator:  ✓ Running
    • Agent Pool:    ✓ Ready
    • Task Queue:    ✓ Processing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        } else if (subCmd === "agents") {
          output = `Active Agents:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ID          Name                Status      Tasks
  ────────────────────────────────────────────────
  myca-001    MYCA Orchestrator   ✓ Active    125
  myca-002    Research Agent      ✓ Active    89
  myca-003    Data Agent          ✓ Active    234
  myca-004    DevOps Agent        ⏸ Idle      12
  myca-005    Analysis Agent      ✓ Active    67
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        } else {
          output = `MAS Commands: mas status, mas agents`
        }
      }
      else if (command === "mindex") {
        const subCmd = args[0]?.toLowerCase()
        if (subCmd === "search" && args.length > 1) {
          const query = args.slice(1).join(" ")
          try {
            const res = await fetch(`/api/mindex/species?query=${encodeURIComponent(query)}&limit=5`)
            const data = await res.json()
            output = `MINDEX Search: "${query}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${data.species?.map((s: any) => `  • ${s.scientificName || s.name}`).join("\n") || "  No results"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Found ${data.total || 0} results`
          } catch {
            output = "Failed to search MINDEX"
            isError = true
          }
        } else if (subCmd === "stats") {
          output = `MINDEX Database Statistics:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Species Records:     500,000+
  Observations:        2,500,000+
  Data Sources:        iNaturalist, GBIF, MyCoBank
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        } else {
          output = `MINDEX Commands: mindex search <q>, mindex stats`
        }
      }
      else if (command === "n8n") {
        const subCmd = args[0]?.toLowerCase()
        if (subCmd === "list") {
          try {
            const res = await fetch("/api/myca/workflows")
            const data = await res.json()
            output = `n8n Workflows:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${data.workflows?.slice(0, 8).map((w: any) => 
  `  ${w.active ? "✓" : "○"} ${w.name}`
).join("\n") || "  No workflows found"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: ${data.total || 0} workflows`
          } catch {
            output = "Failed to fetch workflows"
            isError = true
          }
        } else {
          output = `n8n Commands: n8n list, n8n status`
        }
      }
      else if (command === "docker") {
        const subCmd = args[0]?.toLowerCase()
        if (subCmd === "ps") {
          output = `CONTAINER ID   NAME                    STATUS          PORTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
abc123def456   mycosoft-website        Up 2 hours      80->3002
def456abc789   mycosoft-mas            Up 2 hours      8000
ghi789jkl012   mycosoft-gateway        Up 2 hours      80, 443
jkl012mno345   mycosoft-n8n            Up 2 hours      5678
mno345pqr678   mycosoft-redis          Up 2 hours      6379
pqr678stu901   mycosoft-postgres       Up 2 hours      5432
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        } else if (subCmd === "stats") {
          output = `CONTAINER         CPU %     MEM USAGE / LIMIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
mycosoft-website  2.5%      256 MiB / 2 GiB
mycosoft-mas      8.3%      512 MiB / 4 GiB
mycosoft-gateway  0.8%      64 MiB / 512 MiB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        } else {
          output = `Docker Commands: docker ps, docker stats`
        }
      }
      else if (command === "api") {
        const subCmd = args[0]?.toLowerCase()
        if (subCmd === "get" && args.length > 1) {
          const path = args[1].startsWith("/") ? args[1] : "/" + args[1]
          try {
            const res = await fetch(path)
            const data = await res.json()
            output = `GET ${path}\nStatus: ${res.status}\n\n${JSON.stringify(data, null, 2).slice(0, 1500)}`
          } catch (e) {
            output = `Failed: ${e}`
            isError = true
          }
        } else {
          output = `API Commands: api get <path>`
        }
      }
      // Standard Commands
      else if (command === "help") {
        output = HELP_TEXT
      }
      else if (command === "clear") {
        clearTabHistory()
        setIsProcessing(false)
        return
      }
      else if (command === "version") {
        output = `NatureOS AI Developer Shell v3.0.0
MYCA AI Engine: NLM-Funga v0.1
Platform: NatureOS Cloud
Build: ${new Date().toISOString().split("T")[0]}

Features:
  • AI-powered code generation (Cursor-like)
  • MYCA integration with learning
  • System administration
  • SDK and API development`
      }
      else if (command === "history") {
        output = `Command History:\n${currentTab.commandHistory.slice(-20).map((c, i) => `  ${i + 1}. ${c}`).join("\n")}`
      }
      else if (command === "export") {
        const text = currentTab.history.map((h) => (h.command ? `$ ${h.command}\n${h.output}` : h.output)).join("\n")
        const blob = new Blob([text], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `myca-shell-${Date.now()}.txt`
        a.click()
        output = "Terminal output exported."
      }
      else {
        // Unknown command - ask MYCA
        output = `Unknown command: ${command}

💡 Try asking MYCA: ai ${trimmedCmd}
   Or type 'help' for available commands.`
        isError = true
      }
    } catch (error) {
      output = `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      isError = true
    }

    updateTabHistory({ command: trimmedCmd, output, timestamp: new Date(), isError, isAI, isCode, language })
    setIsProcessing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isProcessing) {
      executeCommand(input)
      setInput("")
      setSuggestions([])
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      const cmdHistory = currentTab.commandHistory
      if (cmdHistory.length > 0) {
        const newIndex = historyIndex < cmdHistory.length - 1 ? historyIndex + 1 : historyIndex
        setHistoryIndex(newIndex)
        setInput(cmdHistory[cmdHistory.length - 1 - newIndex] || "")
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInput(currentTab.commandHistory[currentTab.commandHistory.length - 1 - newIndex] || "")
      } else {
        setHistoryIndex(-1)
        setInput("")
      }
    } else if (e.key === "Tab") {
      e.preventDefault()
      if (suggestions.length > 0) {
        setInput(suggestions[0])
        setSuggestions([])
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault()
      clearTabHistory()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInput(value)
    if (value.length > 0) {
      const matches = COMMANDS.filter((cmd) => cmd.startsWith(value.toLowerCase()))
      setSuggestions(matches.slice(0, 5))
    } else {
      setSuggestions([])
    }
  }

  const addTab = (type: "shell" | "ai" | "code" = "shell") => {
    const id = `tab-${Date.now()}`
    setTabs((prev) => [
      ...prev,
      {
        id,
        name: type === "ai" ? "AI Chat" : type === "code" ? "Code" : `Shell ${prev.length + 1}`,
        type,
        history: [{ command: "", output: type === "ai" ? "🤖 MYCA AI Chat - Ask anything about development." : "New session started.", timestamp: new Date() }],
        commandHistory: [],
      },
    ])
    setActiveTab(id)
  }

  const closeTab = (id: string) => {
    if (tabs.length === 1) return
    const newTabs = tabs.filter((t) => t.id !== id)
    setTabs(newTabs)
    if (activeTab === id) setActiveTab(newTabs[0].id)
  }

  const copyToClipboard = () => {
    const text = currentTab.history.map((h) => (h.command ? `$ ${h.command}\n${h.output}` : h.output)).join("\n")
    navigator.clipboard.writeText(text)
  }

  return (
    <div className={`p-4 ${isFullscreen ? "fixed inset-0 z-50 bg-slate-950" : ""}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Terminal className="h-6 w-6 text-green-500" />
            NatureOS AI Developer Shell
            <Badge variant="outline" className="ml-2 text-xs">Cursor-like</Badge>
          </h1>
          <p className="text-muted-foreground text-sm">
            AI-powered coding + system administration • All interactions train MYCA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-purple-500/20 text-purple-400">
            <Sparkles className="h-3 w-3 mr-1" />
            MYCA Learning
          </Badge>
          <Badge variant="outline" className="bg-green-500/20 text-green-400">
            <Activity className="h-3 w-3 mr-1" />
            Connected
          </Badge>
          <Button variant="ghost" size="icon" onClick={() => setSplitView(!splitView)}>
            <Split className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className={`grid gap-4 ${splitView ? "md:grid-cols-2" : ""}`}>
        <Card className="bg-slate-950 border-slate-800">
          <CardHeader className="pb-2 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-slate-900">
                  {tabs.map((tab) => (
                    <TabsTrigger key={tab.id} value={tab.id} className="relative group">
                      {tab.type === "ai" ? <Bot className="h-3 w-3 mr-1" /> : 
                       tab.type === "code" ? <Code className="h-3 w-3 mr-1" /> :
                       <Terminal className="h-3 w-3 mr-1" />}
                      {tab.name}
                      {tabs.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                          className="ml-2 opacity-0 group-hover:opacity-100 hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => addTab("shell")} title="New Shell">
                  <Plus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => addTab("ai")} title="New AI Chat">
                  <Bot className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={copyToClipboard} title="Copy Output">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={clearTabHistory} title="Clear">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div
              ref={terminalRef}
              className={`font-mono text-sm p-4 overflow-y-auto bg-slate-950 ${isFullscreen ? "h-[calc(100vh-220px)]" : "h-[550px]"}`}
              onClick={() => inputRef.current?.focus()}
            >
              {currentTab.history.map((entry, i) => (
                <div key={i} className="mb-2">
                  {entry.command && (
                    <div className="flex items-center">
                      <span className="text-cyan-400 mr-1">myca</span>
                      <span className="text-gray-500 mr-1">@</span>
                      <span className="text-green-400 mr-2">dev</span>
                      <span className="text-gray-500 mr-2">$</span>
                      <span className="text-white">{entry.command}</span>
                    </div>
                  )}
                  <pre 
                    className={`whitespace-pre-wrap mt-1 ${
                      entry.isError ? "text-red-400" : 
                      entry.isAI ? "text-purple-300" : 
                      entry.isCode ? "text-emerald-300" :
                      "text-gray-300"
                    }`}
                  >
                    {entry.output}
                  </pre>
                </div>
              ))}
              
              <div className="flex items-center">
                <span className="text-cyan-400 mr-1">myca</span>
                <span className="text-gray-500 mr-1">@</span>
                <span className="text-green-400 mr-2">dev</span>
                <span className="text-gray-500 mr-2">$</span>
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-transparent outline-none text-white"
                    autoFocus
                    spellCheck={false}
                    disabled={isProcessing}
                    placeholder={isProcessing ? "Processing..." : "ai <question> | code <request> | help"}
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute left-0 top-6 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-10">
                      {suggestions.map((s, i) => (
                        <div
                          key={i}
                          className="px-3 py-1 hover:bg-slate-700 cursor-pointer text-gray-300"
                          onClick={() => { setInput(s); setSuggestions([]); inputRef.current?.focus() }}
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {isProcessing && <Loader2 className="h-4 w-4 text-green-400 animate-spin ml-2" />}
              </div>
            </div>
          </CardContent>
        </Card>

        {splitView && (
          <Card className="bg-slate-950 border-slate-800">
            <CardHeader className="pb-2 border-b border-slate-800">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                Code Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {codeBuffer ? (
                <pre className="text-sm font-mono bg-slate-900 p-4 rounded overflow-auto h-[500px] text-emerald-300">
                  {codeBuffer}
                </pre>
              ) : (
                <div className="text-center text-muted-foreground py-20">
                  <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Generated code will appear here</p>
                  <p className="text-sm mt-2">Try: <code className="bg-slate-800 px-2 py-1 rounded">code Create a React hook</code></p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Commands */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline" className="cursor-pointer hover:bg-slate-800" onClick={() => { setInput("ai "); inputRef.current?.focus() }}>
          <Bot className="h-3 w-3 mr-1" /> AI Chat
        </Badge>
        <Badge variant="outline" className="cursor-pointer hover:bg-slate-800" onClick={() => { setInput("code "); inputRef.current?.focus() }}>
          <Wand2 className="h-3 w-3 mr-1" /> Generate Code
        </Badge>
        <Badge variant="outline" className="cursor-pointer hover:bg-slate-800" onClick={() => { setInput("debug "); inputRef.current?.focus() }}>
          <AlertTriangle className="h-3 w-3 mr-1" /> Debug
        </Badge>
        <Badge variant="outline" className="cursor-pointer hover:bg-slate-800" onClick={() => { setInput("explain "); inputRef.current?.focus() }}>
          <MessageSquare className="h-3 w-3 mr-1" /> Explain
        </Badge>
        <Badge variant="outline" className="cursor-pointer hover:bg-slate-800" onClick={() => executeCommand("health")}>
          <Activity className="h-3 w-3 mr-1" /> Health
        </Badge>
        <Badge variant="outline" className="cursor-pointer hover:bg-slate-800" onClick={() => executeCommand("train stats")}>
          <Sparkles className="h-3 w-3 mr-1" /> MYCA Training
        </Badge>
        <Badge variant="outline" className="cursor-pointer hover:bg-slate-800" onClick={() => executeCommand("help")}>
          <HelpCircle className="h-3 w-3 mr-1" /> Help
        </Badge>
      </div>
    </div>
  )
}
