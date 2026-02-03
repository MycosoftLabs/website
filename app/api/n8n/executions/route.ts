import { NextRequest, NextResponse } from "next/server";

const N8N_URL = process.env.N8N_URL || "http://192.168.0.188:5678";
const N8N_API_KEY = process.env.N8N_API_KEY || "";

async function n8nRequest(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
  
  if (N8N_API_KEY) {
    headers["X-N8N-API-KEY"] = N8N_API_KEY;
  }

  const response = await fetch(`${N8N_URL}/api/v1${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`n8n API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const workflowId = searchParams.get("workflowId");
  const status = searchParams.get("status");
  const limit = searchParams.get("limit") || "50";

  try {
    let endpoint = `/executions?limit=${limit}`;
    if (workflowId) endpoint += `&workflowId=${workflowId}`;
    if (status) endpoint += `&status=${status}`;

    const data = await n8nRequest(endpoint);
    const executions = data.data || [];

    const stats = {
      total: executions.length,
      success: executions.filter((e: any) => e.status === "success").length,
      error: executions.filter((e: any) => e.status === "error" || e.status === "failed").length,
      running: executions.filter((e: any) => e.status === "running").length,
    };

    return NextResponse.json({ executions, stats });
  } catch (error) {
    console.error("Error fetching executions:", error);
    return NextResponse.json({ error: String(error), executions: [], stats: { total: 0, success: 0, error: 0, running: 0 } }, { status: 500 });
  }
}
