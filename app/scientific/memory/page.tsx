import { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const metadata: Metadata = {
  title: 'Memory System | MYCA',
  description: 'MYCA memory and knowledge management',
}

export default function MemoryPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Memory System</h1>
          <p className="text-muted-foreground">Manage MYCA memory and knowledge</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Facts Stored</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,847</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Knowledge Nodes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,543</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Embeddings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45K</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="conversations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="facts">Facts</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Graph</TabsTrigger>
        </TabsList>

        <TabsContent value="conversations">
          <Card>
            <CardHeader>
              <CardTitle>Recent Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="p-3 border rounded cursor-pointer hover:bg-accent">
                  <p className="font-medium">Protein Structure Query</p>
                  <p className="text-sm text-muted-foreground">10 min ago</p>
                </div>
                <div className="p-3 border rounded cursor-pointer hover:bg-accent">
                  <p className="font-medium">Experiment Design</p>
                  <p className="text-sm text-muted-foreground">1 hour ago</p>
                </div>
                <div className="p-3 border rounded cursor-pointer hover:bg-accent">
                  <p className="font-medium">MycoBrain Computation</p>
                  <p className="text-sm text-muted-foreground">3 hours ago</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="facts">
          <Card>
            <CardHeader>
              <CardTitle>Stored Facts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="p-3 border rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm">preferred_temperature</span>
                    <span className="text-sm bg-blue-500/10 text-blue-500 px-2 py-1 rounded">user</span>
                  </div>
                  <p className="text-sm font-medium mt-1">25C</p>
                </div>
                <div className="p-3 border rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm">pleurotus_optimal_humidity</span>
                    <span className="text-sm bg-purple-500/10 text-purple-500 px-2 py-1 rounded">system</span>
                  </div>
                  <p className="text-sm font-medium mt-1">85-95%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge">
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Graph</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-muted rounded flex items-center justify-center">
                <p className="text-muted-foreground">Interactive knowledge graph visualization</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
