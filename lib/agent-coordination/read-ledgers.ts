import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

export type CoordinationKind = "messages" | "status" | "memory" | "tasks" | "audit"

export interface CoordinationSnapshot {
  ok: true
  generated_at: string
  storage_root: string
  counts: Record<CoordinationKind, number>
  messages: Record<string, unknown>[]
  statuses: Record<string, unknown>[]
  latest_status_by_agent: Record<string, Record<string, unknown>>
  memories: Record<string, unknown>[]
  tasks: Record<string, unknown>[]
  latest_task_by_id: Record<string, Record<string, unknown>>
}

const FILE_BY_KIND: Record<CoordinationKind, string> = {
  messages: "messages.jsonl",
  status: "status.jsonl",
  memory: "memory.jsonl",
  tasks: "tasks.jsonl",
  audit: "audit.jsonl",
}

const SECRET_KEY_PATTERN = /token|secret|password|private|credential|api[_-]?key/i
const SECRET_VALUE_PATTERNS = [
  /\b(sk|pk|rk|mk|ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_=-]{16,}\b/g,
  /\b[A-Za-z0-9+/]{32,}={0,2}\b/g,
]

export function getCoordinationStoreRoot() {
  return (
    process.env.MYCOSOFT_COORDINATION_HOME ||
    path.join(os.homedir(), ".mycosoft", "agent-coordination")
  )
}

function redactString(value: string) {
  return SECRET_VALUE_PATTERNS.reduce(
    (next, pattern) => next.replace(pattern, "[redacted]"),
    value,
  )
}

function redact(value: unknown, key = ""): unknown {
  if (SECRET_KEY_PATTERN.test(key)) return "[redacted]"
  if (typeof value === "string") return redactString(value)
  if (Array.isArray(value)) return value.map((item) => redact(item))
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
        entryKey,
        redact(entryValue, entryKey),
      ]),
    )
  }
  return value
}

async function readJsonl(root: string, kind: CoordinationKind) {
  const file = path.join(root, FILE_BY_KIND[kind])
  try {
    const raw = await fs.readFile(file, "utf8")
    return raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        try {
          return redact(JSON.parse(line)) as Record<string, unknown>
        } catch {
          return { id: `corrupt:${kind}`, kind, error: "corrupt_jsonl_record" }
        }
      })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return []
    throw error
  }
}

function latestBy(records: Record<string, unknown>[], key: string) {
  return records.reduce<Record<string, Record<string, unknown>>>((acc, record) => {
    const value = record[key]
    if (typeof value === "string" && value) acc[value] = record
    return acc
  }, {})
}

export async function readCoordinationSnapshot(limit = 80): Promise<CoordinationSnapshot> {
  const storageRoot = getCoordinationStoreRoot()
  const [messages, statuses, memories, tasks, audit] = await Promise.all([
    readJsonl(storageRoot, "messages"),
    readJsonl(storageRoot, "status"),
    readJsonl(storageRoot, "memory"),
    readJsonl(storageRoot, "tasks"),
    readJsonl(storageRoot, "audit"),
  ])

  return {
    ok: true,
    generated_at: new Date().toISOString(),
    storage_root: storageRoot,
    counts: {
      messages: messages.length,
      status: statuses.length,
      memory: memories.length,
      tasks: tasks.length,
      audit: audit.length,
    },
    messages: messages.slice(-limit).reverse(),
    statuses: statuses.slice(-limit).reverse(),
    latest_status_by_agent: latestBy(statuses, "agent"),
    memories: memories.slice(-limit).reverse(),
    tasks: tasks.slice(-limit).reverse(),
    latest_task_by_id: latestBy(tasks, "id"),
  }
}
