export async function GET() {
  const masUrl = process.env.MAS_API_URL
  if (!masUrl) {
    return Response.json(
      { status: "unavailable", error: "MAS_API_URL is not configured" },
      { status: 503 }
    )
  }

  try {
    const res = await fetch(`${masUrl}/api/consciousness/world`, {
      next: { revalidate: 30 },
    })
    if (!res.ok) throw new Error(`MAS returned ${res.status}`)
    return Response.json(await res.json())
  } catch (error) {
    return Response.json(
      { status: "unavailable", error: String(error) },
      { status: 503 }
    )
  }
}
