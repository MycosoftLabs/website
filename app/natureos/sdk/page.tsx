"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Code, 
  Copy, 
  Check, 
  Download,
  Github,
  ExternalLink,
  Star,
  GitFork,
  Terminal,
  Book,
  Zap,
  Bot,
  Sparkles,
  Send,
  Play,
  FileCode,
  Package,
  Globe,
  Lock,
  Users,
  Activity,
  CheckCircle
} from "lucide-react"

const GITHUB_ORG = "mycosoftorg"

interface GitHubRepo {
  name: string
  description: string
  stars: number
  forks: number
  language: string
  url: string
  topics: string[]
  isReal: boolean
  isPublic: boolean
}

const REPOS: GitHubRepo[] = [
  { 
    name: "mycosoft-mas", 
    description: "Multi-Agent System (MAS) - AI orchestrator for fungal intelligence research", 
    stars: 0, 
    forks: 0, 
    language: "Python", 
    url: `https://github.com/${GITHUB_ORG}/mycosoft-mas`, 
    topics: ["ai", "multi-agent-system", "mycology", "python"],
    isReal: true,
    isPublic: true
  },
  { 
    name: "NatureOS", 
    description: "Cloud-native platform for nature-computer interfaces and environmental monitoring", 
    stars: 0, 
    forks: 0, 
    language: "TypeScript", 
    url: `https://github.com/${GITHUB_ORG}/NatureOS`, 
    topics: ["nextjs", "nature-computing", "dashboard", "api"],
    isReal: true,
    isPublic: true
  },
  { 
    name: "mindex-sdk", 
    description: "SDK for accessing MINDEX fungal database - 500k+ species", 
    stars: 12, 
    forks: 3, 
    language: "TypeScript", 
    url: `https://github.com/${GITHUB_ORG}/mindex-sdk`, 
    topics: ["sdk", "api", "mycology", "database"],
    isReal: true,
    isPublic: true
  },
  { 
    name: "mycobrain-firmware", 
    description: "ESP32 firmware for MycoBrain IoT sensors and FCI devices", 
    stars: 8, 
    forks: 2, 
    language: "C++", 
    url: `https://github.com/${GITHUB_ORG}/mycobrain-firmware`, 
    topics: ["iot", "esp32", "sensors", "arduino"],
    isReal: true,
    isPublic: true
  },
  { 
    name: "nlm-funga", 
    description: "Nature Learning Model - First stage: Fungal language understanding", 
    stars: 45, 
    forks: 12, 
    language: "Python", 
    url: `https://github.com/${GITHUB_ORG}/nlm-funga`, 
    topics: ["machine-learning", "nlp", "mycology", "research"],
    isReal: true,
    isPublic: false
  },
  { 
    name: "myca-agents", 
    description: "MYCA AI agent definitions and tools", 
    stars: 5, 
    forks: 1, 
    language: "Python", 
    url: `https://github.com/${GITHUB_ORG}/myca-agents`, 
    topics: ["ai-agents", "llm", "automation"],
    isReal: true,
    isPublic: true
  },
]

const CODE_EXAMPLES = {
  python: `# Install: pip install mycosoft-sdk
from mycosoft import MINDEX, MYCA

# Initialize MINDEX client
mindex = MINDEX(api_key="your-api-key")

# Search for species
results = mindex.species.search(
    query="amanita",
    limit=10,
    include_observations=True
)

for species in results:
    print(f"{species.scientific_name}: {species.observation_count} observations")

# Chat with MYCA AI
myca = MYCA()
response = myca.chat(
    "What are the medicinal properties of Lion's Mane?",
    context="research"
)
print(response.message)

# All interactions are logged for MYCA training
# Your usage helps improve the AI!`,

  typescript: `// Install: npm install @mycosoft/sdk
import { MINDEXClient, MYCAClient } from '@mycosoft/sdk';

// Initialize clients
const mindex = new MINDEXClient({ apiKey: 'your-api-key' });
const myca = new MYCAClient();

// Search fungal species
const species = await mindex.species.search({
  query: 'psilocybe',
  limit: 10,
  filters: { medicinal: true }
});

species.forEach(s => {
  console.log(\`\${s.scientificName}: \${s.commonName}\`);
});

// Get AI assistance
const response = await myca.chat({
  message: 'Explain mycelium network communication',
  context: 'development'
});

console.log(response.message);

// SDK usage is logged to improve MYCA
// Thank you for contributing to our AI!`,

  curl: `# MINDEX Species API
curl -X GET "https://api.mycosoft.org/v1/species/search?q=agaricus&limit=10" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"

# MYCA AI Chat
curl -X POST "https://api.mycosoft.org/v1/ai/chat" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "What fungi are best for bioremediation?",
    "context": "research"
  }'

# Submit Training Feedback
curl -X POST "https://api.mycosoft.org/v1/training/feedback" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "correction",
    "original": "incorrect response",
    "corrected": "better response",
    "context": "species identification"
  }'`,

  arduino: `// MycoBrain Sensor Integration
#include <WiFi.h>
#include <HTTPClient.h>
#include <MycoBrain.h>

MycoBrain sensor;
const char* apiEndpoint = "https://api.mycosoft.org/v1/telemetry";

void setup() {
  Serial.begin(115200);
  sensor.begin();
  
  // Connect to WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
  
  Serial.println("MycoBrain connected to NatureOS");
}

void loop() {
  // Read sensor data
  float temperature = sensor.readTemperature();
  float humidity = sensor.readHumidity();
  float co2 = sensor.readCO2();
  float bioelectric = sensor.readBioelectric();
  
  // Send to NatureOS
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(apiEndpoint);
    http.addHeader("Authorization", "Bearer " + String(API_KEY));
    http.addHeader("Content-Type", "application/json");
    
    String payload = String("{\\"temp\\":") + temperature + 
                     ",\\"humidity\\":" + humidity +
                     ",\\"co2\\":" + co2 +
                     ",\\"bioelectric\\":" + bioelectric + "}";
    
    int httpCode = http.POST(payload);
    http.end();
  }
  
  delay(5000); // Send every 5 seconds
}`
}

export default function SDKPage() {
  const [copied, setCopied] = useState("")
  const [repos, setRepos] = useState<GitHubRepo[]>(REPOS)
  const [activeLanguage, setActiveLanguage] = useState("typescript")
  const [tryItInput, setTryItInput] = useState("")
  const [tryItOutput, setTryItOutput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Log SDK page view for MYCA training
    fetch("/api/myca/training", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "sdk_view",
        input: "SDK page viewed",
        output: "",
        context: "sdk-access",
        source: "sdk",
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {})
    
    // Try to fetch real GitHub stats
    async function fetchGitHubStats() {
      try {
        const response = await fetch(`https://api.github.com/orgs/${GITHUB_ORG}/repos?per_page=100`)
        if (response.ok) {
          const data = await response.json()
          setRepos(prev => prev.map(repo => {
            const ghRepo = data.find((r: any) => r.name.toLowerCase() === repo.name.toLowerCase())
            if (ghRepo) {
              return {
                ...repo,
                stars: ghRepo.stargazers_count,
                forks: ghRepo.forks_count,
                description: ghRepo.description || repo.description,
                language: ghRepo.language || repo.language,
              }
            }
            return repo
          }))
        }
      } catch {
        // Use default data if GitHub API fails
      }
    }
    fetchGitHubStats()
  }, [])

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopied(id)
    setTimeout(() => setCopied(""), 2000)
    
    // Log copy action
    fetch("/api/myca/training", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "sdk_copy",
        input: id,
        output: "Code copied",
        context: "sdk-usage",
        source: "sdk",
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {})
  }

  const tryAPI = async () => {
    if (!tryItInput) return
    setIsLoading(true)
    
    try {
      // Log API try action
      await fetch("/api/myca/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sdk_api_try",
          input: tryItInput,
          output: "",
          context: "sdk-interactive",
          source: "sdk",
          timestamp: new Date().toISOString(),
        }),
      })
      
      // Try the API
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: tryItInput,
          context: "SDK API Explorer",
        }),
      })
      
      if (res.ok) {
        const data = await res.json()
        setTryItOutput(JSON.stringify(data, null, 2))
      } else {
        setTryItOutput(`Error: ${res.status} ${res.statusText}`)
      }
    } catch (e) {
      setTryItOutput(`Error: ${e}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <Badge variant="outline" className="bg-purple-500/20 text-purple-400 text-sm px-4 py-1">
          <Sparkles className="h-3 w-3 mr-1" />
          MYCA learns from all SDK usage
        </Badge>
        <h1 className="text-4xl font-bold">
          NatureOS Developer SDK
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Build applications on top of Mycosoft's fungal intelligence platform.
          Access 500,000+ species, real-time data, and MYCA AI.
        </p>
        <div className="flex justify-center gap-4">
          <Button size="lg" asChild>
            <a href={`https://github.com/${GITHUB_ORG}`} target="_blank" rel="noopener noreferrer">
              <Github className="h-5 w-5 mr-2" />
              View on GitHub
            </a>
          </Button>
          <Button size="lg" variant="outline">
            <Book className="h-5 w-5 mr-2" />
            Documentation
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">500k+</div>
            <div className="text-sm text-muted-foreground">Species in MINDEX</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-500">12</div>
            <div className="text-sm text-muted-foreground">API Endpoints</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-purple-500">MYCA</div>
            <div className="text-sm text-muted-foreground">AI Assistant</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-500">{repos.length}</div>
            <div className="text-sm text-muted-foreground">Open Source Repos</div>
          </CardContent>
        </Card>
      </div>

      {/* Installation & Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Quick Start
          </CardTitle>
          <CardDescription>Get started in minutes with our SDKs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Badge>npm</Badge>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyCode("npm install @mycosoft/sdk", "npm")}
                >
                  {copied === "npm" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <code className="text-sm font-mono">npm install @mycosoft/sdk</code>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Badge>pip</Badge>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyCode("pip install mycosoft-sdk", "pip")}
                >
                  {copied === "pip" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <code className="text-sm font-mono">pip install mycosoft-sdk</code>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Badge>cargo</Badge>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyCode("cargo add mycosoft", "cargo")}
                >
                  {copied === "cargo" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <code className="text-sm font-mono">cargo add mycosoft</code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Code Examples
          </CardTitle>
          <CardDescription>Examples in multiple languages - Your usage trains MYCA</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="typescript">TypeScript</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
                <TabsTrigger value="curl">cURL</TabsTrigger>
                <TabsTrigger value="arduino">Arduino</TabsTrigger>
              </TabsList>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => copyCode(CODE_EXAMPLES[activeLanguage as keyof typeof CODE_EXAMPLES], activeLanguage)}
              >
                {copied === activeLanguage ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                Copy Code
              </Button>
            </div>
            
            {Object.entries(CODE_EXAMPLES).map(([lang, code]) => (
              <TabsContent key={lang} value={lang}>
                <pre className="bg-slate-950 text-gray-300 p-4 rounded-lg overflow-auto max-h-[400px] text-sm font-mono">
                  <code>{code}</code>
                </pre>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Try It - Interactive API */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Try the API
            <Badge variant="outline" className="ml-2 bg-purple-500/20 text-purple-400">
              <Bot className="h-3 w-3 mr-1" />
              MYCA Powered
            </Badge>
          </CardTitle>
          <CardDescription>
            Test the MYCA AI API directly - All interactions train the model
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input 
              placeholder="Ask MYCA anything... (e.g., 'What is mycelium?')"
              value={tryItInput}
              onChange={(e) => setTryItInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && tryAPI()}
              className="flex-1"
            />
            <Button onClick={tryAPI} disabled={isLoading || !tryItInput}>
              {isLoading ? (
                <Activity className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
          
          {tryItOutput && (
            <div className="relative">
              <pre className="bg-slate-950 text-green-400 p-4 rounded-lg overflow-auto max-h-[300px] text-sm font-mono">
                {tryItOutput}
              </pre>
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute top-2 right-2"
                onClick={() => copyCode(tryItOutput, "output")}
              >
                {copied === "output" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open Source Repositories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Open Source Repositories
          </CardTitle>
          <CardDescription>
            Contribute to Mycosoft - Help us build the future of nature computing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {repos.map((repo) => (
              <a
                key={repo.name}
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 rounded-lg border hover:border-primary transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{repo.name}</span>
                      {!repo.isPublic && (
                        <Badge variant="outline" className="text-xs">
                          <Lock className="h-3 w-3 mr-1" />
                          Private
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{repo.description}</p>
                    <div className="flex gap-2 mt-2">
                      {repo.topics.slice(0, 3).map((topic) => (
                        <Badge key={topic} variant="secondary" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {repo.stars}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="h-3 w-3" />
                      {repo.forks}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="w-3 h-3 rounded-full" style={{ 
                    backgroundColor: repo.language === "Python" ? "#3572A5" : 
                                    repo.language === "TypeScript" ? "#3178c6" :
                                    repo.language === "C++" ? "#f34b7d" : "#888"
                  }} />
                  <span className="text-xs text-muted-foreground">{repo.language}</span>
                </div>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            API Capabilities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <Package className="h-8 w-8 text-blue-500 mb-2" />
              <h3 className="font-semibold">MINDEX API</h3>
              <p className="text-sm text-muted-foreground">
                Access 500k+ fungal species, observations, research papers, and bioactive compounds
              </p>
              <Button variant="link" className="px-0 mt-2" asChild>
                <a href="/natureos/api">Explore Endpoints →</a>
              </Button>
            </div>
            <div className="p-4 border rounded-lg">
              <Bot className="h-8 w-8 text-purple-500 mb-2" />
              <h3 className="font-semibold">MYCA AI</h3>
              <p className="text-sm text-muted-foreground">
                Natural language AI for fungal knowledge, code generation, and research assistance
              </p>
              <Button variant="link" className="px-0 mt-2" asChild>
                <a href="/natureos/shell">Try Shell →</a>
              </Button>
            </div>
            <div className="p-4 border rounded-lg">
              <Activity className="h-8 w-8 text-green-500 mb-2" />
              <h3 className="font-semibold">Real-time Data</h3>
              <p className="text-sm text-muted-foreground">
                WebSocket streams for sensor data, observations, and network status
              </p>
              <Button variant="link" className="px-0 mt-2" asChild>
                <a href="/natureos/devices">View Devices →</a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MYCA Training Info */}
      <Card className="border-purple-500/50 bg-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Help Train MYCA
          </CardTitle>
          <CardDescription>
            Every SDK interaction improves our AI. Thank you for contributing!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            When you use the SDK, your interactions (without personal data) are logged to improve MYCA's understanding of:
          </p>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Species queries</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Code patterns</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Research questions</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Error handling</span>
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" asChild>
              <a href="/natureos/model-training">
                <Bot className="h-4 w-4 mr-2" />
                Learn About NLM
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={`https://github.com/${GITHUB_ORG}`} target="_blank" rel="noopener noreferrer">
                <Users className="h-4 w-4 mr-2" />
                Join Contributors
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contributing */}
      <Card>
        <CardHeader>
          <CardTitle>Contributing</CardTitle>
          <CardDescription>Help us improve the Mycosoft ecosystem</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">🐛 Report Bugs</h4>
              <p className="text-sm text-muted-foreground">
                Found an issue? Open a GitHub issue with reproduction steps.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">💡 Feature Requests</h4>
              <p className="text-sm text-muted-foreground">
                Have an idea? Submit it via GitHub discussions.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">📝 Documentation</h4>
              <p className="text-sm text-muted-foreground">
                Help improve our docs by submitting pull requests.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">🧪 Add Tests</h4>
              <p className="text-sm text-muted-foreground">
                Increase test coverage and reliability.
              </p>
            </div>
          </div>
          
          <div className="flex justify-center">
            <Button size="lg" asChild>
              <a href={`https://github.com/${GITHUB_ORG}`} target="_blank" rel="noopener noreferrer">
                <Github className="h-5 w-5 mr-2" />
                Start Contributing
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
