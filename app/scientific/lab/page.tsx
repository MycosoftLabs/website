import { Metadata } from 'next'
import { LabMonitor } from '@/components/scientific/lab-monitor'
import {
  NeuCard,
  NeuCardContent,
  NeuCardHeader,
  NeuButton,
  NeuromorphicProvider,
} from '@/components/ui/neuromorphic'

export const metadata: Metadata = {
  title: 'Laboratory | MYCA Scientific',
  description: 'Laboratory instrument control and monitoring',
}

export default function LabPage() {
  return (
    <NeuromorphicProvider>
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Laboratory Control</h1>
          <p className="text-muted-foreground">Monitor and control lab instruments</p>
        </div>
        <div className="flex gap-2">
          <NeuButton variant="default">Calibrate All</NeuButton>
          <NeuButton variant="primary">Add Instrument</NeuButton>
        </div>
      </div>

      <LabMonitor />

      <NeuCard>
        <NeuCardHeader>
          <h3>Lab Protocols</h3>
        </NeuCardHeader>
        <NeuCardContent>
          <p className="text-sm text-muted-foreground">No data available.</p>
        </NeuCardContent>
      </NeuCard>
    </div>
    </NeuromorphicProvider>
  )
}
