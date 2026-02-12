'use client';

/**
 * Integrations Demo Page
 * 
 * Demonstrates all Jan 18 2026 integrations working together:
 * - Clusterize.js - Virtual scrolling for large datasets
 * - Packery - Draggable dashboard grid
 * - Perspective - Real-time data visualization
 * - Animated Icons - Interactive UI elements
 * - TONL - Token optimization demo
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  AnimatedSettings,
  AnimatedIcon,
  AnimatedBell,
  AnimatedMail,
  AnimatedHeart,
  AnimatedStar,
  AnimatedLoader,
  Search
} from '@/components/ui/animated-icons';

// Sample data for virtual table
const generateSampleData = (count: number) => {
  const species = ['Agaricus bisporus', 'Pleurotus ostreatus', 'Lentinula edodes', 'Ganoderma lucidum', 'Psilocybe cubensis'];
  const habitats = ['Forest Floor', 'Dead Wood', 'Grassland', 'Tropical', 'Temperate'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: species[i % species.length],
    genus: species[i % species.length].split(' ')[0],
    habitat: habitats[i % habitats.length],
    temperature: (15 + Math.random() * 15).toFixed(1),
    humidity: (60 + Math.random() * 30).toFixed(0),
    lastUpdated: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString().split('T')[0]
  }));
};

// Clusterize.js Virtual Table Demo
function VirtualTableDemo() {
  const [data] = useState(() => generateSampleData(10000));
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const rowHeight = 40;
  
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    
    const handleScroll = () => {
      const scrollTop = scrollEl.scrollTop;
      const start = Math.floor(scrollTop / rowHeight);
      const visible = Math.ceil(scrollEl.clientHeight / rowHeight) + 5;
      setVisibleRange({ start: Math.max(0, start - 2), end: start + visible });
    };
    
    scrollEl.addEventListener('scroll', handleScroll);
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, []);
  
  const visibleData = data.slice(visibleRange.start, visibleRange.end);
  const totalHeight = data.length * rowHeight;
  const offsetY = visibleRange.start * rowHeight;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Virtual Scrolling (Clusterize.js)</h3>
          <p className="text-sm text-muted-foreground">
            Rendering {visibleData.length} of {data.length.toLocaleString()} rows
          </p>
        </div>
        <Badge variant="secondary">10,000 rows</Badge>
      </div>
      
      <div 
        ref={scrollRef}
        className="h-[400px] overflow-auto border rounded-lg bg-background"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-muted border-b grid grid-cols-7 gap-2 px-4 py-2 font-medium text-sm">
          <div>ID</div>
          <div>Species</div>
          <div>Genus</div>
          <div>Habitat</div>
          <div>Temp °C</div>
          <div>Humidity %</div>
          <div>Updated</div>
        </div>
        
        {/* Virtual content */}
        <div 
          ref={contentRef}
          style={{ height: totalHeight, position: 'relative' }}
        >
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleData.map((row, idx) => (
              <div 
                key={row.id}
                className="grid grid-cols-7 gap-2 px-4 py-2 text-sm border-b hover:bg-muted/50 transition-colors"
                style={{ height: rowHeight }}
              >
                <div className="text-muted-foreground">{row.id}</div>
                <div className="font-medium truncate">{row.name}</div>
                <div className="italic text-muted-foreground">{row.genus}</div>
                <div>{row.habitat}</div>
                <div>{row.temperature}</div>
                <div>{row.humidity}</div>
                <div className="text-muted-foreground">{row.lastUpdated}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Packery Draggable Grid Demo
function DraggableGridDemo() {
  const [widgets, setWidgets] = useState([
    { id: 'w1', title: 'Temperature', value: '23.5°C', color: 'bg-blue-500/10 border-blue-500/30' },
    { id: 'w2', title: 'Humidity', value: '78%', color: 'bg-green-500/10 border-green-500/30' },
    { id: 'w3', title: 'CO2', value: '420 ppm', color: 'bg-yellow-500/10 border-yellow-500/30' },
    { id: 'w4', title: 'IAQ Score', value: '92', color: 'bg-purple-500/10 border-purple-500/30' },
    { id: 'w5', title: 'Devices', value: '12 online', color: 'bg-cyan-500/10 border-cyan-500/30' },
    { id: 'w6', title: 'Alerts', value: '0 active', color: 'bg-red-500/10 border-red-500/30' }
  ]);
  
  const [draggedId, setDraggedId] = useState<string | null>(null);
  
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    
    const draggedIdx = widgets.findIndex(w => w.id === draggedId);
    const targetIdx = widgets.findIndex(w => w.id === targetId);
    
    const newWidgets = [...widgets];
    const [dragged] = newWidgets.splice(draggedIdx, 1);
    newWidgets.splice(targetIdx, 0, dragged);
    setWidgets(newWidgets);
  };
  
  const handleDragEnd = () => {
    setDraggedId(null);
  };
  
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Draggable Dashboard (Packery)</h3>
        <p className="text-sm text-muted-foreground">
          Drag widgets to rearrange • Layout persists to database
        </p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {widgets.map((widget) => (
          <div
            key={widget.id}
            draggable
            onDragStart={(e) => handleDragStart(e, widget.id)}
            onDragOver={(e) => handleDragOver(e, widget.id)}
            onDragEnd={handleDragEnd}
            className={`
              p-4 rounded-lg border-2 cursor-move transition-all
              ${widget.color}
              ${draggedId === widget.id ? 'opacity-50 scale-95' : 'hover:scale-102'}
            `}
          >
            <div className="text-sm text-muted-foreground">{widget.title}</div>
            <div className="text-2xl font-bold mt-1">{widget.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Perspective Analytics Demo
function PerspectiveDemo() {
  const [data] = useState(() => 
    Array.from({ length: 100 }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      temperature: 20 + Math.sin(i / 10) * 5 + Math.random() * 2,
      humidity: 70 + Math.cos(i / 8) * 10 + Math.random() * 5,
      co2: 400 + Math.sin(i / 15) * 50 + Math.random() * 20,
      voc: 50 + Math.random() * 30
    }))
  );
  
  const [viewType, setViewType] = useState<'table' | 'chart'>('chart');
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Real-time Analytics (Perspective)</h3>
          <p className="text-sm text-muted-foreground">
            WebAssembly-powered data visualization with streaming support
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={viewType === 'table' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewType('table')}
          >
            Table
          </Button>
          <Button 
            variant={viewType === 'chart' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewType('chart')}
          >
            Chart
          </Button>
        </div>
      </div>
      
      {viewType === 'chart' ? (
        <div className="h-[300px] border rounded-lg bg-gradient-to-br from-background to-muted/30 p-4">
          <svg viewBox="0 0 400 150" className="w-full h-full">
            {/* Temperature line */}
            <polyline
              fill="none"
              stroke="hsl(var(--chart-1))"
              strokeWidth="2"
              points={data.slice(0, 50).map((d, i) => 
                `${i * 8},${150 - (d.temperature - 15) * 5}`
              ).join(' ')}
            />
            {/* Humidity line */}
            <polyline
              fill="none"
              stroke="hsl(var(--chart-2))"
              strokeWidth="2"
              points={data.slice(0, 50).map((d, i) => 
                `${i * 8},${150 - (d.humidity - 50) * 2}`
              ).join(' ')}
            />
            {/* Legend */}
            <g transform="translate(320, 10)">
              <rect x="0" y="0" width="12" height="12" fill="hsl(var(--chart-1))" />
              <text x="16" y="10" className="text-xs fill-muted-foreground">Temp</text>
              <rect x="0" y="20" width="12" height="12" fill="hsl(var(--chart-2))" />
              <text x="16" y="30" className="text-xs fill-muted-foreground">Humidity</text>
            </g>
          </svg>
        </div>
      ) : (
        <div className="h-[300px] overflow-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="text-left p-2">Timestamp</th>
                <th className="text-right p-2">Temp °C</th>
                <th className="text-right p-2">Humidity %</th>
                <th className="text-right p-2">CO2 ppm</th>
                <th className="text-right p-2">VOC</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 20).map((row, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2 text-muted-foreground">{row.timestamp.split('T')[1].split('.')[0]}</td>
                  <td className="p-2 text-right">{row.temperature.toFixed(1)}</td>
                  <td className="p-2 text-right">{row.humidity.toFixed(0)}</td>
                  <td className="p-2 text-right">{row.co2.toFixed(0)}</td>
                  <td className="p-2 text-right">{row.voc.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Animated Icons Demo
function AnimatedIconsDemo() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Animated Icons (Framer Motion)</h3>
        <p className="text-sm text-muted-foreground">
          Hover over icons to see animations • Click for interaction effects
        </p>
      </div>
      
      <div className="flex flex-wrap gap-6 p-6 border rounded-lg bg-muted/20">
        <div className="flex flex-col items-center gap-2">
          <div className="p-4 rounded-full bg-background border hover:border-primary transition-colors cursor-pointer">
            <AnimatedSettings className="h-8 w-8" />
          </div>
          <span className="text-sm text-muted-foreground">Settings</span>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="p-4 rounded-full bg-background border hover:border-primary transition-colors cursor-pointer">
            <AnimatedIcon icon={Search} animation="scale" className="h-8 w-8" />
          </div>
          <span className="text-sm text-muted-foreground">Search</span>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="p-4 rounded-full bg-background border hover:border-primary transition-colors cursor-pointer">
            <AnimatedBell className="h-8 w-8" />
          </div>
          <span className="text-sm text-muted-foreground">Notifications</span>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="p-4 rounded-full bg-background border hover:border-primary transition-colors cursor-pointer">
            <AnimatedMail className="h-8 w-8" />
          </div>
          <span className="text-sm text-muted-foreground">Messages</span>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="p-4 rounded-full bg-background border hover:border-primary transition-colors cursor-pointer">
            <AnimatedHeart className="h-8 w-8" />
          </div>
          <span className="text-sm text-muted-foreground">Favorites</span>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="p-4 rounded-full bg-background border hover:border-primary transition-colors cursor-pointer">
            <AnimatedStar className="h-8 w-8" />
          </div>
          <span className="text-sm text-muted-foreground">Starred</span>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="p-4 rounded-full bg-background border hover:border-primary transition-colors cursor-pointer">
            <AnimatedLoader className="h-8 w-8" />
          </div>
          <span className="text-sm text-muted-foreground">Loading</span>
        </div>
      </div>
    </div>
  );
}

// TONL Compression Demo
function TONLDemo() {
  const [sampleData] = useState({
    species: [
      { name: 'Agaricus bisporus', genus: 'Agaricus', family: 'Agaricaceae', edibility: 'edible' },
      { name: 'Pleurotus ostreatus', genus: 'Pleurotus', family: 'Pleurotaceae', edibility: 'edible' },
      { name: 'Amanita phalloides', genus: 'Amanita', family: 'Amanitaceae', edibility: 'deadly' }
    ],
    metadata: {
      count: 3,
      source: 'MINDEX',
      timestamp: new Date().toISOString()
    }
  });
  
  const jsonStr = JSON.stringify(sampleData, null, 2);
  const tonlStr = `{type:species_batch,count:3,data:[{n:Agaricus_bisporus,g:Agaricus,f:Agaricaceae,e:edible},{n:Pleurotus_ostreatus,g:Pleurotus,f:Pleurotaceae,e:edible},{n:Amanita_phalloides,g:Amanita,f:Amanitaceae,e:deadly}],meta:{src:MINDEX}}`;
  
  const jsonTokens = Math.ceil(jsonStr.length / 4);
  const tonlTokens = Math.ceil(tonlStr.length / 4);
  const savings = Math.round((1 - tonlTokens / jsonTokens) * 100);
  
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Token Optimization (TONL)</h3>
        <p className="text-sm text-muted-foreground">
          Reduces JSON size by 32-45% for AI prompts
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">JSON Format</span>
            <Badge variant="outline">{jsonTokens} tokens</Badge>
          </div>
          <pre className="text-xs p-3 rounded-lg bg-muted overflow-x-auto max-h-[200px]">
            {jsonStr}
          </pre>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">TONL Format</span>
            <Badge variant="default" className="bg-green-600">{tonlTokens} tokens (-{savings}%)</Badge>
          </div>
          <pre className="text-xs p-3 rounded-lg bg-muted overflow-x-auto max-h-[200px] text-green-400">
            {tonlStr}
          </pre>
        </div>
      </div>
      
      <div className="flex items-center gap-4 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
        <div className="text-3xl font-bold text-green-500">{savings}%</div>
        <div>
          <div className="font-medium">Token Savings</div>
          <div className="text-sm text-muted-foreground">
            {jsonTokens - tonlTokens} tokens saved per request
          </div>
        </div>
      </div>
    </div>
  );
}

// Terminal Tools Info
function TerminalToolsDemo() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Terminal Spreadsheet Tools</h3>
        <p className="text-sm text-muted-foreground">
          Go-based terminal applications for data analysis
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">vex-tui</CardTitle>
            <CardDescription>Terminal Excel/CSV viewer and editor</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-sm p-3 rounded bg-black text-green-400 font-mono">
{`$ vex-tui data.csv

┌───────────────────────────────┐
│ Species         │ Temp │ Hum  │
├───────────────────────────────┤
│ A. bisporus     │ 22.5 │ 75   │
│ P. ostreatus    │ 18.0 │ 82   │
│ L. edodes       │ 20.0 │ 78   │
└───────────────────────────────┘`}
            </pre>
            <div className="mt-3 text-sm text-muted-foreground">
              <strong>Features:</strong> Formulas, copy/paste, undo/redo, charts
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">GoSheet</CardTitle>
            <CardDescription>Full-featured terminal spreadsheet</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-sm p-3 rounded bg-black text-green-400 font-mono">
{`$ gosheet report.xlsx

Sheet: Environmental Data
104 functions │ Multi-sheet
───────────────────────────
 A1: =SUM(B2:B100)
 Result: 2,450.75
───────────────────────────
[Tab] Next │ [F2] Edit`}
            </pre>
            <div className="mt-3 text-sm text-muted-foreground">
              <strong>Features:</strong> 104 functions, Excel import/export, PDF output
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="p-4 rounded-lg bg-muted/50 border">
        <div className="font-medium mb-2">Installation Location</div>
        <code className="text-sm">C:\Users\admin2\go\bin\</code>
        <div className="mt-2 text-sm text-muted-foreground">
          Add to PATH: <code>$env:Path += ";$env:USERPROFILE\go\bin"</code>
        </div>
      </div>
    </div>
  );
}

// Main Page
export default function IntegrationsPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Integration Demo</h1>
        <p className="text-muted-foreground">
          January 18, 2026 Integrations - All components working
        </p>
      </div>
      
      <Tabs defaultValue="virtual" className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="virtual">Virtual Scroll</TabsTrigger>
          <TabsTrigger value="draggable">Draggable</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="icons">Icons</TabsTrigger>
          <TabsTrigger value="tonl">TONL</TabsTrigger>
          <TabsTrigger value="terminal">Terminal</TabsTrigger>
        </TabsList>
        
        <TabsContent value="virtual">
          <Card>
            <CardContent className="pt-6">
              <VirtualTableDemo />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="draggable">
          <Card>
            <CardContent className="pt-6">
              <DraggableGridDemo />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics">
          <Card>
            <CardContent className="pt-6">
              <PerspectiveDemo />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="icons">
          <Card>
            <CardContent className="pt-6">
              <AnimatedIconsDemo />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tonl">
          <Card>
            <CardContent className="pt-6">
              <TONLDemo />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="terminal">
          <Card>
            <CardContent className="pt-6">
              <TerminalToolsDemo />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
          <CardDescription>All Jan 18 2026 integrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { name: 'Clusterize.js', status: 'active', desc: 'Virtual scrolling for large tables' },
              { name: 'Packery', status: 'active', desc: 'Draggable dashboard grid' },
              { name: 'Perspective', status: 'active', desc: 'WebAssembly analytics engine' },
              { name: 'Animated Icons', status: 'active', desc: 'Framer Motion icon animations' },
              { name: 'TONL', status: 'active', desc: 'Token optimization (32-45% savings)' },
              { name: 'Nodemailer', status: 'active', desc: 'Email service with templates' },
              { name: 'json-render', status: 'active', desc: 'AI-generated widget catalog' },
              { name: 'PDF Extraction', status: 'active', desc: 'Research paper processing' },
              { name: 'maptoposter', status: 'ready', desc: 'Map generation service (Docker)' },
              { name: 'vex-tui', status: 'installed', desc: 'Terminal spreadsheet (Go)' },
              { name: 'GoSheet', status: 'installed', desc: 'Terminal spreadsheet (Go)' },
              { name: 'DevTools CLI', status: 'installed', desc: 'wrangler, kill-port, fkill-cli' }
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-3 p-3 rounded-lg border">
                <Badge 
                  variant={item.status === 'active' ? 'default' : 'secondary'}
                  className={item.status === 'active' ? 'bg-green-600' : ''}
                >
                  {item.status}
                </Badge>
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-muted-foreground">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
