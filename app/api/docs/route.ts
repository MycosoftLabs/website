import { NextResponse } from "next/server"
import { generateOpenApiSpec, generateHtmlDocumentation } from "@/lib/api/documentation"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get("format") || "json"

    if (format === "html") {
      const html = generateHtmlDocumentation()
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html",
        },
      })
    } else {
      const spec = generateOpenApiSpec()
      return NextResponse.json(spec)
    }
  } catch (error) {
    console.error("API documentation error:", error)
    return NextResponse.json({ error: "Failed to generate API documentation" }, { status: 500 })
  }
}
