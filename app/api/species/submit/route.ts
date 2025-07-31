import { NextResponse } from "next/server"
import { findOne, insertOne } from "@/lib/temp-db"
import { validateSpeciesId } from "@/lib/services/species-validation"

interface SpeciesSubmission {
  scientificName: string
  commonNames: string[]
  description?: string
  iNaturalistId?: string
  characteristics?: {
    habitat?: string[]
    season?: string[]
    edibility?: string
  }
  references?: string[]
  submittedBy?: string
}

export async function POST(request: Request) {
  try {
    const submission = (await request.json()) as SpeciesSubmission

    // Basic validation
    if (!submission.scientificName || !submission.commonNames?.length) {
      return NextResponse.json({ error: "Scientific name and at least one common name are required" }, { status: 400 })
    }

    // Check if species already exists
    const existing = await findOne("species_submissions", {
      scientificName: submission.scientificName,
    })

    if (existing) {
      return NextResponse.json({ error: "This species has already been submitted" }, { status: 409 })
    }

    // If iNaturalist ID is provided, validate it
    if (submission.iNaturalistId) {
      const validation = validateSpeciesId(submission.iNaturalistId)
      if (!validation.isValid) {
        return NextResponse.json({ error: "Invalid iNaturalist ID" }, { status: 400 })
      }
    }

    // Store submission for moderation
    const submissionData = {
      ...submission,
      status: "pending",
      submittedAt: new Date(),
      lastUpdated: new Date(),
    }

    await insertOne("species_submissions", submissionData)

    return NextResponse.json({
      message: "Species submitted successfully for review",
      submission: submissionData,
    })
  } catch (error) {
    console.error("Error submitting species:", error)
    return NextResponse.json({ error: "Failed to submit species" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "pending"

    // Get submissions with optional status filter
    const submissions = await findOne("species_submissions", { status })

    return NextResponse.json({ submissions })
  } catch (error) {
    console.error("Error fetching submissions:", error)
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 })
  }
}
