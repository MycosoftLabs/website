// Centralized NatureOS API client with proper authentication
const NATUREOS_API_BASE = process.env.NATUREOS_API_URL || "https://natureos-api.mycosoft.com"
const API_KEY = process.env.NATUREOS_API_KEY

interface NatureOSResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export class NatureOSAPI {
  private baseURL: string
  private apiKey: string

  constructor(baseURL?: string, apiKey?: string) {
    this.baseURL = baseURL || NATUREOS_API_BASE
    this.apiKey = apiKey || API_KEY || ""
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<NatureOSResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          ...options.headers,
        },
      })

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      const data = await response.json()
      return {
        success: true,
        data,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  // Dashboard data (using the correct backend endpoint)
  async getDashboardData() {
    return this.request("/api/mycosoft/website/dashboard")
  }

  // MYCA query
  async queryMYCA(question: string, context?: any) {
    return this.request("/api/mycosoft/myca/query", {
      method: "POST",
      body: JSON.stringify({ question, context }),
    })
  }

  // Get task status
  async getTaskStatus(taskId: string) {
    return this.request(`/api/mycosoft/myca/task/${taskId}`)
  }
}

export const natureOSAPI = new NatureOSAPI()
