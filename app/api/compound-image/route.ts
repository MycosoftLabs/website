import { NextResponse } from "next/server"
import sharp from "sharp"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const smiles = searchParams.get("smiles")

    if (!smiles) {
      return new Response("SMILES parameter is required", { status: 400 })
    }

    // Use PubChem's Chemical Structure Sketcher service
    const imageUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/PNG`

    const response = await fetch(imageUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch structure image: ${response.statusText}`)
    }

    const buffer = await response.arrayBuffer()

    // Process the image with sharp to ensure consistent sizing and format
    const processedImage = await sharp(Buffer.from(buffer))
      .resize(400, 400, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .png()
      .toBuffer()

    return new Response(processedImage, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    console.error("Error generating compound image:", error)
    return NextResponse.json({ error: "Failed to generate compound image" }, { status: 500 })
  }
}
