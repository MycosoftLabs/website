'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Key, Plus, Copy, Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

interface ApiKey {
  id: string
  name: string
  prefix: string
  scope: 'read' | 'write' | 'admin'
  createdAt: string
  lastUsed: string
  status: 'active' | 'revoked'
}

const initialKeys: ApiKey[] = [
  { id: '1', name: 'Production API', prefix: 'sk-myco-prod-xxxx', scope: 'admin', createdAt: 'Jan 15, 2026', lastUsed: '2 min ago', status: 'active' },
  { id: '2', name: 'CI/CD Pipeline', prefix: 'sk-myco-ci-xxxx', scope: 'write', createdAt: 'Feb 1, 2026', lastUsed: '1h ago', status: 'active' },
  { id: '3', name: 'Read-only Dashboard', prefix: 'sk-myco-dash-xxxx', scope: 'read', createdAt: 'Feb 20, 2026', lastUsed: '3h ago', status: 'active' },
  { id: '4', name: 'Old Integration', prefix: 'sk-myco-old-xxxx', scope: 'write', createdAt: 'Nov 10, 2025', lastUsed: '30d ago', status: 'revoked' },
]

const scopeColors: Record<string, string> = {
  read: 'bg-green-500',
  write: 'bg-blue-500',
  admin: 'bg-purple-500',
}

export default function PlatformApiKeysPage() {
  const { user } = useAuth()
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyScope, setNewKeyScope] = useState('read')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())

  const isAdmin = user?.email === 'morgan@mycosoft.org' || user?.role === 'admin' || user?.role === 'owner'

  const handleCreate = () => {
    if (!newKeyName) return
    const key: ApiKey = {
      id: `k-${Date.now()}`,
      name: newKeyName,
      prefix: `sk-myco-${newKeyName.toLowerCase().replace(/\s+/g, '-').slice(0, 6)}-xxxx`,
      scope: newKeyScope as ApiKey['scope'],
      createdAt: 'Just now',
      lastUsed: 'Never',
      status: 'active',
    }
    setKeys([key, ...keys])
    setNewKeyName('')
    setDialogOpen(false)
  }

  const handleRevoke = (id: string) => {
    setKeys(keys.map(k => k.id === id ? { ...k, status: 'revoked' as const } : k))
  }

  const toggleVisible = (id: string) => {
    const next = new Set(visibleKeys)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setVisibleKeys(next)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">Manage API keys for programmatic access</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Create Key</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium">Key Name</label>
                  <Input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Production API"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Scope</label>
                  <Select value={newKeyScope} onValueChange={setNewKeyScope}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="read">Read Only</SelectItem>
                      <SelectItem value="write">Read & Write</SelectItem>
                      <SelectItem value="admin">Admin (Full Access)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <p>The full key will only be shown once after creation. Store it securely.</p>
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={!newKeyName}>
                  Create Key
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Active Keys
          </CardTitle>
          <CardDescription>{keys.filter(k => k.status === 'active').length} active keys</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {keys.map((key) => (
              <div key={key.id} className="flex items-center gap-4 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{key.name}</span>
                    <Badge className={scopeColors[key.scope]}>{key.scope}</Badge>
                    {key.status === 'revoked' && <Badge variant="destructive">Revoked</Badge>}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <code className="text-sm text-muted-foreground font-mono">
                      {visibleKeys.has(key.id) ? key.prefix.replace('xxxx', 'a1b2c3d4') : key.prefix}
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Created {key.createdAt} &middot; Last used {key.lastUsed}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => toggleVisible(key.id)}>
                    {visibleKeys.has(key.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Copy className="h-4 w-4" />
                  </Button>
                  {isAdmin && key.status === 'active' && (
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleRevoke(key.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
