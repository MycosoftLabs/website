import { Metadata } from 'next'
import { AdminConsole } from '@/components/platform/admin-console'

export const metadata: Metadata = {
  title: 'Platform Admin | MYCA',
  description: 'Organization management, federation, and platform settings',
}

export default function PlatformPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Platform Administration</h1>
        <p className="text-muted-foreground">Manage your organization, team, and research federation</p>
      </div>

      <AdminConsole />
    </div>
  )
}
