"use client"

import Link from "next/link"
import { 
  ArrowLeft,
  FileText,
  Download,
  ExternalLink,
  Search,
  Filter,
  Book,
  Code,
  Cpu,
  Network,
  Database,
  Shield,
  Radar,
  Eye,
  CheckCircle2
} from "lucide-react"
import {
  NeuButton,
  NeuCard,
  NeuCardContent,
  NeuCardHeader,
  NeuBadge,
  NeuInput,
  NeuromorphicProvider,
} from "@/components/ui/neuromorphic"

const categories = [
  { id: "all", label: "All Documents", count: 24 },
  { id: "hardware", label: "Hardware", count: 8, icon: Radar },
  { id: "software", label: "Software", count: 6, icon: Code },
  { id: "protocols", label: "Protocols", count: 5, icon: Network },
  { id: "integration", label: "Integration", count: 5, icon: Database },
]

const documents = [
  // Hardware
  { title: "Mushroom1 Technical Specifications", category: "hardware", format: "PDF", size: "4.2 MB", featured: true, description: "Complete hardware specifications, deployment guidelines, and maintenance procedures." },
  { title: "MycoNode Probe Installation Guide", category: "hardware", format: "PDF", size: "2.8 MB", description: "Step-by-step installation and calibration procedures for subsurface probes." },
  { title: "SporeBase Collector Operations Manual", category: "hardware", format: "PDF", size: "3.1 MB", description: "Operating procedures, collection schedules, and lab integration." },
  { title: "ALARM Sensor Deployment Guide", category: "hardware", format: "PDF", size: "1.9 MB", description: "Interior sensor installation and BMS integration." },
  { title: "LoRa Gateway Configuration", category: "hardware", format: "PDF", size: "1.2 MB", description: "Mesh network gateway setup and optimization." },
  { title: "Solar Power System Integration", category: "hardware", format: "PDF", size: "2.4 MB", description: "Off-grid power solutions for remote deployments." },
  { title: "Hyphae One Edge Server Specs", category: "hardware", format: "PDF", size: "3.5 MB", description: "Edge computing platform specifications and deployment." },
  { title: "Ruggedized Enclosure Standards", category: "hardware", format: "PDF", size: "1.8 MB", description: "MIL-STD environmental protection specifications." },
  
  // Software
  { title: "NatureOS Administrator Guide", category: "software", format: "PDF", size: "8.2 MB", featured: true, description: "Complete administration and configuration guide for NatureOS platform." },
  { title: "MINDEX API Reference", category: "software", format: "HTML", size: "Online", description: "REST and gRPC API documentation for data access." },
  { title: "NLM Integration Guide", category: "software", format: "PDF", size: "4.6 MB", description: "Nature Learning Model integration and query interfaces." },
  { title: "Threat Analytics Configuration", category: "software", format: "PDF", size: "2.1 MB", description: "ML model tuning and alert threshold configuration." },
  { title: "Dashboard Customization Guide", category: "software", format: "PDF", size: "3.4 MB", description: "Creating custom visualizations and widgets." },
  { title: "Shell Command Reference", category: "software", format: "HTML", size: "Online", description: "NatureOS CLI command reference and scripting." },
  
  // Protocols
  { title: "Mycorrhizae Protocol Specification v1.2", category: "protocols", format: "PDF", size: "2.9 MB", featured: true, description: "Complete MDP specification for multi-modal data encoding." },
  { title: "OEI Intelligence Product Formats", category: "protocols", format: "PDF", size: "3.2 MB", description: "ETA, ESI, BAR, RER, EEW format specifications." },
  { title: "MINDEX Data Integrity Specification", category: "protocols", format: "PDF", size: "1.8 MB", description: "Cryptographic chain and tamper-evident logging." },
  { title: "Hyphae Programming Language Reference", category: "protocols", format: "HTML", size: "Online", description: "Domain-specific language for biological computing." },
  { title: "Environmental Data Schema", category: "protocols", format: "JSON", size: "245 KB", description: "Standardized JSON schemas for environmental data." },
  
  // Integration
  { title: "JADC2 Integration Guide", category: "integration", format: "PDF", size: "5.1 MB", featured: true, description: "Integration with Joint All-Domain Command and Control systems." },
  { title: "C2 System Connector Guide", category: "integration", format: "PDF", size: "3.8 MB", description: "Connecting OEI to existing command and control infrastructure." },
  { title: "SCADA/BMS Integration", category: "integration", format: "PDF", size: "2.4 MB", description: "Building automation and industrial control integration." },
  { title: "GIS Data Export Formats", category: "integration", format: "PDF", size: "1.6 MB", description: "Exporting environmental data to GIS platforms." },
  { title: "Webhook and Event Configuration", category: "integration", format: "PDF", size: "1.1 MB", description: "Real-time event notifications and integrations." },
]

const whyMatters = [
  { title: "Compliance Ready", description: "Documentation meets DoD standards for system evaluation and ATO processes." },
  { title: "Faster Deployment", description: "Comprehensive guides reduce time-to-operational capability." },
  { title: "Self-Service Support", description: "Detailed troubleshooting reduces support burden." },
  { title: "Integration Success", description: "Clear API docs ensure smooth integration with existing systems." },
]

export default function TechnicalDocsPage() {
  return (
    <NeuromorphicProvider>
    <div className="min-h-dvh">
      {/* Header */}
      <div className="border-b">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <Link 
            href="/defense" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Defense Portal
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="py-16 bg-gradient-to-b from-muted/30 to-background">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <NeuBadge variant="warning" className="mb-4">
              TECHNICAL DOCUMENTATION
            </NeuBadge>
            <h1 className="text-5xl font-bold mb-4">
              Technical Documentation
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Comprehensive technical resources for deploying, operating, and integrating 
              Mycosoft&apos;s OEI platform.
            </p>
            
            {/* Search */}
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground z-10 pointer-events-none" />
              <NeuInput 
                placeholder="Search documentation..." 
                className="pl-12 h-12 text-base"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 border-b">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((cat) => (
              <NeuButton 
                key={cat.id} 
                variant={cat.id === "all" ? "primary" : "default"}
                className="gap-2"
              >
                {cat.icon && <cat.icon className="h-4 w-4" />}
                {cat.label} ({cat.count})
              </NeuButton>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Documents */}
      <section className="py-16">
        <div className="container max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8">Featured Documents</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {documents.filter(d => d.featured).map((doc) => (
              <NeuCard key={doc.title} className="hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer group">
                <NeuCardHeader>
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <NeuBadge variant="default">{doc.format}</NeuBadge>
                  </div>
                  <h3 className="text-lg mt-4 font-semibold group-hover:text-primary transition-colors">
                    {doc.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {doc.description}
                  </p>
                </NeuCardHeader>
                <NeuCardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{doc.size}</span>
                    <div className="flex gap-2">
                      <NeuButton variant="default" className="p-2">
                        <ExternalLink className="h-4 w-4" />
                      </NeuButton>
                      <NeuButton variant="default" className="p-2">
                        <Download className="h-4 w-4" />
                      </NeuButton>
                    </div>
                  </div>
                </NeuCardContent>
              </NeuCard>
            ))}
          </div>
        </div>
      </section>

      {/* All Documents */}
      <section className="py-16 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8">All Documentation</h2>
          
          {/* Hardware */}
          <div className="mb-12">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Radar className="h-5 w-5 text-primary" />
              Hardware Documentation
            </h3>
            <div className="space-y-3">
              {documents.filter(d => d.category === "hardware").map((doc) => (
                <NeuCard key={doc.title} className="transition-colors">
                  <NeuCardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{doc.title}</h4>
                          <p className="text-sm text-muted-foreground">{doc.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <NeuBadge variant="default">{doc.format}</NeuBadge>
                        <span className="text-sm text-muted-foreground">{doc.size}</span>
                        <div className="flex gap-2">
                          <NeuButton variant="default" className="p-2">
                            <ExternalLink className="h-4 w-4" />
                          </NeuButton>
                          <NeuButton variant="default" className="p-2">
                            <Download className="h-4 w-4" />
                          </NeuButton>
                        </div>
                      </div>
                    </div>
                  </NeuCardContent>
                </NeuCard>
              ))}
            </div>
          </div>

          {/* Software */}
          <div className="mb-12">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              Software Documentation
            </h3>
            <div className="space-y-3">
              {documents.filter(d => d.category === "software").map((doc) => (
                <NeuCard key={doc.title} className="transition-colors">
                  <NeuCardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{doc.title}</h4>
                          <p className="text-sm text-muted-foreground">{doc.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <NeuBadge variant="default">{doc.format}</NeuBadge>
                        <span className="text-sm text-muted-foreground">{doc.size}</span>
                        <div className="flex gap-2">
                          <NeuButton variant="default" className="p-2">
                            <ExternalLink className="h-4 w-4" />
                          </NeuButton>
                          <NeuButton variant="default" className="p-2">
                            <Download className="h-4 w-4" />
                          </NeuButton>
                        </div>
                      </div>
                    </div>
                  </NeuCardContent>
                </NeuCard>
              ))}
            </div>
          </div>

          {/* Protocols */}
          <div className="mb-12">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Network className="h-5 w-5 text-primary" />
              Protocol Specifications
            </h3>
            <div className="space-y-3">
              {documents.filter(d => d.category === "protocols").map((doc) => (
                <NeuCard key={doc.title} className="transition-colors">
                  <NeuCardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{doc.title}</h4>
                          <p className="text-sm text-muted-foreground">{doc.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <NeuBadge variant="default">{doc.format}</NeuBadge>
                        <span className="text-sm text-muted-foreground">{doc.size}</span>
                        <div className="flex gap-2">
                          <NeuButton variant="default" className="p-2">
                            <ExternalLink className="h-4 w-4" />
                          </NeuButton>
                          <NeuButton variant="default" className="p-2">
                            <Download className="h-4 w-4" />
                          </NeuButton>
                        </div>
                      </div>
                    </div>
                  </NeuCardContent>
                </NeuCard>
              ))}
            </div>
          </div>

          {/* Integration */}
          <div className="mb-12">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Integration Guides
            </h3>
            <div className="space-y-3">
              {documents.filter(d => d.category === "integration").map((doc) => (
                <NeuCard key={doc.title} className="transition-colors">
                  <NeuCardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{doc.title}</h4>
                          <p className="text-sm text-muted-foreground">{doc.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <NeuBadge variant="default">{doc.format}</NeuBadge>
                        <span className="text-sm text-muted-foreground">{doc.size}</span>
                        <div className="flex gap-2">
                          <NeuButton variant="default" className="p-2">
                            <ExternalLink className="h-4 w-4" />
                          </NeuButton>
                          <NeuButton variant="default" className="p-2">
                            <Download className="h-4 w-4" />
                          </NeuButton>
                        </div>
                      </div>
                    </div>
                  </NeuCardContent>
                </NeuCard>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Documentation Matters */}
      <section className="py-16">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <NeuBadge variant="default" className="mb-4">Why It Matters</NeuBadge>
            <h2 className="text-3xl font-bold">Documentation That Delivers</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyMatters.map((item) => (
              <NeuCard key={item.title} className="text-center">
                <NeuCardContent className="pt-8">
                  <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </NeuCardContent>
              </NeuCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Need Classified Documentation?</h2>
            <p className="text-muted-foreground mb-6">
              For access to classified technical materials, please request a briefing 
              and our cleared personnel will arrange appropriate access.
            </p>
            <Link href="/defense/request-briefing">
              <NeuButton variant="primary" className="px-8 py-3">
                Request Access
              </NeuButton>
            </Link>
          </div>
        </div>
      </section>
    </div>
    </NeuromorphicProvider>
  )
}
