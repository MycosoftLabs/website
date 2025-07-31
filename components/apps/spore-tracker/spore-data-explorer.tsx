"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Filter, Search, BarChart3, LineChart } from "lucide-react"

export function SporeDataExplorer() {
  const [activeTab, setActiveTab] = useState("raw-data")
  const [searchQuery, setSearchQuery] = useState("")
  const [timeRange, setTimeRange] = useState("24h")
  const [sporeType, setSporeType] = useState("all")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spore Data Explorer</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by location, species..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <div className="w-40">
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Time Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">Last Hour</SelectItem>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Select value={sporeType} onValueChange={setSporeType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Spore Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="basidiomycota">Basidiomycota</SelectItem>
                    <SelectItem value="ascomycota">Ascomycota</SelectItem>
                    <SelectItem value="zygomycota">Zygomycota</SelectItem>
                    <SelectItem value="glomeromycota">Glomeromycota</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Tabs defaultValue="raw-data" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="raw-data">Raw Data</TabsTrigger>
              <TabsTrigger value="charts">Charts</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
            </TabsList>

            <TabsContent value="raw-data" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Spore Type</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Wind Direction</TableHead>
                      <TableHead>Wind Speed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      {
                        location: "San Francisco",
                        timestamp: "2025-04-09 08:15:22",
                        sporeType: "Basidiomycota",
                        count: 1245,
                        windDirection: "NW",
                        windSpeed: "12 mph",
                      },
                      {
                        location: "New York",
                        timestamp: "2025-04-09 08:10:45",
                        sporeType: "Ascomycota",
                        count: 987,
                        windDirection: "SE",
                        windSpeed: "8 mph",
                      },
                      {
                        location: "London",
                        timestamp: "2025-04-09 08:12:33",
                        sporeType: "Basidiomycota",
                        count: 1532,
                        windDirection: "SW",
                        windSpeed: "15 mph",
                      },
                      {
                        location: "Tokyo",
                        timestamp: "2025-04-09 08:14:12",
                        sporeType: "Ascomycota",
                        count: 2103,
                        windDirection: "E",
                        windSpeed: "6 mph",
                      },
                      {
                        location: "Sydney",
                        timestamp: "2025-04-09 08:09:55",
                        sporeType: "Zygomycota",
                        count: 876,
                        windDirection: "S",
                        windSpeed: "10 mph",
                      },
                    ].map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>{row.location}</TableCell>
                        <TableCell>{row.timestamp}</TableCell>
                        <TableCell>{row.sporeType}</TableCell>
                        <TableCell>{row.count.toLocaleString()}</TableCell>
                        <TableCell>{row.windDirection}</TableCell>
                        <TableCell>{row.windSpeed}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">Showing 5 of 1,245 records</div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="charts">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Spore Count by Location</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Bar
                    </Button>
                    <Button variant="outline" size="sm">
                      <LineChart className="h-4 w-4 mr-2" />
                      Line
                    </Button>
                  </div>
                </div>
                <div className="h-80 bg-muted rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">Chart visualization would appear here</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="trends">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Spore Count Trends</h3>
                  <Select defaultValue="7d">
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">24 Hours</SelectItem>
                      <SelectItem value="7d">7 Days</SelectItem>
                      <SelectItem value="30d">30 Days</SelectItem>
                      <SelectItem value="90d">90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="h-80 bg-muted rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">Trend visualization would appear here</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  )
}
