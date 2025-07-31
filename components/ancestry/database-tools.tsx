// components/ancestry/database-tools.tsx
"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// import { FungalDatabaseExplorer } from "@/components/fungal-database/explorer"

interface Species {
  id: string
  name: string
  description: string
  characteristics: string[]
}

export function DatabaseTools() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState("All")
  const [fungalData, setFungalData] = useState<Species[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/ancestry?query=${searchQuery}&filter=${filter}`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setFungalData(data.species)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [searchQuery, filter])

  const handleSearch = () => {
    // Trigger useEffect to fetch data based on search query
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Fungal Database Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Explore and interact with the fungal ancestry database.</p>
          <div className="flex items-center">
            <Input
              type="text"
              placeholder="Search database..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mr-2"
            />
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          <div className="flex items-center mt-4">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by characteristic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Edible">Edible</SelectItem>
                <SelectItem value="Poisonous">Poisonous</SelectItem>
                <SelectItem value="Medicinal">Medicinal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading && <p>Loading fungal data...</p>}
          {error && <p className="text-red-500">Error: {error}</p>}

          {fungalData.length > 0 && (
            <div className="mt-4">
              <h4 className="text-md font-medium">Fungal Data:</h4>
              <div className="rounded-md border">
                <Table>
                  <TableCaption>A list of fungal species and their characteristics.</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Characteristics</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fungalData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.id}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.characteristics.join(", ")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
