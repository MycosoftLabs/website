import { NextRequest, NextResponse } from "next/server";

// n8n configuration - supports both local and cloud
const N8N_URL = process.env.N8N_URL || "http://192.168.0.188:5678";
const N8N_API_KEY = process.env.N8N_API_KEY || "";
const N8N_USERNAME = process.env.N8N_USERNAME || "admin";
const N8N_PASSWORD = process.env.N8N_PASSWORD || "";
const N8N_CLOUD_URL = process.env.N8N_CLOUD_URL || "";
const N8N_CLOUD_API_KEY = process.env.N8N_CLOUD_API_KEY || "";

async function n8nRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
  
  // Try API key first
  if (N8N_API_KEY) {
    headers["X-N8N-API-KEY"] = N8N_API_KEY;
  } else if (N8N_USERNAME && N8N_PASSWORD) {
    // Fallback to basic auth
    const credentials = Buffer.from(`${N8N_USERNAME}:${N8N_PASSWORD}`).toString("base64");
    headers["Authorization"] = `Basic ${credentials}`;
  }

  try {
    const response = await fetch(`${N8N_URL}/api/v1${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`n8n API error: ${response.status} - ${error}`);
    }

    return response.json();
  } catch (localError) {
    // Try n8n Cloud as fallback
    if (N8N_CLOUD_URL && N8N_CLOUD_API_KEY) {
      console.log("Local n8n failed, trying cloud...");
      const cloudHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-N8N-API-KEY": N8N_CLOUD_API_KEY,
      };
      
      const cloudResponse = await fetch(`${N8N_CLOUD_URL}/api/v1${endpoint}`, {
        ...options,
        headers: { ...cloudHeaders, ...options.headers },
        signal: AbortSignal.timeout(10000),
      });

      if (!cloudResponse.ok) {
        const error = await cloudResponse.text();
        throw new Error(`n8n Cloud API error: ${cloudResponse.status} - ${error}`);
      }

      return cloudResponse.json();
    }
    throw localError;
  }
}

const categorizeWorkflow = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes("myca") || lower.includes("command")) return "core";
  if (lower.includes("native")) return "native";
  if (lower.includes("ops") || lower.includes("proxmox") || lower.includes("unifi")) return "ops";
  if (lower.includes("speech") || lower.includes("voice") || lower.includes("audio")) return "speech";
  if (lower.includes("mindex")) return "mindex";
  return "custom";
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const active = searchParams.get("active");
  const category = searchParams.get("category");

  try {
    const data = await n8nRequest("/workflows");
    let workflows = data.data || [];

    if (active === "true") {
      workflows = workflows.filter((w: any) => w.active);
    } else if (active === "false") {
      workflows = workflows.filter((w: any) => !w.active);
    }

    workflows = workflows.map((w: any) => ({
      ...w,
      category: categorizeWorkflow(w.name),
      nodesCount: w.nodes?.length || 0,
    }));

    if (category) {
      workflows = workflows.filter((w: any) => w.category === category);
    }

    const stats = {
      total: workflows.length,
      active: workflows.filter((w: any) => w.active).length,
      inactive: workflows.filter((w: any) => !w.active).length,
      byCategory: workflows.reduce((acc: any, w: any) => {
        acc[w.category] = (acc[w.category] || 0) + 1;
        return acc;
      }, {}),
    };

    return NextResponse.json({ workflows, stats });
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return NextResponse.json({ error: String(error), workflows: [], stats: { total: 0, active: 0, inactive: 0, byCategory: {} } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { workflowId, action } = body;

  if (!workflowId || !action) {
    return NextResponse.json({ error: "workflowId and action required" }, { status: 400 });
  }

  try {
    if (action === "activate") {
      const result = await n8nRequest(`/workflows/${workflowId}/activate`, { method: "POST" });
      return NextResponse.json({ success: true, result });
    } else if (action === "deactivate") {
      const result = await n8nRequest(`/workflows/${workflowId}/deactivate`, { method: "POST" });
      return NextResponse.json({ success: true, result });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error with workflow action:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
