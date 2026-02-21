"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MoleculeViewer } from "@/components/visualizations/MoleculeViewer"
import { 
  FlaskConical, 
  Atom, 
  Beaker, 
  Dna, 
  Activity,
  Plus,
  Trash2,
  Download,
  Share2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Zap,
  Target,
  Shield,
  Microscope
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"

// Molecular scaffolds available for design
const SCAFFOLDS = [
  { id: "indole", name: "Indole", category: "Alkaloid", sources: ["Psilocybe", "Claviceps"] },
  { id: "ergoline", name: "Ergoline", category: "Ergot Alkaloid", sources: ["Claviceps purpurea"] },
  { id: "beta_carboline", name: "β-Carboline", category: "Alkaloid", sources: ["Various fungi"] },
  { id: "triterpene", name: "Lanostane", category: "Terpene", sources: ["Ganoderma lucidum"] },
  { id: "polyketide", name: "Macrolide core", category: "Polyketide", sources: ["Aspergillus", "Penicillium"] },
]

// Functional groups for modification
const FUNCTIONAL_GROUPS = [
  { id: "hydroxyl", name: "Hydroxyl (-OH)", effect: "+Antioxidant" },
  { id: "amino", name: "Amino (-NH₂)", effect: "+Antimicrobial" },
  { id: "methyl", name: "Methyl (-CH₃)", effect: "+Lipophilicity" },
  { id: "phosphate", name: "Phosphate (-PO₄)", effect: "+Solubility" },
  { id: "acetyl", name: "Acetyl (-COCH₃)", effect: "+Stability" },
  { id: "phenyl", name: "Phenyl (-C₆H₅)", effect: "+Binding" },
]

interface DesignedCompound {
  id: string
  name: string
  scaffold: string
  modifications: Array<{ position: number; group: string }>
  drugLikeness: number
  synthesizability: number
  toxicityRisk: number
  bioactivities: Record<string, number>
  molecularWeight: number
  logP: number
}

export function AlchemyLabContent() {
  const [selectedScaffold, setSelectedScaffold] = useState<string>("")
  const [modifications, setModifications] = useState<Array<{ position: number; group: string }>>([])
  const [compoundName, setCompoundName] = useState("")
  const [designing, setDesigning] = useState(false)
  const [designedCompounds, setDesignedCompounds] = useState<DesignedCompound[]>([])
  const [selectedCompound, setSelectedCompound] = useState<DesignedCompound | null>(null)
  const [synthesisPlan, setSynthesisPlan] = useState<any>(null)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Draw molecular visualization
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    // Clear canvas
    ctx.fillStyle = "#0a0a0a"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Draw molecular structure visualization
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    
    // Draw scaffold
    if (selectedScaffold) {
      const scaffold = SCAFFOLDS.find(s => s.id === selectedScaffold)
      
      // Draw hexagonal ring (simplified benzene)
      ctx.strokeStyle = "#22c55e"
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6 - Math.PI / 2
        const x = centerX + Math.cos(angle) * 60
        const y = centerY + Math.sin(angle) * 60
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.stroke()
      
      // Draw atoms
      ctx.fillStyle = "#22c55e"
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6 - Math.PI / 2
        const x = centerX + Math.cos(angle) * 60
        const y = centerY + Math.sin(angle) * 60
        ctx.beginPath()
        ctx.arc(x, y, 8, 0, Math.PI * 2)
        ctx.fill()
      }
      
      // Draw modifications
      modifications.forEach((mod, idx) => {
        const angle = (mod.position * Math.PI * 2) / 6 - Math.PI / 2
        const x = centerX + Math.cos(angle) * 100
        const y = centerY + Math.sin(angle) * 100
        
        // Line to modification
        ctx.strokeStyle = "#f59e0b"
        ctx.beginPath()
        ctx.moveTo(centerX + Math.cos(angle) * 60, centerY + Math.sin(angle) * 60)
        ctx.lineTo(x, y)
        ctx.stroke()
        
        // Modification group
        ctx.fillStyle = "#f59e0b"
        ctx.beginPath()
        ctx.arc(x, y, 12, 0, Math.PI * 2)
        ctx.fill()
        
        // Label
        ctx.fillStyle = "#fff"
        ctx.font = "10px monospace"
        ctx.textAlign = "center"
        ctx.fillText(mod.group.slice(0, 3).toUpperCase(), x, y + 25)
      })
      
      // Scaffold name
      ctx.fillStyle = "#888"
      ctx.font = "14px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(scaffold?.name || "", centerX, canvas.height - 20)
    } else {
      // Placeholder
      ctx.fillStyle = "#333"
      ctx.font = "16px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("Select a scaffold to begin", centerX, centerY)
    }
  }, [selectedScaffold, modifications])

  const addModification = () => {
    if (modifications.length < 6) {
      setModifications([...modifications, { position: modifications.length, group: "hydroxyl" }])
    }
  }

  const removeModification = (index: number) => {
    setModifications(modifications.filter((_, i) => i !== index))
  }

  const updateModification = (index: number, field: string, value: any) => {
    const updated = [...modifications]
    updated[index] = { ...updated[index], [field]: value }
    setModifications(updated)
  }

  const designCompound = async () => {
    if (!selectedScaffold) return
    
    setDesigning(true)
    
    // Simulate API call to design compound
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const compound: DesignedCompound = {
      id: `compound-${Date.now()}`,
      name: compoundName || `Design-${Date.now().toString(36)}`,
      scaffold: selectedScaffold,
      modifications: modifications,
      drugLikeness: 0.6 + Math.random() * 0.3,
      synthesizability: 0.5 + Math.random() * 0.4,
      toxicityRisk: 0.1 + Math.random() * 0.3,
      bioactivities: {
        neuroactive: Math.random() * 0.8,
        antimicrobial: Math.random() * 0.6,
        antioxidant: Math.random() * 0.7,
        anti_inflammatory: Math.random() * 0.5,
      },
      molecularWeight: 200 + modifications.length * 30 + Math.random() * 100,
      logP: 1 + Math.random() * 3,
    }
    
    setDesignedCompounds([compound, ...designedCompounds])
    setSelectedCompound(compound)
    setDesigning(false)
  }

  const planSynthesis = async () => {
    if (!selectedCompound) return
    
    // Simulate synthesis planning
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setSynthesisPlan({
      steps: [
        { step: 1, type: "fermentation", description: "Cultivate source organism", yield: 0.4, days: 14 },
        ...selectedCompound.modifications.map((mod, i) => ({
          step: i + 2,
          type: "enzymatic",
          description: `Add ${mod.group} group`,
          yield: 0.7 + Math.random() * 0.2,
          days: 1 + Math.random()
        }))
      ],
      totalYield: 0.3 + Math.random() * 0.2,
      estimatedCost: 200 + selectedCompound.modifications.length * 100,
      difficulty: selectedCompound.modifications.length > 3 ? "hard" : "medium"
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <FlaskConical className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Computational Alchemy Lab
                </h1>
                <p className="text-sm text-muted-foreground">
                  Design novel fungal compounds with AI-powered predictions
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-purple-400 border-purple-400/50">
              <Sparkles className="h-3 w-3 mr-1" />
              Powered by NLM
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Design Panel */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-purple-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Atom className="h-5 w-5 text-purple-400" />
                  Molecule Designer
                </CardTitle>
                <CardDescription>
                  Select a scaffold and add functional groups to design new compounds
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Scaffold Selection */}
                <div className="space-y-2">
                  <Label>Molecular Scaffold</Label>
                  <Select value={selectedScaffold} onValueChange={setSelectedScaffold}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a scaffold..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SCAFFOLDS.map(scaffold => (
                        <SelectItem key={scaffold.id} value={scaffold.id}>
                          <div className="flex items-center gap-2">
                            <span>{scaffold.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {scaffold.category}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedScaffold && (
                    <p className="text-xs text-muted-foreground">
                      Natural sources: {SCAFFOLDS.find(s => s.id === selectedScaffold)?.sources.join(", ")}
                    </p>
                  )}
                </div>

                {/* Molecular Visualization */}
                <div className="border rounded-lg bg-black/50 overflow-hidden">
                  <canvas 
                    ref={canvasRef}
                    width={500}
                    height={300}
                    className="w-full h-[300px]"
                  />
                </div>

                {/* Modifications */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Functional Group Modifications</Label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={addModification}
                      disabled={modifications.length >= 6}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Group
                    </Button>
                  </div>
                  
                  <AnimatePresence>
                    {modifications.map((mod, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Position</Label>
                            <Select 
                              value={mod.position.toString()} 
                              onValueChange={(v) => updateModification(index, "position", parseInt(v))}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[0, 1, 2, 3, 4, 5].map(pos => (
                                  <SelectItem key={pos} value={pos.toString()}>
                                    Position {pos + 1}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Group</Label>
                            <Select 
                              value={mod.group} 
                              onValueChange={(v) => updateModification(index, "group", v)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FUNCTIONAL_GROUPS.map(group => (
                                  <SelectItem key={group.id} value={group.id}>
                                    <span className="text-xs">{group.name}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeModification(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Compound Name */}
                <div className="space-y-2">
                  <Label>Compound Name (optional)</Label>
                  <Input 
                    value={compoundName}
                    onChange={(e) => setCompoundName(e.target.value)}
                    placeholder="e.g., Neo-Psilocybin-A1"
                  />
                </div>

                {/* Design Button */}
                <Button 
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  size="lg"
                  disabled={!selectedScaffold || designing}
                  onClick={designCompound}
                >
                  {designing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Designing Compound...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Design & Predict Properties
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            
            {/* Selected Compound Details */}
            {selectedCompound ? (
              <Card className="border-green-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Beaker className="h-5 w-5 text-green-400" />
                    {selectedCompound.name}
                  </CardTitle>
                  <CardDescription>
                    Based on {SCAFFOLDS.find(s => s.id === selectedCompound.scaffold)?.name} scaffold
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">

                  {/* 2D molecular structure from PubChem */}
                  <div className="flex justify-center">
                    <MoleculeViewer
                      name={selectedCompound.name}
                      size="md"
                      showLink
                    />
                  </div>
                  
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-400">
                        {selectedCompound.molecularWeight.toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">Mol. Weight</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-blue-400">
                        {selectedCompound.logP.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">LogP</p>
                    </div>
                  </div>

                  {/* Scores */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm flex items-center gap-1">
                          <Target className="h-3 w-3" /> Drug-Likeness
                        </span>
                        <span className="text-sm font-medium">
                          {(selectedCompound.drugLikeness * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={selectedCompound.drugLikeness * 100} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm flex items-center gap-1">
                          <Zap className="h-3 w-3" /> Synthesizability
                        </span>
                        <span className="text-sm font-medium">
                          {(selectedCompound.synthesizability * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={selectedCompound.synthesizability * 100} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm flex items-center gap-1">
                          <Shield className="h-3 w-3" /> Safety Score
                        </span>
                        <span className="text-sm font-medium">
                          {((1 - selectedCompound.toxicityRisk) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress 
                        value={(1 - selectedCompound.toxicityRisk) * 100} 
                        className="h-2"
                      />
                    </div>
                  </div>

                  {/* Bioactivities */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Predicted Bioactivities</h4>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(selectedCompound.bioactivities)
                        .filter(([_, value]) => value > 0.3)
                        .sort(([, a], [, b]) => b - a)
                        .map(([activity, confidence]) => (
                          <Badge 
                            key={activity} 
                            variant="secondary"
                            className="text-xs"
                          >
                            {activity.replace("_", " ")} ({(confidence * 100).toFixed(0)}%)
                          </Badge>
                        ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={planSynthesis}
                    >
                      <Microscope className="h-4 w-4 mr-1" />
                      Plan Synthesis
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <FlaskConical className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    Design a compound to see predictions
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Synthesis Plan */}
            {synthesisPlan && (
              <Card className="border-orange-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Dna className="h-5 w-5 text-orange-400" />
                    Synthesis Route
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {synthesisPlan.steps.map((step: any, i: number) => (
                    <div 
                      key={i} 
                      className="flex items-start gap-3 p-2 bg-muted/30 rounded"
                    >
                      <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-xs font-medium text-orange-400">
                        {step.step}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{step.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {step.type} • Yield: {(step.yield * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-2 border-t space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Overall Yield:</span>
                      <span className="font-medium">{(synthesisPlan.totalYield * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Estimated Cost:</span>
                      <span className="font-medium">${synthesisPlan.estimatedCost}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Difficulty:</span>
                      <Badge variant={synthesisPlan.difficulty === "hard" ? "destructive" : "secondary"}>
                        {synthesisPlan.difficulty}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Designed Compounds History */}
            {designedCompounds.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Recent Designs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {designedCompounds.slice(0, 5).map(compound => (
                    <button
                      key={compound.id}
                      onClick={() => setSelectedCompound(compound)}
                      className={`w-full p-2 rounded text-left text-sm hover:bg-muted/50 transition-colors ${
                        selectedCompound?.id === compound.id ? "bg-muted" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{compound.name}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {SCAFFOLDS.find(s => s.id === compound.scaffold)?.name}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {compound.modifications.length} mods
                        </span>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AlchemyLabPage() {
  return <AlchemyLabContent />
}
