"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Brain, ExternalLink, BookOpen, Lightbulb, Layers, 
  Cpu, ArrowRight, Code, Sparkles, Maximize2
} from "lucide-react"

export default function TransformerExplainerPage() {
  const [activeTab, setActiveTab] = useState("interactive")
  const [isFullscreen, setIsFullscreen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30">
              <Brain className="h-8 w-8 text-purple-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                Transformer Explainer
                <Badge variant="outline">Educational</Badge>
              </h1>
              <p className="text-muted-foreground mt-1">
                Understand how MYCA&apos;s AI processes and generates responses using transformer architecture
              </p>
            </div>
          </div>

          {/* Quick info cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-purple-500/5 border-purple-500/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Layers className="h-5 w-5 text-purple-500" />
                  <div>
                    <div className="font-semibold">Architecture</div>
                    <div className="text-sm text-muted-foreground">GPT-style decoder</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-cyan-500/5 border-cyan-500/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Cpu className="h-5 w-5 text-cyan-500" />
                  <div>
                    <div className="font-semibold">Self-Attention</div>
                    <div className="text-sm text-muted-foreground">Multi-head mechanism</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-500/5 border-green-500/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Code className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-semibold">Tokenization</div>
                    <div className="text-sm text-muted-foreground">BPE encoding</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <div>
                    <div className="font-semibold">Generation</div>
                    <div className="text-sm text-muted-foreground">Autoregressive</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="interactive" className="gap-2">
              <Brain className="h-4 w-4" />
              Interactive Demo
            </TabsTrigger>
            <TabsTrigger value="concepts" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Key Concepts
            </TabsTrigger>
            <TabsTrigger value="myca" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              MYCA Integration
            </TabsTrigger>
          </TabsList>

          {/* Interactive Demo Tab */}
          <TabsContent value="interactive">
            <Card className={isFullscreen ? "fixed inset-4 z-50" : ""}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    Transformer Explainer
                    <Badge variant="secondary">Polo Club</Badge>
                  </CardTitle>
                  <CardDescription>
                    Interactive visualization of how GPT-2 processes text — runs in your browser
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  >
                    <Maximize2 className="h-4 w-4 mr-2" />
                    {isFullscreen ? "Exit" : "Fullscreen"}
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a 
                      href="https://poloclub.github.io/transformer-explainer/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Original
                    </a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className={`relative rounded-lg overflow-hidden bg-slate-900 ${
                  isFullscreen ? "h-[calc(100vh-180px)]" : "aspect-video"
                }`}>
                  <iframe
                    src="https://poloclub.github.io/transformer-explainer/"
                    className="w-full h-full border-0"
                    title="Transformer Explainer"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    sandbox="allow-scripts allow-same-origin allow-popups"
                  />
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  <strong>Note:</strong> This interactive demo runs a GPT-2 model directly in your browser. 
                  Try entering different prompts to see how the transformer processes and generates text.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Key Concepts Tab */}
          <TabsContent value="concepts">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-green-500" />
                    1. Tokenization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Text is split into tokens (subwords) that the model can process. 
                    MYCA uses Byte-Pair Encoding (BPE) to handle any input text efficiently.
                  </p>
                  <div className="p-4 bg-muted/30 rounded-lg font-mono text-sm">
                    <div className="text-muted-foreground mb-2">Input:</div>
                    <div className="mb-3">&ldquo;Psilocybe cubensis&rdquo;</div>
                    <div className="text-muted-foreground mb-2">Tokens:</div>
                    <div className="flex flex-wrap gap-1">
                      {["Ps", "ilo", "cy", "be", " cub", "ensis"].map((token, i) => (
                        <Badge key={i} variant="secondary" className="font-mono">
                          {token}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-blue-500" />
                    2. Embeddings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Each token is converted to a dense vector (embedding) that captures 
                    semantic meaning. Position embeddings add location information.
                  </p>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">Token Embedding + Position Embedding</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded" />
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded" />
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 text-center">
                      768-dimensional vectors for each token position
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-purple-500" />
                    3. Self-Attention
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    The core mechanism that allows each token to &ldquo;attend&rdquo; to all other tokens, 
                    learning contextual relationships. Multi-head attention runs multiple 
                    attention patterns in parallel.
                  </p>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 text-center text-sm">
                      <div>
                        <div className="p-2 bg-purple-500/20 rounded mb-2">Q</div>
                        <div className="text-muted-foreground">Query</div>
                      </div>
                      <div>
                        <div className="p-2 bg-cyan-500/20 rounded mb-2">K</div>
                        <div className="text-muted-foreground">Key</div>
                      </div>
                      <div>
                        <div className="p-2 bg-green-500/20 rounded mb-2">V</div>
                        <div className="text-muted-foreground">Value</div>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-center text-muted-foreground">
                      Attention = softmax(QK^T / \u221Ad) \u00D7 V
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    4. Generation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    The model generates text one token at a time (autoregressive). 
                    Each new token is predicted based on all previous tokens, then 
                    added to the sequence.
                  </p>
                  <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge>The</Badge>
                      <ArrowRight className="h-4 w-4" />
                      <Badge variant="secondary">fungal</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>The</Badge>
                      <Badge>fungal</Badge>
                      <ArrowRight className="h-4 w-4" />
                      <Badge variant="secondary">network</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>The</Badge>
                      <Badge>fungal</Badge>
                      <Badge>network</Badge>
                      <ArrowRight className="h-4 w-4" />
                      <Badge variant="secondary">grows</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* MYCA Integration Tab */}
          <TabsContent value="myca">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-500" />
                  How MYCA Uses Transformers
                </CardTitle>
                <CardDescription>
                  Understanding MYCA&apos;s AI architecture and decision-making process
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-sm">1</div>
                      Input Processing
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      When you send a message to MYCA, it&apos;s tokenized and combined with 
                      the conversation history. System prompts provide MYCA with knowledge 
                      about Mycosoft&apos;s mission and capabilities.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-sm">2</div>
                      Context Understanding
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Multi-head attention allows MYCA to understand relationships between 
                      concepts — connecting &ldquo;Psilocybe cubensis&rdquo; with &ldquo;psilocybin biosynthesis&rdquo; 
                      and &ldquo;mycology research.&rdquo;
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-sm">3</div>
                      Agent Coordination
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      MYCA orchestrates 227+ specialized agents. The transformer helps 
                      route tasks to the right agent by understanding intent — research 
                      queries go to ResearcherAgent, security to SecurityAgent.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-sm">4</div>
                      Response Generation
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Responses are generated token by token, maintaining coherence 
                      and accuracy. Temperature and sampling parameters control 
                      creativity vs. factual precision.
                    </p>
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-xl border border-purple-500/20">
                  <h3 className="font-semibold mb-4">MYCA Architecture Overview</h3>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                        <Code className="h-6 w-6 text-purple-500" />
                      </div>
                      <div className="text-sm font-medium">Input</div>
                      <div className="text-xs text-muted-foreground">Tokenization</div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground hidden md:block" />
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-2">
                        <Brain className="h-6 w-6 text-cyan-500" />
                      </div>
                      <div className="text-sm font-medium">Transformer</div>
                      <div className="text-xs text-muted-foreground">Attention</div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground hidden md:block" />
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2">
                        <Layers className="h-6 w-6 text-green-500" />
                      </div>
                      <div className="text-sm font-medium">MAS v2</div>
                      <div className="text-xs text-muted-foreground">227+ Agents</div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground hidden md:block" />
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-2">
                        <Sparkles className="h-6 w-6 text-amber-500" />
                      </div>
                      <div className="text-sm font-medium">Response</div>
                      <div className="text-xs text-muted-foreground">Generation</div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-4">
                  <Button asChild>
                    <a href="/natureos/ai-studio">
                      <Brain className="h-4 w-4 mr-2" />
                      Open MYCA AI Studio
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a 
                      href="https://poloclub.github.io/transformer-explainer/" 
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Full Transformer Demo
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
