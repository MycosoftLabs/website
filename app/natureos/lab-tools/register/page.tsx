"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function RegisterSamplePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [species, setSpecies] = useState("")
  const [substrateType, setSubstrateType] = useState("")
  const [location, setLocation] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const base = typeof window !== "undefined" ? window.location.origin : ""
      const res = await fetch(`${base}/api/natureos/lab/samples`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || "Unnamed Sample",
          species: species || undefined,
          substrateType: substrateType || undefined,
          location: location || undefined,
          collectedAt: new Date().toISOString(),
          status: "Registered",
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `HTTP ${res.status}`)
      }
      router.push("/natureos/lab-tools")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Register Sample"
        text="Add a new lab sample for tracking and analysis"
      >
        <Button variant="ghost" size="sm" asChild>
          <Link href="/natureos/lab-tools">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
      </DashboardHeader>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>New Sample</CardTitle>
          <CardDescription>
            Sample registration is proxied to the NatureOS backend. If the
            backend is not available, registration will fail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sample name"
                required
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="species">Species</Label>
              <Input
                id="species"
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                placeholder="Scientific or common name"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="substrate">Substrate Type</Label>
              <Input
                id="substrate"
                value={substrateType}
                onChange={(e) => setSubstrateType(e.target.value)}
                placeholder="e.g. wood, soil, agar"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Collection or storage location"
                className="mt-2"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Register
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/natureos/lab-tools">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardShell>
  )
}
