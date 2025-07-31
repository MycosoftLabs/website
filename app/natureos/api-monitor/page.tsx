"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ApiMonitorPage() {
  const [activeTab, setActiveTab] = useState("usage")
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // 7 days ago
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [usageStats, setUsageStats] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)

  // Fetch API usage statistics
  const fetchUsageStats = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/internal/telemetry?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch usage stats: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      setUsageStats(data)
    } catch (error) {
      console.error("Error fetching API usage stats:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch usage statistics")
    } finally {
      setLoading(false)
    }
  }

  // Create a new API key
  const createApiKey = async (agentId: string, description: string, expiresInDays: number | null) => {
    setLoading(true)
    setError(null)
    setNewApiKey(null)

    try {
      const response = await fetch("/api/internal/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentId,
          description,
          expiresInDays,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to create API key: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      setNewApiKey(data.key)
    } catch (error) {
      console.error("Error creating API key:", error)
      setError(error instanceof Error ? error.message : "Failed to create API key")
    } finally {
      setLoading(false)
    }
  }

  // Fetch usage stats on mount and when date range changes
  useEffect(() => {
    fetchUsageStats()
  }, [startDate, endDate])

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">API Monitor</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="usage">Usage Statistics</TabsTrigger>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
          <TabsTrigger value="docs">Documentation</TabsTrigger>
        </TabsList>

        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>API Usage Statistics</CardTitle>
              <CardDescription>Monitor API usage across different endpoints and agents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate.toISOString().split("T")[0]}
                    onChange={(e) => setStartDate(new Date(e.target.value))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate.toISOString().split("T")[0]}
                    onChange={(e) => setEndDate(new Date(e.target.value))}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={fetchUsageStats} disabled={loading}>
                    {loading ? "Loading..." : "Refresh"}
                  </Button>
                </div>
              </div>

              {error && <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">{error}</div>}

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 text-left">Endpoint</th>
                      <th className="p-2 text-left">Agent ID</th>
                      <th className="p-2 text-left">Request Count</th>
                      <th className="p-2 text-left">First Request</th>
                      <th className="p-2 text-left">Last Request</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageStats.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center">
                          {loading ? "Loading..." : "No data available"}
                        </td>
                      </tr>
                    ) : (
                      usageStats.map((stat, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{stat.endpoint}</td>
                          <td className="p-2">{stat.agent_id}</td>
                          <td className="p-2">{stat.request_count}</td>
                          <td className="p-2">{new Date(stat.first_request).toLocaleString()}</td>
                          <td className="p-2">{new Date(stat.last_request).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keys">
          <Card>
            <CardHeader>
              <CardTitle>API Key Management</CardTitle>
              <CardDescription>Create and manage API keys for external systems</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget)
                  const agentId = formData.get("agentId") as string
                  const description = formData.get("description") as string
                  const expiresInDays = formData.get("expiresInDays") as string

                  createApiKey(agentId, description, expiresInDays ? Number.parseInt(expiresInDays, 10) : null)
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="agentId">Agent ID</Label>
                    <Input id="agentId" name="agentId" placeholder="agent-123" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" name="description" placeholder="API key for Agent XYZ" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiresInDays">Expires In (Days)</Label>
                  <Select name="expiresInDays" defaultValue="90">
                    <SelectTrigger>
                      <SelectValue placeholder="Select expiration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                      <SelectItem value="">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create API Key"}
                </Button>
              </form>

              {error && <div className="bg-red-50 text-red-700 p-4 rounded-md mt-4">{error}</div>}

              {newApiKey && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                  <h3 className="font-bold text-green-800 mb-2">API Key Created</h3>
                  <p className="mb-2 text-sm">Store this key securely. It won't be shown again.</p>
                  <div className="bg-white p-3 rounded border font-mono text-sm break-all">{newApiKey}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <Card>
            <CardHeader>
              <CardTitle>API Documentation</CardTitle>
              <CardDescription>Access and manage API documentation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>
                  The Mycosoft API provides access to the fungal database, species information, compound data, and
                  search functionality.
                </p>

                <div className="flex flex-wrap gap-4">
                  <Button asChild>
                    <a href="/api/docs?format=html" target="_blank" rel="noopener noreferrer">
                      View HTML Documentation
                    </a>
                  </Button>

                  <Button variant="outline" asChild>
                    <a href="/api/docs" target="_blank" rel="noopener noreferrer">
                      View OpenAPI Spec (JSON)
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
