import { NextRequest, NextResponse } from "next/server"

/**
 * pyCirclize Visualization API
 * Generates circular genomics visualizations via Python backend
 * 
 * GET /api/mindex/visualization/circos?type=genome&species=Psilocybe%20cubensis&format=svg
 * POST /api/mindex/visualization/circos
 */

// Fallback SVG generator when Python service is unavailable
function generateFallbackSVG(
  title: string = "Circos Plot",
  plotType: string = "genome"
): string {
  const colors = {
    genome: { primary: "#22c55e", secondary: "#8b5cf6", tertiary: "#06b6d4" },
    pathway: { primary: "#f59e0b", secondary: "#ec4899", tertiary: "#8b5cf6" },
    phylogeny: { primary: "#8b5cf6", secondary: "#22c55e", tertiary: "#f59e0b" },
  }
  
  const { primary, secondary, tertiary } = colors[plotType as keyof typeof colors] || colors.genome
  
  // Generate a demo circos-style SVG
  const sectors = 5
  const sectorAngle = 360 / sectors
  const sectorNames = plotType === "genome" 
    ? ["chr1", "chr2", "chr3", "chr4", "chr5"]
    : plotType === "pathway"
    ? ["psiD", "psiK", "psiM", "psiH", "psiR"]
    : ["P.cub", "P.sem", "H.eri", "G.luc", "C.mil"]
  
  let sectorPaths = ""
  let sectorLabels = ""
  
  for (let i = 0; i < sectors; i++) {
    const startAngle = (i * sectorAngle - 90) * (Math.PI / 180)
    const endAngle = ((i + 1) * sectorAngle - 5 - 90) * (Math.PI / 180)
    const midAngle = ((i + 0.5) * sectorAngle - 90) * (Math.PI / 180)
    
    const innerR = 100
    const outerR = 140
    
    const x1 = 200 + Math.cos(startAngle) * outerR
    const y1 = 200 + Math.sin(startAngle) * outerR
    const x2 = 200 + Math.cos(endAngle) * outerR
    const y2 = 200 + Math.sin(endAngle) * outerR
    const x3 = 200 + Math.cos(endAngle) * innerR
    const y3 = 200 + Math.sin(endAngle) * innerR
    const x4 = 200 + Math.cos(startAngle) * innerR
    const y4 = 200 + Math.sin(startAngle) * innerR
    
    const labelR = 155
    const labelX = 200 + Math.cos(midAngle) * labelR
    const labelY = 200 + Math.sin(midAngle) * labelR
    
    const hue = (i * 60 + 120) % 360
    const color = `hsl(${hue}, 70%, 50%)`
    
    sectorPaths += `
      <path d="M ${x1} ${y1} A ${outerR} ${outerR} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 0 0 ${x4} ${y4} Z" 
            fill="${color}" opacity="0.8"/>
    `
    
    sectorLabels += `
      <text x="${labelX}" y="${labelY}" text-anchor="middle" 
            fill="white" font-size="10" font-weight="500"
            transform="rotate(${(i + 0.5) * sectorAngle}, ${labelX}, ${labelY})">${sectorNames[i]}</text>
    `
  }
  
  // Add inner tracks
  let innerTracks = ""
  for (let track = 0; track < 3; track++) {
    const r = 80 - track * 20
    innerTracks += `<circle cx="200" cy="200" r="${r}" fill="none" stroke="${[primary, secondary, tertiary][track]}" stroke-width="8" opacity="0.4"/>`
  }
  
  // Add some demo data points
  let dataPoints = ""
  for (let i = 0; i < 20; i++) {
    const angle = (Math.random() * 360 - 90) * (Math.PI / 180)
    const r = 60 + Math.random() * 30
    const x = 200 + Math.cos(angle) * r
    const y = 200 + Math.sin(angle) * r
    dataPoints += `<circle cx="${x}" cy="${y}" r="3" fill="${primary}" opacity="0.8"/>`
  }
  
  // Add connecting links
  let links = ""
  for (let i = 0; i < 3; i++) {
    const angle1 = ((i * 72 + 20) - 90) * (Math.PI / 180)
    const angle2 = ((i * 72 + 140) - 90) * (Math.PI / 180)
    const r = 95
    const x1 = 200 + Math.cos(angle1) * r
    const y1 = 200 + Math.sin(angle1) * r
    const x2 = 200 + Math.cos(angle2) * r
    const y2 = 200 + Math.sin(angle2) * r
    links += `<path d="M ${x1} ${y1} Q 200 200 ${x2} ${y2}" fill="none" stroke="${secondary}" stroke-width="2" opacity="0.3"/>`
  }
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
    <defs>
      <radialGradient id="bgGrad">
        <stop offset="0%" stop-color="#1a1a2e"/>
        <stop offset="100%" stop-color="#0a0a0f"/>
      </radialGradient>
    </defs>
    <rect width="400" height="400" fill="url(#bgGrad)"/>
    
    <!-- Sector arcs -->
    ${sectorPaths}
    
    <!-- Inner tracks -->
    ${innerTracks}
    
    <!-- Data points -->
    ${dataPoints}
    
    <!-- Links -->
    ${links}
    
    <!-- Labels -->
    ${sectorLabels}
    
    <!-- Center label -->
    <text x="200" y="195" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${title}</text>
    <text x="200" y="210" text-anchor="middle" fill="#888" font-size="8">MINDEX Circos</text>
    
    <!-- Legend -->
    <rect x="10" y="360" width="8" height="8" fill="${primary}" rx="2"/>
    <text x="22" y="368" fill="#888" font-size="8">Genes</text>
    <rect x="60" y="360" width="8" height="8" fill="${secondary}" rx="2"/>
    <text x="72" y="368" fill="#888" font-size="8">Variants</text>
    <rect x="120" y="360" width="8" height="8" fill="${tertiary}" rx="2"/>
    <text x="132" y="368" fill="#888" font-size="8">Expression</text>
  </svg>`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const plotType = searchParams.get("type") || "genome"
  const species = searchParams.get("species") || "Psilocybe cubensis"
  const format = searchParams.get("format") || "svg"
  const pathway = searchParams.get("pathway") || "Psilocybin Biosynthesis"
  
  try {
    // Try to call Python service if available
    const pythonServiceUrl = process.env.PYTHON_VIZ_SERVICE_URL
    
    if (pythonServiceUrl) {
      const response = await fetch(`${pythonServiceUrl}/circos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plot_type: plotType,
          species,
          output_format: format,
          pathway
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        return NextResponse.json(data)
      }
    }
    
    // Fallback to JS-generated SVG
    const svg = generateFallbackSVG(species, plotType)
    const base64 = Buffer.from(svg).toString("base64")
    
    return NextResponse.json({
      success: true,
      plot_type: plotType,
      species,
      format: "svg",
      image: `data:image/svg+xml;base64,${base64}`,
      fallback: true,
      message: "Generated with JS fallback. Install pycirclize for full features."
    })
    
  } catch (error) {
    console.error("Circos generation error:", error)
    
    const svg = generateFallbackSVG(species, plotType)
    const base64 = Buffer.from(svg).toString("base64")
    
    return NextResponse.json({
      success: true,
      plot_type: plotType,
      species,
      format: "svg",
      image: `data:image/svg+xml;base64,${base64}`,
      fallback: true,
      error: String(error)
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      plot_type = "genome",
      species = "Psilocybe cubensis",
      output_format = "svg",
      pathway = "Psilocybin Biosynthesis",
      chromosomes,
      genes,
      variants,
      species_list
    } = body
    
    // Try Python service
    const pythonServiceUrl = process.env.PYTHON_VIZ_SERVICE_URL
    
    if (pythonServiceUrl) {
      const response = await fetch(`${pythonServiceUrl}/circos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plot_type,
          species,
          output_format,
          pathway,
          chromosomes,
          genes,
          variants,
          species_list
        })
      })
      
      if (response.ok) {
        return NextResponse.json(await response.json())
      }
    }
    
    // Fallback
    const svg = generateFallbackSVG(species, plot_type)
    const base64 = Buffer.from(svg).toString("base64")
    
    return NextResponse.json({
      success: true,
      plot_type,
      species,
      format: "svg",
      image: `data:image/svg+xml;base64,${base64}`,
      fallback: true
    })
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
