'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Building2, Users, Settings, Shield, Activity, Globe, 
  Plus, UserPlus, Trash2, Edit, Key, BarChart3, Link
} from 'lucide-react'

interface Organization {
  id: string
  name: string
  plan: string
  status: string
  memberCount: number
  usagePercent: number
}

interface Member {
  id: string
  name: string
  email: string
  role: string
  status: string
  avatar?: string
}

interface FederationPeer {
  id: string
  name: string
  status: string
  lastSync: string
}

interface AuditLog {
  id: string
  timestamp: string
  user: string
  action: string
  resource: string
}

export function AdminConsole() {
  const [organization, setOrganization] = useState<Organization>({
    id: 'org-001',
    name: 'Mycosoft Research Lab',
    plan: 'enterprise',
    status: 'active',
    memberCount: 12,
    usagePercent: 67,
  })
  const [members, setMembers] = useState<Member[]>([])
  const [peers, setPeers] = useState<FederationPeer[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('scientist')
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)

  useEffect(() => {
    setMembers([
      { id: 'm-001', name: 'Dr. Sarah Chen', email: 'sarah@mycosoft.com', role: 'owner', status: 'active', avatar: '' },
      { id: 'm-002', name: 'James Wilson', email: 'james@mycosoft.com', role: 'admin', status: 'active' },
      { id: 'm-003', name: 'Dr. Maya Patel', email: 'maya@mycosoft.com', role: 'scientist', status: 'active' },
      { id: 'm-004', name: 'Alex Kim', email: 'alex@mycosoft.com', role: 'scientist', status: 'active' },
      { id: 'm-005', name: 'New Researcher', email: 'new@mycosoft.com', role: 'viewer', status: 'invited' },
    ])

    setPeers([
      { id: 'peer-001', name: 'University of Mycology', status: 'connected', lastSync: '5 min ago' },
      { id: 'peer-002', name: 'Fungal Research Institute', status: 'connected', lastSync: '1 hour ago' },
      { id: 'peer-003', name: 'Bio-Compute Consortium', status: 'pending', lastSync: 'Never' },
    ])

    setAuditLogs([
      { id: 'log-001', timestamp: '2026-02-03 10:30:00', user: 'sarah@mycosoft.com', action: 'experiment.create', resource: 'E-044' },
      { id: 'log-002', timestamp: '2026-02-03 10:25:00', user: 'james@mycosoft.com', action: 'member.invite', resource: 'new@mycosoft.com' },
      { id: 'log-003', timestamp: '2026-02-03 10:20:00', user: 'maya@mycosoft.com', action: 'simulation.start', resource: 'sim-008' },
      { id: 'log-004', timestamp: '2026-02-03 10:15:00', user: 'system', action: 'federation.sync', resource: 'peer-001' },
      { id: 'log-005', timestamp: '2026-02-03 10:10:00', user: 'alex@mycosoft.com', action: 'data.export', resource: 'dataset-023' },
    ])
  }, [])

  const roleColors: Record<string, string> = {
    owner: 'bg-purple-500',
    admin: 'bg-blue-500',
    scientist: 'bg-green-500',
    viewer: 'bg-gray-500',
  }

  const handleInvite = () => {
    const newMember: Member = {
      id: `m-${Date.now()}`,
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      status: 'invited',
    }
    setMembers([...members, newMember])
    setInviteEmail('')
    setIsInviteDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Organization Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle>{organization.name}</CardTitle>
                <CardDescription>Organization ID: {organization.id}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{organization.plan}</Badge>
              <Badge className="bg-green-500">{organization.status}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Members</p>
              <p className="text-2xl font-bold">{organization.memberCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Usage</p>
              <div className="flex items-center gap-2">
                <Progress value={organization.usagePercent} className="flex-1 h-2" />
                <span className="text-sm font-medium">{organization.usagePercent}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Federation Peers</p>
              <p className="text-2xl font-bold">{peers.filter(p => p.status === 'connected').length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">API Calls Today</p>
              <p className="text-2xl font-bold">12,847</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members"><Users className="h-4 w-4 mr-2" /> Members</TabsTrigger>
          <TabsTrigger value="federation"><Globe className="h-4 w-4 mr-2" /> Federation</TabsTrigger>
          <TabsTrigger value="audit"><Shield className="h-4 w-4 mr-2" /> Audit Log</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-2" /> Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-base">Team Members</CardTitle>
              <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> Invite</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium">Email Address</label>
                      <Input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@organization.com"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Role</label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="scientist">Scientist</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleInvite} className="w-full">Send Invitation</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Avatar>
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.name}</span>
                        <Badge className={roleColors[member.role]}>{member.role}</Badge>
                        {member.status === 'invited' && <Badge variant="outline">Pending</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost"><Edit className="h-4 w-4" /></Button>
                      {member.role !== 'owner' && (
                        <Button size="sm" variant="ghost" className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="federation" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-base">Federation Peers</CardTitle>
              <Button size="sm"><Link className="h-4 w-4 mr-1" /> Connect Peer</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {peers.map((peer) => (
                  <div key={peer.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="p-2 rounded bg-blue-500/20">
                      <Globe className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <span className="font-medium">{peer.name}</span>
                      <p className="text-sm text-muted-foreground">Last sync: {peer.lastSync}</p>
                    </div>
                    <Badge variant={peer.status === 'connected' ? 'default' : 'outline'}>{peer.status}</Badge>
                    <Button size="sm" variant="outline">Sync</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 p-2 border-b">
                      <span className="text-xs text-muted-foreground w-40">{log.timestamp}</span>
                      <span className="text-sm w-48">{log.user}</span>
                      <Badge variant="outline" className="text-xs">{log.action}</Badge>
                      <span className="text-sm text-muted-foreground">{log.resource}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">API Access</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>API Key</span>
                    <Button size="sm" variant="outline"><Key className="h-4 w-4 mr-1" /> Regenerate</Button>
                  </div>
                  <Input value="sk-myco-xxxx-xxxx-xxxx" readOnly className="font-mono" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Data Retention</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Select defaultValue="365">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                      <SelectItem value="forever">Forever</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
