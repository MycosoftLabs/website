import { NextResponse } from "next/server"
import { execFile } from "child_process"
import { requireAdmin } from "@/lib/auth/api-auth"

export async function POST() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    // Execute the seed script using execFile (no shell interpolation)
    execFile("npx", ["ts-node", "scripts/seed-fungi-species.ts"], (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing seed script: ${error.message}`)
      }

      if (stderr) {
        console.error(`Seed script stderr: ${stderr}`)
      }

      console.log(`Seed script output: ${stdout}`)
    })

    return NextResponse.json(
      {
        message: "Seeding process started. This may take several minutes to complete.",
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("Error starting seed process:", error)
    return NextResponse.json(
      { error: "Failed to start seeding process" },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }
}
