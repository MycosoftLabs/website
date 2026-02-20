import { Metadata } from 'next'
import { SimulationPanel } from '@/components/scientific/simulation-panel'
import {
  NeuCard,
  NeuCardContent,
  NeuCardHeader,
  NeuButton,
  NeuromorphicProvider,
} from '@/components/ui/neuromorphic'
import { Progress } from '@/components/ui/progress'

export const metadata: Metadata = {
  title: 'Simulations | MYCA Scientific',
  description: 'Scientific simulations and computational experiments',
}

export default function SimulationPage() {
  return (
    <NeuromorphicProvider>
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Simulation Center</h1>
          <p className="text-muted-foreground">Run and manage scientific simulations</p>
        </div>
        <NeuButton variant="primary">New Simulation</NeuButton>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <NeuCard>
          <NeuCardHeader className="pb-2">
            <h3 className="text-sm font-medium">GPU Utilization</h3>
          </NeuCardHeader>
          <NeuCardContent>
            <div className="text-2xl font-bold">78%</div>
            <Progress value={78} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">RTX 5090 - 24GB VRAM</p>
          </NeuCardContent>
        </NeuCard>
        <NeuCard>
          <NeuCardHeader className="pb-2">
            <h3 className="text-sm font-medium">Active Jobs</h3>
          </NeuCardHeader>
          <NeuCardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Queue: 7 pending</p>
          </NeuCardContent>
        </NeuCard>
        <NeuCard>
          <NeuCardHeader className="pb-2">
            <h3 className="text-sm font-medium">Completed Today</h3>
          </NeuCardHeader>
          <NeuCardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Avg time: 45 min</p>
          </NeuCardContent>
        </NeuCard>
      </div>

      <SimulationPanel />
    </div>
    </NeuromorphicProvider>
  )
}
