import { Metadata } from 'next'
import { BioComputeDashboard } from '@/components/bio-compute/bio-compute-dashboard'

export const metadata: Metadata = {
  title: 'Bio-Compute | MYCA Scientific',
  description: 'MycoBrain biological computing and DNA data storage',
}

export default function BioComputePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bio-Compute</h1>
        <p className="text-muted-foreground">MycoBrain neuromorphic computing and DNA data storage</p>
      </div>

      <BioComputeDashboard />
    </div>
  )
}
