'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, UserPlus, Shield, Mail, Clock, Search } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

interface TeamMember {
  id: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'scientist' | 'viewer'
  status: 'active' | 'invited' | 'suspended'
  lastActive: string
}

const initialMembers: TeamMember[] = [
  { id: '1', name: 'Morgan', email: 'morgan@mycosoft.org', role: 'owner', status: 'active', lastActive: 'Now' },
  { id: '2', name: 'Garret', email: 'garret@mycosoft.org', role: 'admin', status: 'active', lastActive: '2h ago' },
  { id: '3', name: 'RJ', email: 'rj@mycosoft.org', role: 'admin', status: 'active', lastActive: '1h ago' },
  { id: '4', name: 'Chris', email: 'chris@mycosoft.org', role: 'scientist', status: 'active', lastActive: '30m ago' },
  { id: '5', name: 'Alberto', email: 'alberto@mycosoft.org', role: 'scientist', status: 'active', lastActive: '3h ago' },
  { id: '6', name: 'Abelardo', email: 'abelardo@mycosoft.org', role: 'scientist', status: 'active', lastActive: '5h ago' },
  { id: '7', name: 'MYCA', email: 'myca@mycosoft.org', role: 'viewer', status: 'active', lastActive: 'Always' },
  { id: '8', name: 'Michelle', email: 'michelle@mycosoft.org', role: 'admin', status: 'active', lastActive: '1d ago' },
]

const roleColors: Record<string, string> = {
  owner: 'bg-purple-500',
  admin: 'bg-blue-500',
  scientist: 'bg-green-500',
  viewer: 'bg-gray-500',
}

export default function PlatformTeamPage() {
  const { user } = useAuth()
  const [members, setMembers] = useState<TeamMember[]>(initialMembers)
  const [search, setSearch] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<string>('scientist')
  const [dialogOpen, setDialogOpen] = useState(false)

  const isOwnerOrAdmin = user?.email === 'morgan@mycosoft.org' || user?.role === 'admin' || user?.role === 'owner'
  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleInvite = () => {
    if (!inviteEmail || !inviteEmail.endsWith('@mycosoft.org')) return
    setMembers([...members, {
      id: `m-${Date.now()}`,
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole as TeamMember['role'],
      status: 'invited',
      lastActive: 'Never',
    }])
    setInviteEmail('')
    setDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">Manage team members and their roles</p>
        </div>
        {isOwnerOrAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><UserPlus className="h-4 w-4 mr-2" /> Invite Member</Button>
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
                    placeholder="name@mycosoft.org"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Must be a @mycosoft.org email</p>
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
                <Button onClick={handleInvite} className="w-full" disabled={!inviteEmail.endsWith('@mycosoft.org')}>
                  Send Invitation
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {members.length} members
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.map((member) => (
              <div key={member.id} className="flex items-center gap-4 p-4">
                <Avatar>
                  <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{member.name}</span>
                    <Badge className={roleColors[member.role]}>{member.role}</Badge>
                    {member.status === 'invited' && <Badge variant="outline">Pending</Badge>}
                    {member.status === 'suspended' && <Badge variant="destructive">Suspended</Badge>}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {member.email}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {member.lastActive}</span>
                  </div>
                </div>
                {isOwnerOrAdmin && member.role !== 'owner' && (
                  <Select defaultValue={member.role}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="scientist">Scientist</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
