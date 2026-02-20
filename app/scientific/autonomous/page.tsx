import { Metadata } from 'next'
import { NeuromorphicProvider } from '@/components/ui/neuromorphic'
import { AutonomousExperimentDashboard } from '@/components/autonomous/autonomous-experiment-dashboard'

export const metadata: Metadata = {
  title: 'Autonomous Research | MYCA Scientific',
  description: 'AI-driven autonomous scientific experimentation and hypothesis generation',
}

export default function AutonomousPage() {
  return (
    <NeuromorphicProvider>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Autonomous Research</h1>
        <p className="text-muted-foreground">AI-driven closed-loop experimentation with minimal human intervention</p>
      </div>

      <AutonomousExperimentDashboard />
    </div>
    </NeuromorphicProvider>
  )
}
