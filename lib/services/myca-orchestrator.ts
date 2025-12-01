// MYCA Multi-Agent System Orchestrator Client
// Connects to the MYCA MAS for intelligent task processing

interface MYCATask {
  id: string
  type: "scrape" | "analyze" | "classify" | "aggregate"
  priority: "high" | "medium" | "low"
  payload: any
  status?: "pending" | "processing" | "completed" | "failed"
}

interface MYCAResponse {
  taskId: string
  status: string
  result?: any
  error?: string
}

class MYCAOrchestrator {
  private apiUrl: string
  private apiKey: string

  constructor() {
    // MYCA API endpoint (your orchestrator from mycosoft-mas repo)
    this.apiUrl = process.env.MYCA_API_URL || "http://localhost:8001"
    this.apiKey = process.env.MYCA_API_KEY || ""
  }

  async submitTask(task: Omit<MYCATask, "id">): Promise<string> {
    try {
      const response = await fetch(`${this.apiUrl}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(task),
      })

      if (!response.ok) {
        throw new Error(`MYCA API error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.taskId
    } catch (error) {
      console.error("[v0] MYCA task submission failed:", error)
      throw error
    }
  }

  async getTaskStatus(taskId: string): Promise<MYCAResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`MYCA API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error("[v0] MYCA task status check failed:", error)
      throw error
    }
  }

  // Submit a species scraping task to MYCA
  async scrapeSpecies(speciesName: string, sources: string[]): Promise<string> {
    return this.submitTask({
      type: "scrape",
      priority: "high",
      payload: {
        speciesName,
        sources, // ['inaturalist', 'wikipedia', 'fungidb', 'mycobank']
      },
    })
  }

  // Submit a data aggregation task
  async aggregateData(speciesId: string): Promise<string> {
    return this.submitTask({
      type: "aggregate",
      priority: "medium",
      payload: {
        speciesId,
      },
    })
  }

  // Analyze species data using MYCA's AI agents
  async analyzeSpecies(speciesId: string, analysisType: string): Promise<string> {
    return this.submitTask({
      type: "analyze",
      priority: "medium",
      payload: {
        speciesId,
        analysisType,
      },
    })
  }
}

// Singleton instance
const mycaOrchestrator = new MYCAOrchestrator()

export { mycaOrchestrator, MYCAOrchestrator }
export type { MYCATask, MYCAResponse }
