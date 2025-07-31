const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

// Read the SQL file
const sqlFilePath = path.join(__dirname, "create-telemetry-table.sql")
const sqlContent = fs.readFileSync(sqlFilePath, "utf8")

// Get database URL from environment
const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL

if (!databaseUrl) {
  console.error("Error: No database URL provided. Set NEON_DATABASE_URL or DATABASE_URL environment variable.")
  process.exit(1)
}

try {
  // Execute the SQL using psql
  console.log("Creating telemetry table...")

  // Write SQL to a temporary file to avoid command line length issues
  const tempSqlPath = path.join(__dirname, "temp-telemetry.sql")
  fs.writeFileSync(tempSqlPath, sqlContent)

  // Execute the SQL
  execSync(`psql "${databaseUrl}" -f "${tempSqlPath}"`, { stdio: "inherit" })

  // Clean up
  fs.unlinkSync(tempSqlPath)

  console.log("Telemetry table created successfully!")
} catch (error) {
  console.error("Error creating telemetry table:", error)
  process.exit(1)
}
