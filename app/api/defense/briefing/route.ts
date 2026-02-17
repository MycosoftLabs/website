import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

interface DefenseBriefingRequest {
  name: string
  title?: string
  organization: string
  email: string
  phone?: string
  message: string
  classificationLevel?: string
  id?: string
}

async function sendDefenseBriefingNotification(request: DefenseBriefingRequest): Promise<void> {
  try {
    // Send notification via MAS communication service
    const masUrl = process.env.MAS_API_URL || 'http://192.168.0.188:8001'
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@mycosoft.com'
    
    const response = await fetch(`${masUrl}/api/communications/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'defense_briefing_request',
        priority: 'high',
        recipient: adminEmail,
        subject: `New Defense Briefing Request from ${request.organization}`,
        body: `
Defense Briefing Request Received

Contact: ${request.name}${request.title ? ` (${request.title})` : ''}
Organization: ${request.organization}
Email: ${request.email}
Phone: ${request.phone || 'N/A'}
Classification Level: ${request.classificationLevel || 'N/A'}

Message:
${request.message}

Request ID: ${request.id || 'pending'}
Submitted: ${new Date().toISOString()}
        `.trim()
      })
    })
    
    if (!response.ok) {
      console.error('Failed to send notification via MAS:', await response.text())
    }
  } catch (error) {
    console.error('Error sending defense briefing notification:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, title, organization, email, phone, classificationLevel, areasOfInterest, message } = body

    // Validate required fields
    if (!name || !organization || !email || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Insert into Supabase
    const { data, error } = await supabase
      .from("defense_briefing_requests")
      .insert({
        name,
        title: title || null,
        organization,
        email,
        phone: phone || null,
        classification_level: classificationLevel || null,
        areas_of_interest: areasOfInterest || [],
        message,
        status: "pending"
      })
      .select()
      .single()

    if (error) {
      console.error("Supabase error:", error)
      // If table doesn't exist yet, log to console and still return success for demo
      if (error.code === "42P01") {
        console.log("Table does not exist yet. Logging request:", { name, organization, email })
        // Send email notification to admin
        await sendDefenseBriefingNotification({ name, organization, email, title, message, classificationLevel })
        return NextResponse.json({ 
          success: true, 
          message: "Request logged (table pending creation)",
          id: crypto.randomUUID()
        })
      }
      return NextResponse.json(
        { error: "Failed to submit request" },
        { status: 500 }
      )
    }

    // Send email notification to admin
    await sendDefenseBriefingNotification({
      name,
      title: title || undefined,
      organization,
      email,
      phone: phone || undefined,
      message,
      classificationLevel: classificationLevel || undefined,
      id: data?.id
    })

    console.log("New briefing request submitted:", {
      id: data?.id,
      name,
      organization,
      email,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({ 
      success: true, 
      message: "Request submitted successfully",
      id: data?.id 
    })

  } catch (error) {
    console.error("Error processing briefing request:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: "Defense briefing request API",
    method: "POST",
    fields: ["name", "title", "organization", "email", "phone", "classificationLevel", "areasOfInterest", "message"]
  })
}
