import { NextResponse } from "next/server"
import { exec } from "child_process"

export async function POST() {
  try {
    // Execute the seed script
    exec("ts-node scripts/seed-fungi-species.ts", (error, stdout, stderr) => {
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
