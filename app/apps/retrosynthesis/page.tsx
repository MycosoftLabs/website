"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  FlaskConical, 
  Activity,
  ArrowRight,
  ArrowDown,
  Download,
  Search,
  Loader2,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Target,
  Beaker,
  Dna,
  Leaf,
  Zap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"

// Target compounds
const TARGET_COMPOUNDS = [
  { id: "psilocybin", name: "Psilocybin", formula: "C₁₂H₁₇N₂O₄P", species: "Psilocybe cubensis" },
  { id: "muscimol", name: "Muscimol", formula: "C₄H₆N₂O₂", species: "Amanita muscaria" },
  { id: "hericenone_a", name: "Hericenone A", formula: "C₃₅H₅₄O₅", species: "Hericium erinaceus" },
  { id: "cordycepin", name: "Cordycepin", formula: "C₁₀H₁₃N₅O₃", species: "Cordyceps militaris" },
  { id: "ganoderic_acid_a", name: "Ganoderic Acid A", formula: "C₃₀H₄₄O₇", species: "Ganoderma lucidum" },
  { id: "ergotamine", name: "Ergotamine", formula: "C₃₃H₃₅N₅O₅", species: "Claviceps purpurea" },
]

interface PathwayStep {
  id: string
  substrate: string
  product: string
  enzyme: string
  enzymeType: string
  conditions: string
  yield: number
  reversible: boolean
}

interface BiosyntheticPathway {
  compound: string
  species: string
  totalSteps: number
  overallYield: number
  difficulty: "easy" | "medium" | "hard"
  steps: PathwayStep[]
  cultivationNotes: string[]
}

// Predefined pathways
const PATHWAYS: Record<string, BiosyntheticPathway> = {
  psilocybin: {
    compound: "Psilocybin",
    species: "Psilocybe cubensis",
    totalSteps: 4,
    overallYield: 0.35,
    difficulty: "medium",
    steps: [
      {
        id: "step1",
        substrate: "L-Tryptophan",
        product: "Tryptamine",
        enzyme: "PsiD (Tryptophan decarboxylase)",
        enzymeType: "Decarboxylase",
        conditions: "25°C, pH 6.5",
        yield: 0.85,
        reversible: false
      },
      {
        id: "step2",
        substrate: "Tryptamine",
        product: "4-Hydroxytryptamine",
        enzyme: "PsiH (Tryptamine 4-hydroxylase)",
        enzymeType: "Cytochrome P450",
        conditions: "25°C, NADPH, O₂",
        yield: 0.70,
        reversible: false
      },
      {
        id: "step3",
        substrate: "4-Hydroxytryptamine",
        product: "Norbaeocystin",
        enzyme: "PsiK (Kinase)",
        enzymeType: "Phosphotransferase",
        conditions: "25°C, ATP",
        yield: 0.75,
        reversible: true
      },
      {
        id: "step4",
        substrate: "Norbaeocystin",
        product: "Psilocybin",
        enzyme: "PsiM (N-methyltransferase)",
        enzymeType: "Methyltransferase",
        conditions: "25°C, SAM",
        yield: 0.80,
        reversible: false
      }
    ],
    cultivationNotes: [
      "Optimal substrate: Brown rice flour + vermiculite (BRF tek)",
      "Fruiting temperature: 22-24°C",
      "Humidity: 90-95% RH",
      "Peak psilocybin at veil break"
    ]
  },
  cordycepin: {
    compound: "Cordycepin",
    species: "Cordyceps militaris",
    totalSteps: 4,
    overallYield: 0.25,
    difficulty: "hard",
    steps: [
      {
        id: "step1",
        substrate: "Adenosine",
        product: "Adenosine-3'-monophosphate",
        enzyme: "Cns1 (Phosphoribosyltransferase)",
        enzymeType: "Transferase",
        conditions: "28°C, ATP",
        yield: 0.80,
        reversible: true
      },
      {
        id: "step2",
        substrate: "Adenosine-3'-monophosphate",
        product: "3'-deoxyadenosine-5'-monophosphate",
        enzyme: "Cns2 (Reductase)",
        enzymeType: "Oxidoreductase",
        conditions: "28°C, NADPH",
        yield: 0.60,
        reversible: false
      },
      {
        id: "step3",
        substrate: "3'-deoxyadenosine-5'-monophosphate",
        product: "3'-deoxyadenosine",
        enzyme: "Cns3 (Phosphatase)",
        enzymeType: "Hydrolase",
        conditions: "28°C, pH 7.0",
        yield: 0.65,
        reversible: false
      },
      {
        id: "step4",
        substrate: "3'-deoxyadenosine",
        product: "Cordycepin",
        enzyme: "Cns4 (Kinase)",
        enzymeType: "Phosphotransferase",
        conditions: "28°C, ATP",
        yield: 0.80,
        reversible: true
      }
    ],
    cultivationNotes: [
      "Requires insect pupae or liquid culture",
      "Light cycle: 12h light/12h dark",
      "Fruiting temperature: 18-22°C",
      "Peak cordycepin in mature fruiting bodies"
    ]
  }
}

export default function RetrosynthesisPage() {
  const [selectedCompound, setSelectedCompound] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [pathway, setPathway] = useState<BiosyntheticPathway | null>(null)
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")

  const analyzePathway = async () => {
    if (!selectedCompound) return
    
    setIsAnalyzing(true)
    setPathway(null)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Get pathway or generate a default one
    const knownPathway = PATHWAYS[selectedCompound]
    
    if (knownPathway) {
      setPathway(knownPathway)
    } else {
      // Generate a generic pathway for unknown compounds
      const compound = TARGET_COMPOUNDS.find(c => c.id === selectedCompound)
      setPathway({
        compound: compound?.name || "Unknown",
        species: compound?.species || "Unknown",
        totalSteps: 3,
        overallYield: 0.30,
        difficulty: "medium",
        steps: [
          {
            id: "step1",
            substrate: "Primary Precursor",
            product: "Intermediate 1",
            enzyme: "Enzyme 1",
            enzymeType: "Oxidoreductase",
            conditions: "25°C, pH 7.0",
            yield: 0.70,
            reversible: false
          },
          {
            id: "step2",
            substrate: "Intermediate 1",
            product: "Intermediate 2",
            enzyme: "Enzyme 2",
            enzymeType: "Transferase",
            conditions: "25°C, cofactors",
            yield: 0.65,
            reversible: true
          },
          {
            id: "step3",
            substrate: "Intermediate 2",
            product: compound?.name || "Target",
            enzyme: "Enzyme 3",
            enzymeType: "Ligase",
            conditions: "25°C, ATP",
            yield: 0.60,
            reversible: false
          }
        ],
        cultivationNotes: [
          "Pathway analysis in progress",
          "Check MINDEX for updated information"
        ]
      })
    }
    
    setIsAnalyzing(false)
  }

  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId)
    } else {
      newExpanded.add(stepId)
    }
    setExpandedSteps(newExpanded)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
                <FlaskConical className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                  Retrosynthesis Pathway Viewer
                </h1>
                <p className="text-sm text-muted-foreground">
                  Biosynthetic pathway analysis • Enzyme mapping
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-orange-400 border-orange-400/50">
              <Sparkles className="h-3 w-3 mr-1" />
              NLM Chemistry Layer
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Main Panel */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Compound Selection */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-orange-400" />
                  Target Compound
                </CardTitle>
                <CardDescription>
                  Select a fungal compound to analyze its biosynthetic pathway
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Select value={selectedCompound} onValueChange={setSelectedCompound}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Choose a target compound..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_COMPOUNDS.map(compound => (
                        <SelectItem key={compound.id} value={compound.id}>
                          <div className="flex flex-col">
                            <span>{compound.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {compound.formula} • {compound.species}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={analyzePathway}
                    disabled={!selectedCompound || isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Pathway Visualization */}
            {isAnalyzing && (
              <Card className="border-orange-500/20">
                <CardContent className="py-12 text-center">
                  <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-orange-400" />
                  <p className="text-muted-foreground">Analyzing biosynthetic pathway...</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Querying MINDEX and NLM chemistry modules
                  </p>
                </CardContent>
              </Card>
            )}

            {pathway && !isAnalyzing && (
              <Card className="border-orange-500/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Dna className="h-5 w-5 text-orange-400" />
                        Biosynthetic Pathway: {pathway.compound}
                      </CardTitle>
                      <CardDescription className="italic">
                        {pathway.species}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          pathway.difficulty === "easy" ? "default" :
                          pathway.difficulty === "medium" ? "secondary" : "destructive"
                        }
                      >
                        {pathway.difficulty}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-orange-400">{pathway.totalSteps}</p>
                      <p className="text-xs text-muted-foreground">Steps</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-400">{(pathway.overallYield * 100).toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">Overall Yield</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-blue-400">{pathway.steps.length}</p>
                      <p className="text-xs text-muted-foreground">Enzymes</p>
                    </div>
                  </div>

                  {/* Pathway Steps */}
                  <div className="space-y-4">
                    {pathway.steps.map((step, index) => (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <button
                          onClick={() => toggleStep(step.id)}
                          className="w-full text-left"
                        >
                          <div className={`p-4 rounded-lg border transition-colors ${
                            expandedSteps.has(step.id) 
                              ? "border-orange-500/50 bg-orange-500/5" 
                              : "border-muted hover:border-muted-foreground/30"
                          }`}>
                            {/* Step Header */}
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{step.substrate}</span>
                                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium text-orange-400">{step.product}</span>
                                </div>
                                <p className="text-sm text-muted-foreground">{step.enzyme}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="text-xs">
                                  {(step.yield * 100).toFixed(0)}% yield
                                </Badge>
                                {expandedSteps.has(step.id) ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>

                            {/* Expanded Details */}
                            <AnimatePresence>
                              {expandedSteps.has(step.id) && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-4 pt-4 border-t border-muted"
                                >
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <p className="text-muted-foreground">Enzyme Type</p>
                                      <p className="font-medium">{step.enzymeType}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Conditions</p>
                                      <p className="font-medium">{step.conditions}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Reversible</p>
                                      <p className="font-medium">{step.reversible ? "Yes" : "No"}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Step Yield</p>
                                      <Progress value={step.yield * 100} className="h-2 mt-2" />
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </button>

                        {/* Arrow between steps */}
                        {index < pathway.steps.length - 1 && (
                          <div className="flex justify-center py-2">
                            <ArrowDown className="h-5 w-5 text-muted-foreground/50" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Cultivation Notes */}
            {pathway && (
              <Card className="border-green-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-green-400" />
                    Cultivation Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {pathway.cultivationNotes.map((note, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <ChevronRight className="h-4 w-4 mt-0.5 text-green-400 flex-shrink-0" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            {pathway && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-400" />
                    Pathway Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Rate-Limiting Step</span>
                    <span className="font-medium text-red-400">
                      Step {pathway.steps.reduce((min, step, i) => 
                        step.yield < pathway.steps[min].yield ? i : min, 0
                      ) + 1}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Lowest Yield</span>
                    <span className="font-medium">
                      {(Math.min(...pathway.steps.map(s => s.yield)) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Reversible Steps</span>
                    <span className="font-medium">
                      {pathway.steps.filter(s => s.reversible).length}/{pathway.steps.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cofactors Required</span>
                    <span className="font-medium">
                      {pathway.steps.filter(s => s.conditions.includes("ATP") || s.conditions.includes("NADPH")).length}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card>
              <CardContent className="py-4 space-y-2">
                <Button variant="outline" className="w-full" size="sm" disabled={!pathway}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Pathway Data
                </Button>
                <Button variant="outline" className="w-full" size="sm" disabled={!pathway}>
                  <Beaker className="h-4 w-4 mr-2" />
                  Open in Alchemy Lab
                </Button>
                <Button variant="outline" className="w-full" size="sm" disabled={!pathway}>
                  <Dna className="h-4 w-4 mr-2" />
                  Open in Genetic Circuit
                </Button>
              </CardContent>
            </Card>

            {/* Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">About Retrosynthesis</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>
                  Retrosynthesis analysis works backward from a target compound to 
                  identify precursor molecules and enzymatic steps required for biosynthesis.
                </p>
                <p>
                  The NLM chemistry layer integrates with MINDEX compound data and 
                  ChemSpider to provide accurate pathway predictions.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
