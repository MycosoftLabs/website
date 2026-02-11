"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dna,
  Search,
  RefreshCw,
  Database,
  FileText,
  Copy,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Info,
} from "lucide-react"

interface GeneticsSequence {
  id: string
  accession: string
  species_name: string
  gene?: string
  sequence: string
  length: number
  created_at?: string
  source?: string
  description?: string
}

interface GeneticsResponse {
  sequences: GeneticsSequence[]
  total: number
  limit: number
  offset: number
  message?: string
  error?: string
  info?: string
}

function SequencePreview({ sequence }: { sequence: string }) {
  const maxLength = 60
  const preview = sequence.length > maxLength 
    ? sequence.slice(0, maxLength) + "..." 
    : sequence
  
  return (
    <code className="text-xs font-mono bg-muted px-2 py-1 rounded break-all">
      {preview}
    </code>
  )
}

function SequenceCard({ 
  sequence, 
  onCopy 
}: { 
  sequence: GeneticsSequence
  onCopy: (text: string) => void 
}) {
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Dna className="h-5 w-5 text-green-500" />
              {sequence.accession}
            </CardTitle>
            <CardDescription className="text-base font-medium text-foreground/80">
              {sequence.species_name}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="font-mono">
              {sequence.length.toLocaleString()} bp
            </Badge>
            {sequence.source && (
              <Badge variant="outline">{sequence.source}</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {sequence.gene && (
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Gene:</span>
            <span className="font-medium">{sequence.gene}</span>
          </div>
        )}
        
        {sequence.description && (
          <p className="text-sm text-muted-foreground">
            {sequence.description}
          </p>
        )}

        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">Sequence Preview:</span>
          <SequencePreview sequence={sequence.sequence} />
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            {sequence.created_at && new Date(sequence.created_at).toLocaleDateString()}
          </span>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onCopy(sequence.sequence)}
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
            <Button variant="ghost" size="sm">
              <ExternalLink className="h-4 w-4 mr-1" />
              View
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-12 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function EmptyState({ search, info }: { search: string; info?: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Database className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No sequences found</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          {search 
            ? `No genetics data matches "${search}". Try a different search term.`
            : "No genetics sequences are available. Connect to MINDEX API to fetch DNA sequence data."
          }
        </p>
        {info && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground max-w-lg mx-auto">
            <Info className="h-4 w-4 inline mr-2" />
            {info}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function GeneticsPage() {
  const [sequences, setSequences] = useState<GeneticsSequence[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [copied, setCopied] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchSequences = useCallback(async () => {
    setLoading(true)
    setError(null)
    setInfo(null)

    try {
      const params = new URLSearchParams({ limit: "50" })
      if (debouncedSearch) {
        params.set("search", debouncedSearch)
      }

      const res = await fetch(`/api/mindex/genetics?${params}`)
      
      if (!res.ok) {
        throw new Error(`API returned ${res.status}`)
      }

      const data: GeneticsResponse = await res.json()
      setSequences(data.sequences || [])
      setTotal(data.total || 0)
      
      if (data.error) {
        setError(data.error)
      }
      if (data.info) {
        setInfo(data.info)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch genetics data")
      setSequences([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch])

  useEffect(() => {
    fetchSequences()
  }, [fetchSequences])

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      console.error("Failed to copy to clipboard")
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Dna className="h-8 w-8 text-green-500" />
            Genetics Database
          </h1>
          <p className="text-muted-foreground">
            DNA sequences and genetic data from MINDEX
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchSequences} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sequences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">In database</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Showing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sequences.length}</div>
            <p className="text-xs text-muted-foreground">Current results</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Data Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              MINDEX
            </div>
            <p className="text-xs text-muted-foreground">192.168.0.189</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {error ? (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span className="text-yellow-500 font-medium">Unavailable</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-green-500 font-medium">Connected</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {error ? "API connection issue" : "Fetching from MINDEX"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by accession, species name, or gene..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {debouncedSearch && (
              <Button 
                variant="ghost" 
                onClick={() => setSearchQuery("")}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Copy notification */}
      {copied && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle className="h-4 w-4" />
          Sequence copied to clipboard
        </div>
      )}

      {/* Sequence Grid */}
      {loading ? (
        <LoadingSkeleton />
      ) : sequences.length === 0 ? (
        <EmptyState search={debouncedSearch} info={info || undefined} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sequences.map((seq) => (
              <SequenceCard 
                key={seq.id || seq.accession} 
                sequence={seq} 
                onCopy={handleCopy}
              />
            ))}
          </div>

          {/* Pagination info */}
          <div className="text-center text-sm text-muted-foreground">
            Showing {sequences.length} of {total.toLocaleString()} sequences
          </div>
        </>
      )}

      {/* Info Section */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-500 mb-1">About Genetics Data</p>
              <p className="text-muted-foreground">
                DNA sequences are fetched from the MINDEX database on VM 192.168.0.189. 
                This includes genomic data from various fungal species, with support for 
                accession-based lookup and full-text search across species names and gene identifiers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
