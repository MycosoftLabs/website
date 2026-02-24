/**
 * WebMCP Provider - February 17, 2026
 *
 * Registers tools with navigator.modelContext when available (Chrome 146+).
 * Provides no-op fallback when API is unavailable.
 *
 * Tools: run_search, focus_widget, add_notepad_item, read_page_context, safe_navigate
 */

export type ToolRegistration = { unregister: () => void }

export interface WebMCPToolResult {
  content: Array<{ type: "text"; text: string }>
}

export interface WebMCPCallbacks {
  onRunSearch?: (query: string) => void
  onFocusWidget?: (widget: string, id?: string) => void
  onAddNotepadItem?: (item: {
    type: string
    title: string
    content: string
    source?: string
  }) => void
  onReadPageContext?: () => Promise<{
    query?: string
    filters?: Record<string, unknown>
    activeEntities?: string[]
  }>
  onNavigate?: (path: string) => void
}

declare global {
  interface Navigator {
    modelContext?: {
      registerTool: (def: {
        name: string
        description: string
        inputSchema: Record<string, unknown>
        execute: (args: Record<string, unknown>) => Promise<WebMCPToolResult>
      }) => ToolRegistration
    }
  }
}

export function isWebMCPAvailable(): boolean {
  return typeof navigator !== "undefined" && !!navigator.modelContext?.registerTool
}

/** Tool schemas for validation/testing - February 17, 2026 */
export const WEBMCP_TOOL_SCHEMAS: Array<{
  name: string
  description: string
  inputSchema: Record<string, unknown>
}> = [
  {
    name: "mycosoft_run_search",
    description: "Run a search query on the Mycosoft MINDEX knowledge base.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Search query" } },
      required: ["query"],
    },
  },
  {
    name: "mycosoft_focus_widget",
    description: "Focus a specific widget on the search page.",
    inputSchema: {
      type: "object",
      properties: {
        widget: { type: "string", enum: ["species", "chemistry", "genetics", "research", "ai"], description: "Widget" },
        id: { type: "string", description: "Optional entity ID" },
      },
      required: ["widget"],
    },
  },
  {
    name: "mycosoft_add_notepad_item",
    description: "Add an item to the user's notepad.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["species", "compound", "genetics", "research", "note", "news"], description: "Item type" },
        title: { type: "string", description: "Item title" },
        content: { type: "string", description: "Item content" },
        source: { type: "string", description: "Optional source" },
      },
      required: ["type", "title", "content"],
    },
  },
  {
    name: "mycosoft_read_page_context",
    description: "Read the current page context.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "mycosoft_safe_navigate",
    description: "Navigate to a Mycosoft page.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "Path to navigate" } },
      required: ["path"],
    },
  },
]

function noopRegistration(): ToolRegistration {
  return { unregister: () => {} }
}

export function registerWebMCPTools(callbacks: WebMCPCallbacks): ToolRegistration[] {
  if (!isWebMCPAvailable()) {
    return [noopRegistration()]
  }

  const registrations: ToolRegistration[] = []
  const mc = navigator.modelContext!

  if (callbacks.onRunSearch) {
    registrations.push(
      mc.registerTool({
        name: "mycosoft_run_search",
        description:
          "Run a search query on the Mycosoft MINDEX knowledge base. Use for species, compounds, genetics, or general research queries.",
        inputSchema: {
          type: "object",
          properties: { query: { type: "string", description: "Search query" } },
          required: ["query"],
        },
        async execute({ query }) {
          callbacks.onRunSearch!(String(query ?? ""))
          return { content: [{ type: "text", text: `Search initiated for: ${query}` }] }
        },
      })
    )
  }

  if (callbacks.onFocusWidget) {
    registrations.push(
      mc.registerTool({
        name: "mycosoft_focus_widget",
        description:
          "Focus a specific widget on the search page: species, chemistry, genetics, research, or ai.",
        inputSchema: {
          type: "object",
          properties: {
            widget: {
              type: "string",
              enum: ["species", "chemistry", "genetics", "research", "ai"],
              description: "Widget to focus",
            },
            id: { type: "string", description: "Optional entity ID" },
          },
          required: ["widget"],
        },
        async execute({ widget, id }) {
          callbacks.onFocusWidget!(String(widget ?? "species"), id ? String(id) : undefined)
          return {
            content: [{ type: "text", text: `Focused ${widget}${id ? ` (${id})` : ""}` }],
          }
        },
      })
    )
  }

  if (callbacks.onAddNotepadItem) {
    registrations.push(
      mc.registerTool({
        name: "mycosoft_add_notepad_item",
        description: "Add an item to the user's notepad: species, compound, genetics, research, or note.",
        inputSchema: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["species", "compound", "genetics", "research", "note", "news"],
              description: "Item type",
            },
            title: { type: "string", description: "Item title" },
            content: { type: "string", description: "Item content" },
            source: { type: "string", description: "Optional source" },
          },
          required: ["type", "title", "content"],
        },
        async execute({ type, title, content, source }) {
          callbacks.onAddNotepadItem!({
            type: String(type ?? "note"),
            title: String(title ?? ""),
            content: String(content ?? ""),
            source: source ? String(source) : undefined,
          })
          return {
            content: [{ type: "text", text: `Added "${title}" to notepad` }],
          }
        },
      })
    )
  }

  if (callbacks.onReadPageContext) {
    registrations.push(
      mc.registerTool({
        name: "mycosoft_read_page_context",
        description:
          "Read the current page context: active search query, filters, and focused entities.",
        inputSchema: { type: "object", properties: {} },
        async execute() {
          const ctx = await callbacks.onReadPageContext!()
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(ctx, null, 2),
              },
            ],
          }
        },
      })
    )
  }

  if (callbacks.onNavigate) {
    registrations.push(
      mc.registerTool({
        name: "mycosoft_safe_navigate",
        description:
          "Navigate to a Mycosoft page. Use relative paths like /search, /natureos, /test-voice.",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path to navigate (e.g. /search?q=fungi)",
            },
          },
          required: ["path"],
        },
        async execute({ path }) {
          const p = String(path ?? "").trim()
          if (p.startsWith("/") && !p.startsWith("//")) {
            callbacks.onNavigate!(p)
            return { content: [{ type: "text", text: `Navigated to ${p}` }] }
          }
          return {
            content: [{ type: "text", text: "Invalid path - use relative paths like /search" }],
          }
        },
      })
    )
  }

  return registrations.length > 0 ? registrations : [noopRegistration()]
}

export function createUnifiedRegistration(
  callbacks: WebMCPCallbacks
): () => void {
  const regs = registerWebMCPTools(callbacks)
  return () => {
    regs.forEach((r) => r.unregister())
  }
}
