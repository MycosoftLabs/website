/**
 * Contact Form API Route
 * Handles contact form submissions and stores them in Supabase
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

// Server-side Supabase client with service role key (for admin operations)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[Contact API] Missing Supabase credentials")
}

interface ContactFormData {
  firstName: string
  lastName: string
  email: string
  company?: string
  subject: string
  message: string
}

async function sendContactNotification(contactData: ContactFormData): Promise<void> {
  try {
    // Send notification via MAS communication service
    const masUrl = process.env.MAS_API_URL || 'http://192.168.0.188:8001'
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@mycosoft.com'
    
    const response = await fetch(`${masUrl}/api/communications/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'contact_form_submission',
        priority: 'medium',
        recipient: adminEmail,
        subject: `New Contact Form: ${contactData.subject}`,
        body: `
Contact Form Submission Received

Name: ${contactData.firstName} ${contactData.lastName}
Email: ${contactData.email}
Company: ${contactData.company || 'N/A'}
Subject: ${contactData.subject}

Message:
${contactData.message}

Submitted: ${new Date().toISOString()}
        `.trim()
      })
    })
    
    if (!response.ok) {
      console.error('[Contact API] Failed to send notification via MAS:', await response.text())
    }
  } catch (error) {
    console.error('[Contact API] Error sending notification:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ContactFormData = await request.json()

    // Validate required fields
    const { firstName, lastName, email, subject, message } = body

    if (!firstName || !lastName || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      )
    }

    // Validate message length
    if (message.length < 10) {
      return NextResponse.json(
        { error: "Message must be at least 10 characters" },
        { status: 400 }
      )
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: "Message must be less than 5000 characters" },
        { status: 400 }
      )
    }

    // Create Supabase client
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Insert contact submission into Supabase
    const { data, error } = await supabase
      .from("contact_submissions")
      .insert([
        {
          first_name: firstName,
          last_name: lastName,
          email: email,
          company: body.company || null,
          subject: subject,
          message: message,
          submitted_at: new Date().toISOString(),
          status: "new",
        },
      ])
      .select()

    if (error) {
      console.error("[Contact API] Supabase error:", error)
      
      // Check if table doesn't exist
      if (error.message.includes("relation") && error.message.includes("does not exist")) {
        return NextResponse.json(
          { error: "Database table not configured. Please contact support." },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { error: "Failed to submit contact form. Please try again." },
        { status: 500 }
      )
    }

    // Send email notification to team
    await sendContactNotification(body)

    return NextResponse.json(
      {
        success: true,
        message: "Thank you for contacting us! We'll get back to you within 24-48 hours.",
        data: data?.[0],
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[Contact API] Error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    )
  }
}
