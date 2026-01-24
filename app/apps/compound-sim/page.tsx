"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Atom, Search, Beaker, FlaskConical, Dna, Activity, Database, FileText, Download, Loader2, AlertCircle, CheckCircle2, Save, ExternalLink, Sparkles } from "lucide-react"
import { fetchCompounds, searchChemSpider, enrichCompoundFromChemSpider } from "@/lib/data/compounds"

interface MINDEXCompound {
  id: string
  name: string
  formula: string
  weight: number
  source: string
  activity: string[]
  smiles?: string
  inchi?: string
  inchikey?: string
  cas?: string
  pubchemId?: string
  chemspiderId?: number
}

export default function CompoundSimPage() {
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<MINDEXCompound | null>(null)
  const [mindexCompounds, setMindexCompounds] = useState<MINDEXCompound[]>([])
  const [loadingMindex, setLoadingMindex] = useState(false)
  const [mindexConnected, setMindexConnected] = useState(false)
  const [simulationResults, setSimulationResults] = useState<any>(null)
  const [simulating, setSimulating] = useState(false)
  const [chemspiderResults, setChemspiderResults] = useState<any[]>([])
  const [searchingChemSpider, setSearchingChemSpider] = useState(false)
  const [enriching, setEnriching] = useState(false)

  // Fetch compounds from MINDEX API directly
  useEffect(() => {
    const fetchMINDEXCompounds = async () => {
      setLoadingMindex(true)
      try {
        // Try direct MINDEX API first
        const result = await fetchCompounds({ limit: 100 })
        
        if (result.data && result.data.length > 0) {
          const compounds = result.data.map(c => ({
            id: c.id,
            name: c.name,
            formula: c.formula || "",
            weight: c.molecular_weight || 0,
            source: c.source || "MINDEX",
            activity: c.activities?.map(a => a.activity_name) || [],
            smiles: c.smiles,
            inchi: c.inchi,
            inchikey: c.inchikey,
            chemspiderId: c.chemspider_id,
            pubchemId: c.pubchem_id?.toString(),
          }))
          setMindexCompounds(compounds)
          setMindexConnected(true)
          if (!selected && compounds.length) {
            setSelected(compounds[0])
          }
        } else {
          // Fallback to existing API
          const response = await fetch("/api/natureos/mindex/compounds")
          if (response.ok) {
            const data = await response.json()
            setMindexCompounds(data.compounds || [])
            setMindexConnected(true)
            if (!selected && Array.isArray(data.compounds) && data.compounds.length) {
              setSelected(data.compounds[0])
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch MINDEX compounds:", error)
        setMindexConnected(false)
      } finally {
        setLoadingMindex(false)
      }
    }
    fetchMINDEXCompounds()
  }, [])

  // Search ChemSpider when search query changes
  const handleChemSpiderSearch = async () => {
    if (!search || search.length < 3) return
    
    setSearchingChemSpider(true)
    try {
      const results = await searchChemSpider(search, "name", 10)
      setChemspiderResults(results.results || [])
    } catch (error) {
      console.error("ChemSpider search failed:", error)
    } finally {
      setSearchingChemSpider(false)
    }
  }

  // Enrich selected compound from ChemSpider
  const handleEnrichFromChemSpider = async () => {
    if (!selected) return
    
    setEnriching(true)
    try {
      const result = await enrichCompoundFromChemSpider({
        compound_id: selected.id,
        compound_name: selected.name,
        chemspider_id: selected.chemspiderId,
        smiles: selected.smiles,
        inchikey: selected.inchikey,
      })
      
      if (result.success) {
        // Refresh compound data
        const refreshed = await fetchCompounds({ search: selected.name, limit: 1 })
        if (refreshed.data?.[0]) {
          const updated = {
            ...selected,
            formula: refreshed.data[0].formula || selected.formula,
            weight: refreshed.data[0].molecular_weight || selected.weight,
            smiles: refreshed.data[0].smiles || selected.smiles,
            inchi: refreshed.data[0].inchi || selected.inchi,
            inchikey: refreshed.data[0].inchikey || selected.inchikey,
            chemspiderId: refreshed.data[0].chemspider_id || selected.chemspiderId,
          }
          setSelected(updated)
        }
        alert(`Enriched with ${result.enriched_fields?.length || 0} fields from ChemSpider!`)
      } else {
        alert(result.message || "Enrichment failed")
      }
    } catch (error) {
      console.error("Enrichment failed:", error)
    } finally {
      setEnriching(false)
    }
  }

  const filtered = mindexCompounds.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.source.toLowerCase().includes(search.toLowerCase())
  )

  const runSimulation = async () => {
    if (!selected) return
    setSimulating(true)
    try {
      const response = await fetch("/api/compounds/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          compoundId: selected.id,
          formula: selected.formula,
          type: "binding",
        }),
      })
      const data = await response.json()
      setSimulationResults(data)
    } catch (error) {
      console.error("Simulation failed:", error)
    } finally {
      setSimulating(false)
    }
  }

  const saveSimulation = async () => {
    if (!simulationResults) return
    if (!selected) return
    try {
      await fetch("/api/compounds/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          compoundId: selected.id,
          results: simulationResults,
          timestamp: new Date().toISOString(),
        }),
      })
      alert("Simulation saved to database for model training!")
    } catch (error) {
      console.error("Failed to save simulation:", error)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Compound Analyzer</h1>
          <p className="text-muted-foreground">Explore bioactive compounds from fungi</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/natureos/mindex">
              <Database className="h-4 w-4 mr-2" />
              MINDEX
              {mindexConnected ? (
                <CheckCircle2 className="h-3 w-3 ml-2 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 ml-2 text-yellow-500" />
              )}
            </Link>
          </Button>
          <Button onClick={runSimulation} disabled={simulating}>
            {simulating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FlaskConical className="h-4 w-4 mr-2" />
            )}
            Run Simulation
          </Button>
        </div>
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
            {/* Search ChemSpider button */}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mb-2"
              onClick={handleChemSpiderSearch}
              disabled={searchingChemSpider || search.length < 3}
            >
              {searchingChemSpider ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Search ChemSpider
            </Button>

            {/* ChemSpider Results */}
            {chemspiderResults.length > 0 && (
              <div className="mb-4 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-2">ChemSpider Results:</p>
                {chemspiderResults.slice(0, 5).map((r: any) => (
                  <div 
                    key={r.chemspider_id}
                    className="p-2 rounded hover:bg-purple-100 dark:hover:bg-purple-900/40 cursor-pointer text-sm"
                    onClick={() => setSelected({
                      id: `cs-${r.chemspider_id}`,
                      name: r.name || "Unknown",
                      formula: r.formula || "",
                      weight: r.molecular_weight || 0,
                      source: "ChemSpider",
                      activity: [],
                      smiles: r.smiles,
                      inchikey: r.inchikey,
                      chemspiderId: r.chemspider_id,
                    })}
                  >
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{r.formula}</div>
                  </div>
                ))}
              </div>
            )}

            {/* MINDEX Compounds */}
            {filtered.length ? filtered.map(compound => (
              <div 
                key={compound.id} 
                className={`p-3 rounded-lg cursor-pointer transition-colors ${selected?.id === compound.id ? "bg-primary/10 border border-primary" : "hover:bg-muted"}`}
                onClick={() => setSelected(compound)}
              >
                <div className="font-medium">{compound.name}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  {compound.source}
                  {compound.chemspiderId && (
                    <Badge variant="outline" className="text-xs">CS{compound.chemspiderId}</Badge>
                  )}
                </div>
              </div>
            )) : (
              <div className="text-sm text-muted-foreground">
                {loadingMindex ? "Loading from MINDEX…" : "No compounds available. Try searching ChemSpider."}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compound Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-start">
              {selected ? (
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Atom className="h-5 w-5" /> {selected.name}
                  </CardTitle>
                  <CardDescription>{selected.source}</CardDescription>
                </div>
              ) : (
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Atom className="h-5 w-5" /> Select a compound
                  </CardTitle>
                  <CardDescription>Requires compounds from MINDEX</CardDescription>
                </div>
              )}
              <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" /> Export</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Molecular Structure Placeholder */}
            <div className="h-48 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg flex items-center justify-center border">
              <div className="text-center">
                <Atom className="h-16 w-16 mx-auto mb-2 text-primary/50" />
                <p className="text-muted-foreground">3D Molecular Structure</p>
                <p className="text-xs text-muted-foreground mt-1">{selected?.formula || "—"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Chemical Formula</h4>
                <code className="bg-muted px-2 py-1 rounded text-lg">{selected?.formula || "—"}</code>
              </div>
              <div>
                <h4 className="font-medium mb-2">Molecular Weight</h4>
                <p className="text-lg">{selected ? `${selected.weight.toLocaleString()} g/mol` : "—"}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Biological Activity</h4>
              <div className="flex flex-wrap gap-2">
                {(selected?.activity || []).map(a => (
                  <Badge key={a} variant="secondary">{a}</Badge>
                ))}
              </div>
            </div>

            <Tabs defaultValue="structure" className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="structure">Structure</TabsTrigger>
                <TabsTrigger value="simulation">Simulation</TabsTrigger>
                <TabsTrigger value="research">Research</TabsTrigger>
              </TabsList>
              
              <TabsContent value="structure" className="space-y-4">
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={runSimulation} disabled={simulating || !selected}>
                    <Beaker className="h-4 w-4 mr-2" /> Simulate Binding
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={handleEnrichFromChemSpider} disabled={enriching || !selected}>
                    {enriching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Enrich Data
                  </Button>
                </div>
                {selected?.smiles && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">SMILES Notation:</p>
                    <code className="text-sm break-all">{selected.smiles}</code>
                  </div>
                )}
                {selected?.inchi && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">InChI:</p>
                    <code className="text-xs break-all">{selected.inchi}</code>
                  </div>
                )}
                {selected?.inchikey && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">InChIKey:</p>
                    <code className="text-sm">{selected.inchikey}</code>
                  </div>
                )}
                {/* External Links */}
                <div className="flex gap-2">
                  {selected?.chemspiderId && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`https://www.chemspider.com/Chemical-Structure.${selected.chemspiderId}.html`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1" /> ChemSpider
                      </a>
                    </Button>
                  )}
                  {selected?.pubchemId && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`https://pubchem.ncbi.nlm.nih.gov/compound/${selected.pubchemId}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1" /> PubChem
                      </a>
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="simulation" className="space-y-4">
                {simulationResults ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <h4 className="font-medium mb-2">Simulation Complete</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Binding Affinity</p>
                          <p className="font-bold">{simulationResults.bindingAffinity} kcal/mol</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Stability</p>
                          <p className="font-bold">{simulationResults.stability}%</p>
                        </div>
                      </div>
                    </div>
                    <Button onClick={saveSimulation} className="w-full">
                      <Save className="h-4 w-4 mr-2" /> Save to Database
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Run a simulation to see results</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="research" className="space-y-4">
                <Button variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" /> Search PubMed
                </Button>
                <Button variant="outline" className="w-full">
                  <Database className="h-4 w-4 mr-2" /> View in MINDEX
                </Button>
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" /> Export Data
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
