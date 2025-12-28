"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"

type TargetApi = "system-metrics" | "mindex-observations" | "n8n-status" | "search"

const DEFAULT_CODE = `// You can use \`fetch\` here.\n// Return any JSON-serializable value.\n\nconst res = await fetch(targetUrl)\nconst data = await res.json()\n\nreturn {\n  ok: res.ok,\n  sample: Array.isArray(data?.data) ? data.data.slice(0, 3) : data,\n}\n`

function getTargetUrl(target: TargetApi) {
  switch (target) {
    case "system-metrics":
      return "/api/natureos/system/metrics"
    case "mindex-observations":
      return "/api/mindex/observations?page=1&pageSize=10"
    case "n8n-status":
      return "/api/natureos/n8n"
    case "search":
      return "/api/search?q=trametes"
  }
}

export function FunctionWorkbench() {
  const [target, setTarget] = useState<TargetApi>("system-metrics")
  const [code, setCode] = useState(DEFAULT_CODE)
  const [output, setOutput] = useState<string>("")
  const [isRunning, setIsRunning] = useState(false)

  const targetUrl = useMemo(() => getTargetUrl(target), [target])

  const run = async () => {
    setIsRunning(true)
    setOutput("")
    try {
      // Sandboxed-ish execution: async function with injected targetUrl.
      // NOTE: This is a local workbench; do not expose in untrusted environments.
      // eslint-disable-next-line no-new-func
      const fn = new Function("targetUrl", `return (async () => { ${code}\n })()`)
      const result = await fn(targetUrl)
      setOutput(JSON.stringify(result, null, 2))
    } catch (e) {
      setOutput(e instanceof Error ? e.stack || e.message : String(e))
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="text-sm text-muted-foreground">
            Target URL: <span className="font-mono text-foreground">{targetUrl}</span>
          </div>
          <Select value={target} onValueChange={(v) => setTarget(v as TargetApi)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select target" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system-metrics">System metrics</SelectItem>
              <SelectItem value="mindex-observations">MINDEX observations</SelectItem>
              <SelectItem value="n8n-status">n8n status</SelectItem>
              <SelectItem value="search">Search</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={run} disabled={isRunning}>
          {isRunning ? "Running..." : "Run"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="text-sm font-medium">Function code</div>
          <Textarea value={code} onChange={(e) => setCode(e.target.value)} className="min-h-[360px] font-mono text-xs" />
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Output</div>
          <Card className="min-h-[360px] p-3">
            <pre className="whitespace-pre-wrap break-words text-xs">{output || "No output yet."}</pre>
          </Card>
        </div>
      </div>
    </div>
  )
}

