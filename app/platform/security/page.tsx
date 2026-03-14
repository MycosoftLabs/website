'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Shield, Lock, KeyRound, FileCheck, AlertTriangle, CheckCircle2 } from 'lucide-react'

const securityPolicies = [
  { label: 'Enforce SSO', description: 'Require single sign-on for all team members', enabled: true },
  { label: 'Two-Factor Authentication', description: 'Require 2FA for all users', enabled: true },
  { label: 'Session Timeout', description: 'Auto-logout after 8 hours of inactivity', enabled: true },
  { label: 'IP Allowlist', description: 'Restrict access to approved IP addresses', enabled: false },
  { label: 'Audit Logging', description: 'Log all user actions for compliance', enabled: true },
  { label: 'Data Encryption at Rest', description: 'Encrypt all stored data with AES-256', enabled: true },
]

const recentEvents = [
  { time: '10:30 AM', event: 'Login from new device', user: 'chris@mycosoft.org', severity: 'warning' },
  { time: '10:15 AM', event: 'Password changed', user: 'alberto@mycosoft.org', severity: 'info' },
  { time: '09:45 AM', event: 'API key created', user: 'garret@mycosoft.org', severity: 'info' },
  { time: '09:30 AM', event: 'Failed login attempt', user: 'unknown@external.com', severity: 'error' },
  { time: '09:00 AM', event: 'SSO configuration updated', user: 'morgan@mycosoft.org', severity: 'info' },
  { time: '08:30 AM', event: 'Member role changed', user: 'rj@mycosoft.org', severity: 'info' },
]

const complianceChecks = [
  { label: 'SOC 2 Type II', status: 'compliant' },
  { label: 'GDPR Data Processing', status: 'compliant' },
  { label: 'HIPAA (if applicable)', status: 'not-applicable' },
  { label: 'Data Retention Policy', status: 'compliant' },
  { label: 'Access Control Review', status: 'review-needed' },
]

export default function PlatformSecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Security & Compliance</h1>
        <p className="text-muted-foreground">Manage security policies and monitor compliance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Security Policies
            </CardTitle>
            <CardDescription>Configure organization-wide security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {securityPolicies.map((policy) => (
              <div key={policy.label} className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{policy.label}</Label>
                  <p className="text-sm text-muted-foreground">{policy.description}</p>
                </div>
                <Switch defaultChecked={policy.enabled} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Compliance Status
            </CardTitle>
            <CardDescription>Regulatory and policy compliance checks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {complianceChecks.map((check) => (
              <div key={check.label} className="flex items-center justify-between p-3 border rounded-lg">
                <span className="font-medium">{check.label}</span>
                {check.status === 'compliant' && (
                  <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Compliant</Badge>
                )}
                {check.status === 'review-needed' && (
                  <Badge variant="outline" className="text-amber-500 border-amber-500">
                    <AlertTriangle className="h-3 w-3 mr-1" /> Review Needed
                  </Badge>
                )}
                {check.status === 'not-applicable' && (
                  <Badge variant="outline">N/A</Badge>
                )}
              </div>
            ))}
            <Button variant="outline" className="w-full mt-4">
              <KeyRound className="h-4 w-4 mr-2" />
              Run Full Compliance Audit
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Events
          </CardTitle>
          <CardDescription>Recent security-related activity</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {recentEvents.map((evt, i) => (
                <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    evt.severity === 'error' ? 'bg-red-500' :
                    evt.severity === 'warning' ? 'bg-amber-500' : 'bg-green-500'
                  }`} />
                  <span className="text-sm text-muted-foreground w-20">{evt.time}</span>
                  <span className="text-sm flex-1">{evt.event}</span>
                  <span className="text-sm text-muted-foreground">{evt.user}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
