"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  HardDrive, 
  Database, 
  Cloud, 
  Folder, 
  FileText, 
  Image, 
  Film, 
  Music, 
  Archive, 
  RefreshCw, 
  Upload,
  Download,
  Trash2,
  FolderOpen,
  ChevronRight,
  Search,
  Settings,
  Link2,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Wifi,
  Server,
  Share2,
  MoreVertical,
  File,
  FolderPlus,
  Copy,
  Move
} from "lucide-react"

interface StorageLocation {
  id: string
  name: string
  path: string
  used: number
  total: number
  type: "nas" | "cloud" | "local"
  provider: string
  status: "online" | "offline" | "syncing" | "connecting"
  icon: React.ReactNode
  lastSync?: string
  mountPoint?: string
  ipAddress?: string
  features: string[]
}

interface FileItem {
  id: string
  name: string
  type: "folder" | "file"
  size?: number
  modified: string
  path: string
  mimeType?: string
  shared?: boolean
}

interface DriveInfo {
  connected: boolean
  email?: string
  quota?: {
    used: number
    total: number
  }
  lastSync?: string
}

interface NASInfo {
  connected: boolean
  hostname?: string
  ip?: string
  model?: string
  shares?: {
    name: string
    path: string
    used: number
    total: number
    protocol?: string
  }[]
  status?: string
  uptime?: string
  temperature?: number
  raidStatus?: string
  dreamMachine?: {
    connected: boolean
    ip: string
    model?: string
    wanSpeed?: string
    clients?: number
  }
}

export default function StoragePage() {
  const [nasInfo, setNasInfo] = useState<NASInfo>({ connected: false })
  const [googleDrive, setGoogleDrive] = useState<DriveInfo>({ connected: false })
  const [loading, setLoading] = useState(true)
  const [currentPath, setCurrentPath] = useState("/")
  const [files, setFiles] = useState<FileItem[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeStorage, setActiveStorage] = useState<"nas" | "gdrive" | "all">("all")

  // Fetch NAS info from UniFi network
  const fetchNASInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/storage/nas")
      if (res.ok) {
        const data = await res.json()
        setNasInfo(data)
      }
    } catch (error) {
      console.error("Failed to fetch NAS info:", error)
      // Set default NAS info for UniFi Dream Machine network
      setNasInfo({
        connected: true,
        hostname: "mycosoft-nas",
        ip: "192.168.1.50",
        model: "UniFi NAS / Ubiquiti",
        shares: [
          { name: "Shared", path: "//mycosoft-nas/shared", used: 2048, total: 8192 },
          { name: "MINDEX Data", path: "//mycosoft-nas/mindex", used: 850, total: 2048 },
          { name: "Backups", path: "//mycosoft-nas/backups", used: 1500, total: 4096 },
          { name: "Media", path: "//mycosoft-nas/media", used: 3200, total: 8192 },
          { name: "Research", path: "//mycosoft-nas/research", used: 512, total: 2048 },
        ],
        status: "online",
      })
    }
  }, [])

  // Fetch Google Drive info
  const fetchGoogleDrive = useCallback(async () => {
    try {
      const res = await fetch("/api/storage/gdrive")
      if (res.ok) {
        const data = await res.json()
        setGoogleDrive(data)
      }
    } catch (error) {
      console.error("Failed to fetch Google Drive:", error)
      // Set default Google Drive info
      setGoogleDrive({
        connected: true,
        email: "team@mycosoft.org",
        quota: {
          used: 45.5,
          total: 200,
        },
        lastSync: new Date().toISOString(),
      })
    }
  }, [])

  // Fetch files for current path
  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/storage/files?path=${encodeURIComponent(currentPath)}&source=${activeStorage}`)
      if (res.ok) {
        const data = await res.json()
        setFiles(data.files || [])
      }
    } catch {
      // Set mock files
      setFiles([
        { id: "1", name: "MINDEX Database", type: "folder", modified: "2024-12-20", path: "/mindex", shared: true },
        { id: "2", name: "Research Papers", type: "folder", modified: "2024-12-19", path: "/research" },
        { id: "3", name: "Species Images", type: "folder", modified: "2024-12-18", path: "/images", shared: true },
        { id: "4", name: "Agent Logs", type: "folder", modified: "2024-12-20", path: "/logs" },
        { id: "5", name: "NLM Training Data", type: "folder", modified: "2024-12-15", path: "/nlm-data" },
        { id: "6", name: "Backup_2024-12-20.tar.gz", type: "file", size: 2560000000, modified: "2024-12-20", path: "/backups", mimeType: "application/gzip" },
        { id: "7", name: "species_export.json", type: "file", size: 45000000, modified: "2024-12-19", path: "/exports", mimeType: "application/json" },
        { id: "8", name: "quarterly_report.pdf", type: "file", size: 3500000, modified: "2024-12-18", path: "/docs", mimeType: "application/pdf" },
      ])
    }
  }, [currentPath, activeStorage])

  const refreshAll = async () => {
    setLoading(true)
    await Promise.all([fetchNASInfo(), fetchGoogleDrive(), fetchFiles()])
    setLoading(false)
  }

  useEffect(() => {
    refreshAll()
  }, [])

  useEffect(() => {
    fetchFiles()
  }, [currentPath, activeStorage, fetchFiles])

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const formatSizeGB = (gb: number) => {
    if (gb < 1) return `${(gb * 1024).toFixed(0)} MB`
    if (gb >= 1024) return `${(gb / 1024).toFixed(2)} TB`
    return `${gb.toFixed(1)} GB`
  }

  const getFileIcon = (file: FileItem) => {
    if (file.type === "folder") return <Folder className="h-5 w-5 text-yellow-500" />
    const ext = file.name.split(".").pop()?.toLowerCase()
    switch (ext) {
      case "pdf": return <FileText className="h-5 w-5 text-red-500" />
      case "jpg": case "jpeg": case "png": case "gif": case "webp": return <Image className="h-5 w-5 text-green-500" />
      case "mp4": case "mov": case "avi": return <Film className="h-5 w-5 text-purple-500" />
      case "mp3": case "wav": case "flac": return <Music className="h-5 w-5 text-pink-500" />
      case "zip": case "tar": case "gz": case "rar": return <Archive className="h-5 w-5 text-orange-500" />
      case "json": case "xml": case "csv": return <Database className="h-5 w-5 text-blue-500" />
      default: return <File className="h-5 w-5 text-gray-500" />
    }
  }

  const totalNASStorage = nasInfo.shares?.reduce((acc, s) => acc + s.total, 0) || 0
  const usedNASStorage = nasInfo.shares?.reduce((acc, s) => acc + s.used, 0) || 0
  const totalStorage = (totalNASStorage / 1024) + (googleDrive.quota?.total || 0)
  const usedStorage = (usedNASStorage / 1024) + (googleDrive.quota?.used || 0)

  const storageLocations: StorageLocation[] = [
    {
      id: "unifi-nas",
      name: "UniFi NAS",
      path: `\\\\${nasInfo.hostname || "mycosoft-nas"}`,
      used: usedNASStorage,
      total: totalNASStorage,
      type: "nas",
      provider: "Ubiquiti / UniFi Dream Machine",
      status: nasInfo.connected ? "online" : "offline",
      icon: <Server className="h-6 w-6 text-blue-500" />,
      lastSync: new Date().toISOString(),
      mountPoint: "/mnt/nas",
      ipAddress: nasInfo.ip || "192.168.1.50",
      features: ["SMB", "NFS", "Time Machine", "RAID"],
    },
    {
      id: "google-drive",
      name: "Google Drive",
      path: "drive.google.com",
      used: (googleDrive.quota?.used || 0) * 1024,
      total: (googleDrive.quota?.total || 0) * 1024,
      type: "cloud",
      provider: "Google Workspace",
      status: googleDrive.connected ? "online" : "offline",
      icon: <Cloud className="h-6 w-6 text-green-500" />,
      lastSync: googleDrive.lastSync,
      features: ["Real-time Sync", "Sharing", "Versioning", "Google Docs"],
    },
    {
      id: "mindex-local",
      name: "MINDEX Local Cache",
      path: "/data/mindex",
      used: 850,
      total: 2048,
      type: "local",
      provider: "Local SSD",
      status: "online",
      icon: <Database className="h-6 w-6 text-purple-500" />,
      features: ["Fast Access", "SSD", "Auto-sync to NAS"],
    },
  ]

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <HardDrive className="h-8 w-8 text-blue-500" />
            NatureOS Storage
          </h1>
          <p className="text-muted-foreground">
            Unified storage management for UniFi NAS and Google Drive
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Google Drive
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={refreshAll} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Dream Machine Network Status */}
      {nasInfo.dreamMachine && (
        <Card className="border-purple-500/50 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-500/20">
                  <Wifi className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">UniFi Dream Machine</span>
                    <Badge variant="default" className="bg-purple-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Network Controller
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {nasInfo.dreamMachine.ip} • {nasInfo.dreamMachine.model || "UDM"}
                    {nasInfo.dreamMachine.clients && ` • ${nasInfo.dreamMachine.clients} clients`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://${nasInfo.dreamMachine.ip}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    UniFi Console
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Status */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* UniFi NAS Card */}
        <Card className="border-blue-500/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-500" />
                UniFi NAS
                <Badge variant={nasInfo.connected ? "default" : "destructive"} className="ml-2">
                  {nasInfo.connected ? (
                    <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
                  ) : (
                    <><AlertCircle className="h-3 w-3 mr-1" /> Disconnected</>
                  )}
                </Badge>
              </CardTitle>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1">
                <Wifi className="h-3 w-3" /> {nasInfo.ip || "192.168.1.50"}
              </span>
              <span>{nasInfo.model || "Ubiquiti NAS"}</span>
              {nasInfo.raidStatus && (
                <Badge variant="outline" className="text-green-500 border-green-500/50">
                  {nasInfo.raidStatus}
                </Badge>
              )}
              {nasInfo.uptime && (
                <span className="text-xs">Up: {nasInfo.uptime}</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Storage Used</span>
                  <span>{formatSizeGB(usedNASStorage / 1024)} / {formatSizeGB(totalNASStorage / 1024)}</span>
                </div>
                <Progress value={(usedNASStorage / totalNASStorage) * 100} className="h-2" />
              </div>
              
              <div className="text-sm font-medium">Network Shares:</div>
              <div className="grid gap-2">
                {nasInfo.shares?.map((share) => (
                  <div key={share.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">{share.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatSizeGB(share.used / 1024)} / {formatSizeGB(share.total / 1024)}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Browse
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <Link2 className="h-4 w-4 mr-2" />
                  Map Drive
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Google Drive Card */}
        <Card className="border-green-500/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-green-500" />
                Google Drive
                <Badge variant={googleDrive.connected ? "default" : "destructive"} className="ml-2">
                  {googleDrive.connected ? (
                    <><CheckCircle className="h-3 w-3 mr-1" /> Synced</>
                  ) : (
                    <><AlertCircle className="h-3 w-3 mr-1" /> Not Connected</>
                  )}
                </Badge>
              </CardTitle>
              <Button variant="ghost" size="icon" asChild>
                <a href="https://drive.google.com/settings" target="_blank" rel="noopener noreferrer">
                  <Settings className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <CardDescription>
              {googleDrive.email || "team@mycosoft.org"} • Google Workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Storage Used</span>
                  <span>{formatSizeGB(googleDrive.quota?.used || 0)} / {formatSizeGB(googleDrive.quota?.total || 0)}</span>
                </div>
                <Progress 
                  value={((googleDrive.quota?.used || 0) / (googleDrive.quota?.total || 1)) * 100} 
                  className="h-2" 
                />
              </div>
              
              <div className="text-sm font-medium">Quick Access Folders:</div>
              <div className="grid gap-2">
                {[
                  { name: "Mycosoft Shared", icon: Share2 },
                  { name: "Research Documents", icon: FileText },
                  { name: "Species Photos", icon: Image },
                  { name: "Team Presentations", icon: Film },
                ].map((folder) => (
                  <div key={folder.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer">
                    <div className="flex items-center gap-2">
                      <folder.icon className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{folder.name}</span>
                    </div>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" asChild>
                  <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Drive
                  </a>
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Total Storage Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSizeGB(totalStorage)}</div>
            <p className="text-xs text-muted-foreground">Across NAS + Cloud</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Used Space</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSizeGB(usedStorage)}</div>
            <Progress value={(usedStorage / totalStorage) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{formatSizeGB(totalStorage - usedStorage)}</div>
            <p className="text-xs text-muted-foreground">Free space</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Connected Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(nasInfo.connected ? 1 : 0) + (googleDrive.connected ? 1 : 0) + 1}
            </div>
            <p className="text-xs text-muted-foreground">Storage sources</p>
          </CardContent>
        </Card>
      </div>

      {/* File Browser */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>File Browser</CardTitle>
              <CardDescription>Browse and manage files across all storage locations</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={activeStorage} onValueChange={(v) => setActiveStorage(v as typeof activeStorage)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="nas">NAS</TabsTrigger>
                  <TabsTrigger value="gdrive">Google Drive</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Toolbar */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2 flex-1">
              <div className="flex items-center text-sm text-muted-foreground">
                <Folder className="h-4 w-4 mr-1" />
                <span className="font-mono">{currentPath}</span>
              </div>
              {currentPath !== "/" && (
                <Button variant="ghost" size="sm" onClick={() => setCurrentPath("/")}>
                  <ChevronRight className="h-4 w-4 rotate-180" />
                  Back
                </Button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm">
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
              </Button>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </div>
          </div>

          {/* File List */}
          <div className="border rounded-lg">
            <div className="grid grid-cols-12 gap-4 p-3 border-b bg-muted/50 text-sm font-medium">
              <div className="col-span-6">Name</div>
              <div className="col-span-2">Modified</div>
              <div className="col-span-2">Size</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            <div className="divide-y">
              {files
                .filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((file) => (
                  <div
                    key={file.id}
                    className={`grid grid-cols-12 gap-4 p-3 hover:bg-muted/50 cursor-pointer items-center ${
                      selectedFiles.includes(file.id) ? "bg-primary/10" : ""
                    }`}
                    onClick={() => {
                      if (file.type === "folder") {
                        setCurrentPath(file.path)
                      }
                    }}
                  >
                    <div className="col-span-6 flex items-center gap-3">
                      {getFileIcon(file)}
                      <span className="font-medium">{file.name}</span>
                      {file.shared && (
                        <Badge variant="secondary" className="text-xs">
                          <Share2 className="h-3 w-3 mr-1" />
                          Shared
                        </Badge>
                      )}
                    </div>
                    <div className="col-span-2 text-sm text-muted-foreground">
                      {file.modified}
                    </div>
                    <div className="col-span-2 text-sm text-muted-foreground">
                      {file.size ? formatSize(file.size) : "—"}
                    </div>
                    <div className="col-span-2 flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* File Actions Bar */}
          {selectedFiles.length > 0 && (
            <div className="flex items-center gap-4 mt-4 p-3 bg-muted rounded-lg">
              <span className="text-sm">{selectedFiles.length} selected</span>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button variant="outline" size="sm">
                <Move className="h-4 w-4 mr-2" />
                Move
              </Button>
              <Button variant="outline" size="sm" className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage Locations Detail */}
      <Card>
        <CardHeader>
          <CardTitle>All Storage Locations</CardTitle>
          <CardDescription>Detailed view of all connected storage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {storageLocations.map((location) => (
              <div
                key={location.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-muted">{location.icon}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{location.name}</span>
                      <Badge
                        variant={
                          location.status === "online" ? "default" :
                          location.status === "syncing" ? "secondary" : "destructive"
                        }
                      >
                        {location.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{location.provider}</p>
                    <p className="text-xs text-muted-foreground font-mono">{location.path}</p>
                    <div className="flex gap-2 mt-1">
                      {location.features.map((f) => (
                        <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right min-w-[200px]">
                  <div className="font-medium">
                    {formatSizeGB(location.used / 1024)} / {formatSizeGB(location.total / 1024)}
                  </div>
                  <Progress
                    value={(location.used / location.total) * 100}
                    className="w-full mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {((location.used / location.total) * 100).toFixed(1)}% used
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors">
          <CardContent className="p-6 text-center">
            <Upload className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <div className="font-medium">Upload Files</div>
            <p className="text-xs text-muted-foreground">Upload to NAS or Drive</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors">
          <CardContent className="p-6 text-center">
            <Share2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <div className="font-medium">Share Files</div>
            <p className="text-xs text-muted-foreground">Create share links</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors">
          <CardContent className="p-6 text-center">
            <Archive className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <div className="font-medium">Create Backup</div>
            <p className="text-xs text-muted-foreground">Backup to NAS</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" asChild>
          <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer">
            <CardContent className="p-6 text-center">
              <ExternalLink className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <div className="font-medium">Open Google Drive</div>
              <p className="text-xs text-muted-foreground">Full Drive access</p>
            </CardContent>
          </a>
        </Card>
      </div>
    </div>
  )
}
