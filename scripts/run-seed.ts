import { exec } from "child_process"

// Run the seed script
console.log("Starting the fungi species seeding process...")

exec("ts-node scripts/seed-fungi-species.ts", (error, stdout, stderr) => {
  if (error) {
    console.error(`Error executing seed script: ${error.message}`)
    return
  }

  if (stderr) {
    console.error(`Seed script stderr: ${stderr}`)
  }

  console.log(`Seed script output: ${stdout}`)
  console.log("Fungi species seeding process completed!")
})
