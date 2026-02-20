import { Metadata } from 'next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NeuromorphicProvider } from '@/components/ui/neuromorphic'
import { ProteinStructureViewer } from '@/components/3d/protein-structure-viewer'
import { Mycelium3DNetwork } from '@/components/3d/mycelium-3d-network'
import { LabDigitalTwin } from '@/components/3d/lab-digital-twin'

export const metadata: Metadata = {
  title: '3D Visualization | MYCA Scientific',
  description: 'Immersive 3D visualization of proteins, mycelium networks, and lab environments',
}

export default function ThreeDPage() {
  return (
    <NeuromorphicProvider>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">3D Visualization</h1>
        <p className="text-muted-foreground">Explore proteins, mycelium networks, and the lab in 3D</p>
      </div>

      <Tabs defaultValue="protein">
        <TabsList>
          <TabsTrigger value="protein">Protein Viewer</TabsTrigger>
          <TabsTrigger value="mycelium">Mycelium Network</TabsTrigger>
          <TabsTrigger value="lab">Lab Digital Twin</TabsTrigger>
        </TabsList>

        <TabsContent value="protein" className="mt-4">
          <ProteinStructureViewer />
        </TabsContent>

        <TabsContent value="mycelium" className="mt-4">
          <Mycelium3DNetwork />
        </TabsContent>

        <TabsContent value="lab" className="mt-4">
          <LabDigitalTwin />
        </TabsContent>
      </Tabs>
    </div>
    </NeuromorphicProvider>
  )
}
