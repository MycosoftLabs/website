"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

interface AlertRecord {
  id: string
  title: string
  message: string
  severity: "critical" | "warning" | "info"
  status: "open" | "acknowledged" | "dismissed" | "resolved"
  device_id?: string | null
  source?: string | null
  category?: string | null
  created_at: string
  updated_at: string
}

interface AlertRuleRecord {
  id: string
  name: string
  description?: string | null
  condition: Record<string, any>
  severity: "critical" | "warning" | "info"
  is_enabled: boolean
  created_at: string
  updated_at: string
}

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error("Failed to load alert data")
  return response.json()
}

function formatTimestamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function SeverityBadge({ severity }: { severity: AlertRecord["severity"] }) {
  const styles: Record<string, string> = {
    critical: "bg-rose-500/15 text-rose-500 border-rose-500/30",
    warning: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    info: "bg-sky-500/15 text-sky-500 border-sky-500/30",
  }
  return (
    <Badge variant="outline" className={styles[severity]}>
      {severity}
    </Badge>
  )
}

function StatusBadge({ status }: { status: AlertRecord["status"] }) {
  const styles: Record<string, string> = {
    open: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    acknowledged: "bg-indigo-500/15 text-indigo-500 border-indigo-500/30",
    dismissed: "bg-muted text-muted-foreground border-muted-foreground/40",
    resolved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  }
  return (
    <Badge variant="outline" className={styles[status]}>
      {status}
    </Badge>
  )
}

export function AlertCenter() {
  const { data: alerts, error, isLoading, mutate } = useSWR<AlertRecord[]>(
    "/api/iot/alerts?limit=200",
    fetcher,
    { refreshInterval: 15000 }
  )
  const { data: rules, mutate: mutateRules } = useSWR<AlertRuleRecord[]>(
    "/api/iot/alerts/rules",
    fetcher
  )

  const [statusFilter, setStatusFilter] = useState("all")
  const [severityFilter, setSeverityFilter] = useState("all")
  const [ruleName, setRuleName] = useState("")
  const [ruleDescription, setRuleDescription] = useState("")
  const [ruleSeverity, setRuleSeverity] = useState<AlertRecord["severity"]>("warning")
  const [ruleEnabled, setRuleEnabled] = useState(true)
  const [ruleCondition, setRuleCondition] = useState("{}")
  const [ruleError, setRuleError] = useState<string | null>(null)
  const [isSavingRule, setIsSavingRule] = useState(false)

  const filteredAlerts = useMemo(() => {
    const items = alerts ?? []
    return items.filter((alert) => {
      const matchesStatus = statusFilter === "all" || alert.status === statusFilter
      const matchesSeverity =
        severityFilter === "all" || alert.severity === severityFilter
      return matchesStatus && matchesSeverity
    })
  }, [alerts, statusFilter, severityFilter])

  const counts = useMemo(() => {
    const items = alerts ?? []
    return items.reduce(
      (acc, alert) => {
        acc.total += 1
        acc.bySeverity[alert.severity] += 1
        acc.byStatus[alert.status] += 1
        return acc
      },
      {
        total: 0,
        bySeverity: { critical: 0, warning: 0, info: 0 },
        byStatus: { open: 0, acknowledged: 0, dismissed: 0, resolved: 0 },
      }
    )
  }, [alerts])

  async function updateAlertStatus(id: string, status: AlertRecord["status"]) {
    await fetch(`/api/iot/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    mutate()
  }

  async function deleteAlert(id: string) {
    await fetch(`/api/iot/alerts/${id}`, { method: "DELETE" })
    mutate()
  }

  async function saveRule() {
    setRuleError(null)
    let condition: Record<string, any>
    try {
      condition = JSON.parse(ruleCondition)
    } catch {
      setRuleError("Condition must be valid JSON.")
      return
    }
    if (!ruleName.trim()) {
      setRuleError("Rule name is required.")
      return
    }
    setIsSavingRule(true)
    try {
      await fetch("/api/iot/alerts/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ruleName.trim(),
          description: ruleDescription.trim() || undefined,
          condition,
          severity: ruleSeverity,
          is_enabled: ruleEnabled,
        }),
      })
      setRuleName("")
      setRuleDescription("")
      setRuleCondition("{}")
      setRuleEnabled(true)
      mutateRules()
    } finally {
      setIsSavingRule(false)
    }
  }

  async function toggleRule(rule: AlertRuleRecord, enabled: boolean) {
    await fetch(`/api/iot/alerts/rules/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_enabled: enabled }),
    })
    mutateRules()
  }

  async function deleteRule(ruleId: string) {
    await fetch(`/api/iot/alerts/rules/${ruleId}`, { method: "DELETE" })
    mutateRules()
  }

  if (isLoading) {
    return <div className="rounded-lg border p-6">Loading alerts...</div>
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
        Unable to load alert data.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{counts.total}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{counts.bySeverity.critical}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{counts.bySeverity.warning}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Open</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{counts.byStatus.open}</CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Alert Inbox</CardTitle>
              <p className="text-sm text-muted-foreground">
                Monitor live alerts and acknowledge or resolve incidents.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 w-full text-sm sm:w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="h-10 w-full text-sm sm:w-36">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredAlerts.length ? (
              filteredAlerts.map((alert) => (
                <div key={alert.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <SeverityBadge severity={alert.severity} />
                        <StatusBadge status={alert.status} />
                        {alert.category ? (
                          <Badge variant="outline">{alert.category}</Badge>
                        ) : null}
                      </div>
                      <div className="text-base font-semibold">{alert.title}</div>
                      <div className="text-sm text-muted-foreground">{alert.message}</div>
                      <div className="text-xs text-muted-foreground">
                        {alert.device_id ? `Device ${alert.device_id} • ` : ""}
                        {alert.source ? `${alert.source} • ` : ""}
                        {formatTimestamp(alert.created_at)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {alert.status !== "acknowledged" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateAlertStatus(alert.id, "acknowledged")}
                        >
                          Acknowledge
                        </Button>
                      )}
                      {alert.status !== "resolved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateAlertStatus(alert.id, "resolved")}
                        >
                          Resolve
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteAlert(alert.id)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No alerts match the current filters.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alert Rules</CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure detection rules that drive alert creation.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Input
                placeholder="Rule name"
                value={ruleName}
                onChange={(event) => setRuleName(event.target.value)}
              />
              <Input
                placeholder="Description"
                value={ruleDescription}
                onChange={(event) => setRuleDescription(event.target.value)}
              />
              <Select value={ruleSeverity} onValueChange={(value) => setRuleSeverity(value as AlertRecord["severity"])}>
                <SelectTrigger className="h-10 w-full text-sm">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                value={ruleCondition}
                onChange={(event) => setRuleCondition(event.target.value)}
                className="min-h-[120px] text-sm"
                placeholder='{"metric": "temperature", "operator": ">", "value": 30}'
              />
              <div className="flex items-center justify-between">
                <div className="text-sm">Rule enabled</div>
                <Switch checked={ruleEnabled} onCheckedChange={setRuleEnabled} />
              </div>
              {ruleError ? (
                <div className="text-sm text-destructive">{ruleError}</div>
              ) : null}
              <Button
                className="w-full"
                onClick={saveRule}
                disabled={isSavingRule}
              >
                {isSavingRule ? "Saving..." : "Create Rule"}
              </Button>
            </div>

            <div className="space-y-3 pt-4">
              {rules?.length ? (
                rules.map((rule) => (
                  <div key={rule.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{rule.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {rule.description || "No description"}
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Updated {formatTimestamp(rule.updated_at)}
                        </div>
                      </div>
                      <Switch
                        checked={rule.is_enabled}
                        onCheckedChange={(value) => toggleRule(rule, value)}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <SeverityBadge severity={rule.severity} />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteRule(rule.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No alert rules configured yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
