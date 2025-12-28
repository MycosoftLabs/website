"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Atom, Search, Beaker, FlaskConical, Dna, Activity, Database, FileText, Download } from "lucide-react"

const COMPOUNDS = [
  { id: "1", name: "Psilocybin", formula: "C12H17N2O4P", weight: 284.25, source: "Psilocybe cubensis", activity: ["Psychoactive", "Serotonergic"] },
  { id: "2", name: "Ergothioneine", formula: "C9H15N3O2S", weight: 229.30, source: "Multiple species", activity: ["Antioxidant", "Cytoprotective"] },
  { id: "3", name: "Beta-glucan", formula: "(C6H10O5)n", weight: 2000, source: "Multiple species", activity: ["Immunomodulatory"] },
  { id: "4", name: "Hericenones", formula: "C35H54O11", weight: 666.80, source: "Hericium erinaceus", activity: ["Neurotrophic", "NGF-inducing"] },
  { id: "5", name: "Lentinan", formula: "(C6H10O5)n", weight: 500000, source: "Lentinula edodes", activity: ["Antitumor", "Immunostimulant"] },
  { id: "6", name: "Ganoderic acid", formula: "C30H44O7", weight: 532.67, source: "Ganoderma lucidum", activity: ["Hepatoprotective", "Antitumor"] },
  { id: "7", name: "Cordycepin", formula: "C10H13N5O3", weight: 251.24, source: "Cordyceps militaris", activity: ["Antiviral", "Antitumor"] },
  { id: "8", name: "Muscimol", formula: "C4H6N2O2", weight: 114.10, source: "Amanita muscaria", activity: ["GABAergic", "Psychoactive"] },
]

export default function CompoundSimPage() {
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState(COMPOUNDS[0])

  const filtered = COMPOUNDS.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.source.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Compound Analyzer</h1>
          <p className="text-muted-foreground">Explore bioactive compounds from fungi</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Database className="h-4 w-4 mr-2" /> MINDEX Database</Button>
          <Button><FlaskConical className="h-4 w-4 mr-2" /> Run Simulation</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total Compounds</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{COMPOUNDS.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Medicinal</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-500">{COMPOUNDS.filter(c => c.activity.some(a => a.includes("Antitumor") || a.includes("Antiviral"))).length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Psychoactive</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-purple-500">{COMPOUNDS.filter(c => c.activity.includes("Psychoactive")).length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Neurotrophic</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-500">{COMPOUNDS.filter(c => c.activity.some(a => a.includes("Neurotrophic") || a.includes("NGF"))).length}</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compound List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Compound Library</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search compounds..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {filtered.map(compound => (
              <div 
                key={compound.id} 
                className={`p-3 rounded-lg cursor-pointer transition-colors ${selected.id === compound.id ? "bg-primary/10 border border-primary" : "hover:bg-muted"}`}
                onClick={() => setSelected(compound)}
              >
                <div className="font-medium">{compound.name}</div>
                <div className="text-sm text-muted-foreground">{compound.source}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Compound Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Atom className="h-5 w-5" /> {selected.name}
                </CardTitle>
                <CardDescription>{selected.source}</CardDescription>
              </div>
              <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" /> Export</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Molecular Structure Placeholder */}
            <div className="h-48 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg flex items-center justify-center border">
              <div className="text-center">
                <Atom className="h-16 w-16 mx-auto mb-2 text-primary/50" />
                <p className="text-muted-foreground">3D Molecular Structure</p>
                <p className="text-xs text-muted-foreground mt-1">{selected.formula}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Chemical Formula</h4>
                <code className="bg-muted px-2 py-1 rounded text-lg">{selected.formula}</code>
              </div>
              <div>
                <h4 className="font-medium mb-2">Molecular Weight</h4>
                <p className="text-lg">{selected.weight.toLocaleString()} g/mol</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Biological Activity</h4>
              <div className="flex flex-wrap gap-2">
                {selected.activity.map(a => (
                  <Badge key={a} variant="secondary">{a}</Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1"><Beaker className="h-4 w-4 mr-2" /> Simulate Binding</Button>
              <Button variant="outline" className="flex-1"><Dna className="h-4 w-4 mr-2" /> Gene Expression</Button>
              <Button variant="outline" className="flex-1"><FileText className="h-4 w-4 mr-2" /> Research Papers</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
