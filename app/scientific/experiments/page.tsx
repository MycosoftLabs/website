import { Metadata } from 'next'
import { ExperimentTracker } from '@/components/scientific/experiment-tracker'
import {
  NeuCard,
  NeuCardContent,
  NeuCardHeader,
  NeuButton,
  NeuromorphicProvider,
} from '@/components/ui/neuromorphic'

export const metadata: Metadata = {
  title: 'Experiments | MYCA Scientific',
  description: 'Closed-loop experimentation and tracking',
}

export default function ExperimentsPage() {
  return (
    <NeuromorphicProvider>
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Experiment Management</h1>
          <p className="text-muted-foreground">Design, run, and analyze experiments</p>
        </div>
        <div className="flex gap-2">
          <NeuButton variant="default">Import Protocol</NeuButton>
          <NeuButton variant="primary">New Experiment</NeuButton>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <NeuCard>
          <NeuCardHeader className="pb-2">
            <h3 className="text-sm font-medium">Running</h3>
          </NeuCardHeader>
          <NeuCardContent>
            <div className="text-2xl font-bold text-blue-500">3</div>
          </NeuCardContent>
        </NeuCard>
        <NeuCard>
          <NeuCardHeader className="pb-2">
            <h3 className="text-sm font-medium">Pending</h3>
          </NeuCardHeader>
          <NeuCardContent>
            <div className="text-2xl font-bold text-yellow-500">9</div>
          </NeuCardContent>
        </NeuCard>
        <NeuCard>
          <NeuCardHeader className="pb-2">
            <h3 className="text-sm font-medium">Completed</h3>
          </NeuCardHeader>
          <NeuCardContent>
            <div className="text-2xl font-bold text-green-500">47</div>
          </NeuCardContent>
        </NeuCard>
        <NeuCard>
          <NeuCardHeader className="pb-2">
            <h3 className="text-sm font-medium">Failed</h3>
          </NeuCardHeader>
          <NeuCardContent>
            <div className="text-2xl font-bold text-red-500">2</div>
          </NeuCardContent>
        </NeuCard>
      </div>

      <ExperimentTracker />
    </div>
    </NeuromorphicProvider>
  )
}
