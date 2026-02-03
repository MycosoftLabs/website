import { Metadata } from 'next'
import { LabMonitor } from '@/components/scientific/lab-monitor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Laboratory | MYCA Scientific',
  description: 'Laboratory instrument control and monitoring',
}

export default function LabPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Laboratory Control</h1>
          <p className="text-muted-foreground">Monitor and control lab instruments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Calibrate All</Button>
          <Button>Add Instrument</Button>
        </div>
      </div>

      <LabMonitor />

      <Card>
        <CardHeader>
          <CardTitle>Lab Protocols</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <p className="font-medium">Fungal Culture Inoculation</p>
                <p className="text-sm text-muted-foreground">Standard protocol for starting fungal cultures</p>
              </div>
              <span className="text-sm bg-green-500/10 text-green-500 px-2 py-1 rounded">Active</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <p className="font-medium">DNA Extraction</p>
                <p className="text-sm text-muted-foreground">Genomic DNA extraction from mycelium</p>
              </div>
              <span className="text-sm bg-gray-500/10 text-gray-500 px-2 py-1 rounded">Available</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <p className="font-medium">Bioelectric Recording</p>
                <p className="text-sm text-muted-foreground">FCI electrode recording protocol</p>
              </div>
              <span className="text-sm bg-gray-500/10 text-gray-500 px-2 py-1 rounded">Available</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
