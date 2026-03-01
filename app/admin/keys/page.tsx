"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import {
  Key,
  Plus,
  RefreshCw,
  Copy,
  Trash2,
  RotateCcw,
  Shield,
  Activity,
  Clock,
  AlertTriangle,
} from "lucide-react"

interface APIKey {
  id: string
  key_prefix: string
  name: string
  description?: string
  service: string
  scopes: string[]
  rate_limit_per_minute: number
  rate_limit_per_day: number
  expires_at?: string
  last_used_at?: string
  usage_count: number
  is_active: boolean
  created_at: string
}

interface AuditLogEntry {
  id: number
  key_id: string
  action: string
  ip_address?: string
  user_agent?: string
  endpoint?: string
  created_at: string
}

const SERVICES = [
  { value: "mycorrhizae", label: "Mycorrhizae Protocol" },
  { value: "mindex", label: "MINDEX" },
  { value: "natureos", label: "NatureOS" },
  { value: "mycobrain", label: "MycoBrain" },
  { value: "mas", label: "MAS Agents" },
  { value: "admin", label: "Admin" },
]

const SCOPES = [
  { value: "read", label: "Read", description: "Read data from APIs" },
  { value: "write", label: "Write", description: "Write/publish data" },
  { value: "admin", label: "Admin", description: "Full administrative access" },
  { value: "keys:manage", label: "Keys: Manage", description: "Manage API keys" },
  { value: "channel:subscribe", label: "Channel: Subscribe", description: "Subscribe to channels" },
  { value: "channel:publish", label: "Channel: Publish", description: "Publish to channels" },
  { value: "device:read", label: "Device: Read", description: "Read device data" },
  { value: "device:write", label: "Device: Write", description: "Write device data" },
  { value: "etl:run", label: "ETL: Run", description: "Execute ETL pipelines" },
  { value: "agent:spawn", label: "Agent: Spawn", description: "Spawn MAS agents" },
]

export default function APIKeysPage() {
  const [keys, setKeys] = useState<APIKey[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedKey, setSelectedKey] = useState<APIKey | null>(null)
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const { toast } = useToast()

  // Form state for new key
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formService, setFormService] = useState("mycorrhizae")
  const [formScopes, setFormScopes] = useState<string[]>(["read"])
  const [formRatePerMinute, setFormRatePerMinute] = useState(60)
  const [formRatePerDay, setFormRatePerDay] = useState(10000)
  const [formExpiresInDays, setFormExpiresInDays] = useState<number | null>(null)

  const fetchKeys = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/keys")
      if (response.ok) {
        const data = await response.json()
        setKeys(data.keys || [])
      }
    } catch (error) {
      console.error("Failed to fetch keys:", error)
      toast({
        title: "Error",
        description: "Failed to fetch API keys",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  const handleCreateKey = async () => {
    try {
      const response = await fetch("/api/admin/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          service: formService,
          scopes: formScopes,
          rate_limit_per_minute: formRatePerMinute,
          rate_limit_per_day: formRatePerDay,
          expires_in_days: formExpiresInDays,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setNewKey(data.key)
        fetchKeys()
        toast({
          title: "Key Created",
          description: "Store the key securely - it won't be shown again",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.detail || "Failed to create key",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to create key:", error)
      toast({
        title: "Error",
        description: "Failed to create API key",
        variant: "destructive",
      })
    }
  }

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to revoke this key?")) return

    try {
      const response = await fetch(`/api/admin/keys/${keyId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchKeys()
        toast({
          title: "Key Revoked",
          description: "The API key has been deactivated",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to revoke key",
        variant: "destructive",
      })
    }
  }

  const handleRotateKey = async (keyId: string) => {
    if (!confirm("Rotate this key? The old key will be deactivated.")) return

    try {
      const response = await fetch(`/api/admin/keys/${keyId}/rotate`, {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        setNewKey(data.new_key)
        fetchKeys()
        toast({
          title: "Key Rotated",
          description: "Store the new key securely",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rotate key",
        variant: "destructive",
      })
    }
  }

  const fetchAuditLog = async (keyId: string) => {
    try {
      const response = await fetch(`/api/admin/keys/${keyId}/audit`)
      if (response.ok) {
        const data = await response.json()
        setAuditLog(data.logs || [])
      }
    } catch (error) {
      console.error("Failed to fetch audit log:", error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Key copied to clipboard",
    })
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Never"
    return new Date(dateStr).toLocaleString()
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Key className="w-8 h-8 text-purple-500" />
            API Key Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage API keys for Mycorrhizae, MINDEX, NatureOS, and MycoBrain
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchKeys} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Key
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New API Key</DialogTitle>
                <DialogDescription>
                  Generate a new API key with specific scopes and rate limits.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="My API Key"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    placeholder="What this key is used for"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Service</Label>
                  <Select value={formService} onValueChange={setFormService}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Scopes</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                    {SCOPES.map((scope) => (
                      <div key={scope.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={scope.value}
                          checked={formScopes.includes(scope.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormScopes([...formScopes, scope.value])
                            } else {
                              setFormScopes(formScopes.filter((s) => s !== scope.value))
                            }
                          }}
                        />
                        <label htmlFor={scope.value} className="text-sm cursor-pointer">
                          {scope.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Rate Limit (per minute)</Label>
                    <Input
                      type="number"
                      value={formRatePerMinute}
                      onChange={(e) => setFormRatePerMinute(parseInt(e.target.value))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Rate Limit (per day)</Label>
                    <Input
                      type="number"
                      value={formRatePerDay}
                      onChange={(e) => setFormRatePerDay(parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Expires In (days, leave empty for no expiration)</Label>
                  <Input
                    type="number"
                    placeholder="Never expires"
                    value={formExpiresInDays || ""}
                    onChange={(e) => setFormExpiresInDays(e.target.value ? parseInt(e.target.value) : null)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateKey} disabled={!formName}>
                  Create Key
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* New Key Display */}
      {newKey && (
        <Card className="mb-6 border-green-500 bg-green-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-500">
              <Shield className="w-5 h-5" />
              New API Key Created
            </CardTitle>
            <CardDescription>
              Copy this key now. It will not be shown again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-background p-3 rounded-md font-mono text-sm break-all">
                {newKey}
              </code>
              <Button size="icon" variant="outline" onClick={() => copyToClipboard(newKey)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setNewKey(null)}
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Keys Table */}
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active Keys</TabsTrigger>
          <TabsTrigger value="all">All Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Prefix</TableHead>
                    <TableHead>Scopes</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.filter((k) => k.is_active).map((key) => (
                    <TableRow key={key.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{key.name}</div>
                          {key.description && (
                            <div className="text-xs text-muted-foreground">{key.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{key.service}</Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs">{key.key_prefix}...</code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {key.scopes.slice(0, 3).map((scope) => (
                            <Badge key={scope} variant="secondary" className="text-xs">
                              {scope}
                            </Badge>
                          ))}
                          {key.scopes.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{key.scopes.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {key.usage_count.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatDate(key.last_used_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setSelectedKey(key)
                              fetchAuditLog(key.id)
                            }}
                          >
                            <Activity className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRotateKey(key.id)}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => handleRevokeKey(key.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {keys.filter((k) => k.is_active).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No active API keys. Create one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Usage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((key) => (
                    <TableRow key={key.id} className={!key.is_active ? "opacity-50" : ""}>
                      <TableCell>{key.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{key.service}</Badge>
                      </TableCell>
                      <TableCell>
                        {key.is_active ? (
                          <Badge variant="default" className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Revoked</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(key.created_at)}</TableCell>
                      <TableCell>{formatDate(key.expires_at)}</TableCell>
                      <TableCell>{key.usage_count.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Audit Log Dialog */}
      {selectedKey && (
        <Dialog open={!!selectedKey} onOpenChange={() => setSelectedKey(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Audit Log: {selectedKey.name}</DialogTitle>
              <DialogDescription>
                Recent activity for this API key
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLog.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Badge variant={entry.action === "rate_limited" ? "destructive" : "outline"}>
                          {entry.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs">{entry.endpoint || "-"}</code>
                      </TableCell>
                      <TableCell>{entry.ip_address || "-"}</TableCell>
                      <TableCell>{formatDate(entry.created_at)}</TableCell>
                    </TableRow>
                  ))}
                  {auditLog.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No audit log entries
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
