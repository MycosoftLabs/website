import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// GET - Retrieve user's app state
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("user_app_state")
      .select("tool_states, updated_at")
      .eq("user_id", user.id)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching app state:", error)
      return NextResponse.json({ error: "Failed to fetch app state" }, { status: 500 })
    }

    return NextResponse.json({
      tool_states: data?.tool_states ?? {},
      updated_at: data?.updated_at ?? null,
    })
  } catch (err) {
    console.error("App state GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Save user's app state
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { tool_states } = body

    if (!tool_states || typeof tool_states !== "object") {
      return NextResponse.json({ error: "Invalid tool_states" }, { status: 400 })
    }

    const { error } = await supabase
      .from("user_app_state")
      .upsert({
        user_id: user.id,
        tool_states,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
      })

    if (error) {
      console.error("Error saving app state:", error)
      return NextResponse.json({ error: "Failed to save app state" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      updated_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error("App state POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Clear user's app state (or specific tool)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const toolId = searchParams.get("tool_id")

    if (toolId) {
      // Clear specific tool's state
      const { data: existing } = await supabase
        .from("user_app_state")
        .select("tool_states")
        .eq("user_id", user.id)
        .single()

      if (existing?.tool_states) {
        const newState = { ...existing.tool_states as Record<string, unknown> }
        delete newState[toolId]

        await supabase
          .from("user_app_state")
          .update({ 
            tool_states: newState,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
      }
    } else {
      // Clear all state
      await supabase
        .from("user_app_state")
        .update({ 
          tool_states: {},
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("App state DELETE error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
