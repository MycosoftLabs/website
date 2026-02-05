/**
 * Earth-2 Layers Comprehensive Test Script
 * February 5, 2026
 * 
 * Tests all Earth-2 API endpoints and layer functionality
 * Run with: npx ts-node scripts/test-earth2-layers-feb05-2026.ts
 * Or: npm run test:earth2
 */

const BASE_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:3010";

interface TestResult {
  name: string;
  endpoint: string;
  status: "PASS" | "FAIL" | "WARN";
  responseTime: number;
  details: string;
  data?: any;
}

const results: TestResult[] = [];

async function testEndpoint(
  name: string,
  endpoint: string,
  validator: (data: any) => { valid: boolean; message: string }
): Promise<TestResult> {
  const start = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    const responseTime = Date.now() - start;
    
    if (!response.ok) {
      return {
        name,
        endpoint,
        status: "FAIL",
        responseTime,
        details: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
    
    const data = await response.json();
    const validation = validator(data);
    
    return {
      name,
      endpoint,
      status: validation.valid ? "PASS" : "FAIL",
      responseTime,
      details: validation.message,
      data: validation.valid ? undefined : data,
    };
  } catch (error) {
    return {
      name,
      endpoint,
      status: "FAIL",
      responseTime: Date.now() - start,
      details: `Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test Validators
// ═══════════════════════════════════════════════════════════════════════════════

function validateStatus(data: any) {
  if (!data) return { valid: false, message: "No data returned" };
  if (data.available === undefined && !data.status) {
    return { valid: false, message: "Missing status fields" };
  }
  return { valid: true, message: `Status: ${data.status || "available"}` };
}

function validateWeatherGrid(data: any) {
  if (!data) return { valid: false, message: "No data returned" };
  if (!data.grid || !Array.isArray(data.grid)) {
    return { valid: false, message: "Missing or invalid grid array" };
  }
  if (data.grid.length < 5) {
    return { valid: false, message: `Grid too small: ${data.grid.length} rows` };
  }
  if (!data.grid[0] || data.grid[0].length < 5) {
    return { valid: false, message: `Grid too narrow: ${data.grid[0]?.length} columns` };
  }
  if (data.min === undefined || data.max === undefined) {
    return { valid: false, message: "Missing min/max values" };
  }
  
  // Check for reasonable data range
  const range = data.max - data.min;
  if (range === 0) {
    return { valid: false, message: "No variation in data (flat grid)" };
  }
  
  return { 
    valid: true, 
    message: `Grid: ${data.grid.length}x${data.grid[0].length}, range: ${data.min.toFixed(1)} to ${data.max.toFixed(1)}` 
  };
}

function validateWindVectors(data: any) {
  if (!data) return { valid: false, message: "No data returned" };
  if (!data.u || !data.v || !data.speed || !data.direction) {
    return { valid: false, message: "Missing wind component arrays" };
  }
  if (!Array.isArray(data.u) || data.u.length < 5) {
    return { valid: false, message: "Invalid u component array" };
  }
  
  // Check for wind variation
  let minSpeed = Infinity, maxSpeed = -Infinity;
  for (const row of data.speed) {
    for (const s of row) {
      minSpeed = Math.min(minSpeed, s);
      maxSpeed = Math.max(maxSpeed, s);
    }
  }
  
  if (maxSpeed - minSpeed < 2) {
    return { valid: false, message: "Insufficient wind speed variation" };
  }
  
  return { 
    valid: true, 
    message: `Wind: ${data.u.length}x${data.u[0].length}, speeds: ${minSpeed.toFixed(1)}-${maxSpeed.toFixed(1)} m/s` 
  };
}

function validateStormCells(data: any) {
  if (!data) return { valid: false, message: "No data returned" };
  
  const cells = data.cells || data.stormCells || [];
  if (!Array.isArray(cells)) {
    return { valid: false, message: "Invalid cells array" };
  }
  
  if (cells.length === 0) {
    return { valid: true, message: "No storm cells (clear weather)" };
  }
  
  // Validate cell structure
  for (const cell of cells.slice(0, 3)) {
    if (cell.lat === undefined || cell.lon === undefined) {
      return { valid: false, message: "Cell missing lat/lon" };
    }
    if (cell.reflectivity === undefined) {
      return { valid: false, message: "Cell missing reflectivity" };
    }
  }
  
  const severe = cells.filter((c: any) => c.reflectivity >= 50).length;
  return { 
    valid: true, 
    message: `${cells.length} storm cells (${severe} severe)` 
  };
}

function validateSporeZones(data: any) {
  if (!data) return { valid: false, message: "No data returned" };
  
  const zones = data.zones || [];
  if (!Array.isArray(zones)) {
    return { valid: false, message: "Invalid zones array" };
  }
  
  if (zones.length === 0) {
    return { valid: false, message: "No spore zones returned" };
  }
  
  // Validate zone structure
  for (const zone of zones.slice(0, 3)) {
    if (!zone.lat || !zone.lon || !zone.species) {
      return { valid: false, message: "Zone missing required fields" };
    }
    if (!zone.riskLevel) {
      return { valid: false, message: "Zone missing risk level" };
    }
  }
  
  const highRisk = zones.filter((z: any) => z.riskLevel === "high" || z.riskLevel === "critical").length;
  return { 
    valid: true, 
    message: `${zones.length} spore zones (${highRisk} high/critical risk)` 
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Run Tests
// ═══════════════════════════════════════════════════════════════════════════════

async function runAllTests() {
  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log("  Earth-2 Layers Comprehensive Test - February 5, 2026");
  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log(`  Base URL: ${BASE_URL}`);
  console.log("");
  
  // Test Status/Health
  results.push(await testEndpoint(
    "Earth-2 Status",
    "/api/earth2",
    validateStatus
  ));
  
  // Test Weather Grid - Temperature
  results.push(await testEndpoint(
    "Temperature Grid (t2m)",
    "/api/earth2/layers/grid?variable=t2m&hours=0&north=50&south=25&east=-65&west=-125",
    validateWeatherGrid
  ));
  
  // Test Weather Grid - Precipitation
  results.push(await testEndpoint(
    "Precipitation Grid (tp)",
    "/api/earth2/layers/grid?variable=tp&hours=6&north=50&south=25&east=-65&west=-125",
    validateWeatherGrid
  ));
  
  // Test Weather Grid - Water Vapor (Clouds)
  results.push(await testEndpoint(
    "Water Vapor Grid (tcwv)",
    "/api/earth2/layers/grid?variable=tcwv&hours=12&north=50&south=25&east=-65&west=-125",
    validateWeatherGrid
  ));
  
  // Test Weather Grid - Pressure
  results.push(await testEndpoint(
    "Pressure Grid (sp)",
    "/api/earth2/layers/grid?variable=sp&hours=0&north=50&south=25&east=-65&west=-125",
    validateWeatherGrid
  ));
  
  // Test Wind Vectors
  results.push(await testEndpoint(
    "Wind Vectors",
    "/api/earth2/layers/wind?hours=0&north=50&south=25&east=-65&west=-125",
    validateWindVectors
  ));
  
  // Test Storm Cells
  results.push(await testEndpoint(
    "Storm Cells",
    "/api/earth2/nowcast/storms?north=50&south=25&east=-65&west=-125",
    validateStormCells
  ));
  
  // Test Spore Dispersal Zones
  results.push(await testEndpoint(
    "Spore Dispersal Zones",
    "/api/earth2/spore-dispersal?hours=24",
    validateSporeZones
  ));
  
  // Test with different forecast hours (temporal variation)
  results.push(await testEndpoint(
    "Temperature +24h",
    "/api/earth2/layers/grid?variable=t2m&hours=24&north=50&south=25&east=-65&west=-125",
    validateWeatherGrid
  ));
  
  results.push(await testEndpoint(
    "Temperature +48h",
    "/api/earth2/layers/grid?variable=t2m&hours=48&north=50&south=25&east=-65&west=-125",
    validateWeatherGrid
  ));
  
  // Print Results
  console.log("───────────────────────────────────────────────────────────────────────────────");
  console.log("  TEST RESULTS");
  console.log("───────────────────────────────────────────────────────────────────────────────");
  
  let passed = 0, failed = 0, warnings = 0;
  
  for (const result of results) {
    const icon = result.status === "PASS" ? "✓" : result.status === "FAIL" ? "✗" : "⚠";
    const color = result.status === "PASS" ? "\x1b[32m" : result.status === "FAIL" ? "\x1b[31m" : "\x1b[33m";
    
    console.log(`  ${color}${icon}\x1b[0m ${result.name}`);
    console.log(`    Endpoint: ${result.endpoint}`);
    console.log(`    Response: ${result.responseTime}ms`);
    console.log(`    ${result.details}`);
    console.log("");
    
    if (result.status === "PASS") passed++;
    else if (result.status === "FAIL") failed++;
    else warnings++;
  }
  
  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log(`  SUMMARY: ${passed} passed, ${failed} failed, ${warnings} warnings`);
  console.log("═══════════════════════════════════════════════════════════════════════════════");
  
  // Check for temporal variation
  const temp0h = results.find(r => r.name === "Temperature Grid (t2m)");
  const temp24h = results.find(r => r.name === "Temperature +24h");
  const temp48h = results.find(r => r.name === "Temperature +48h");
  
  if (temp0h?.status === "PASS" && temp24h?.status === "PASS" && temp48h?.status === "PASS") {
    console.log("");
    console.log("  TEMPORAL VARIATION CHECK:");
    console.log(`    0h:  ${temp0h.details}`);
    console.log(`    24h: ${temp24h.details}`);
    console.log(`    48h: ${temp48h.details}`);
  }
  
  return { passed, failed, warnings };
}

// Run if executed directly
runAllTests()
  .then(({ passed, failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error("Test runner error:", error);
    process.exit(1);
  });
