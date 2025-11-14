import { type NextRequest, NextResponse } from "next/server"

const EXPORT_TRACKER_BASE_URL =
  process.env.NEXT_PUBLIC_EXPORT_TRACKER_API_URL || "https://exportation-tracker.vercel.app"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const quotationId = searchParams.get("quotation_id")

    if (!quotationId) {
      return NextResponse.json({ error: "quotation_id is required" }, { status: 400 })
    }

    console.log("[v0] Fetching documents for quotation:", quotationId)

    // Proxy request to export tracker backend
    const response = await fetch(
      `${EXPORT_TRACKER_BASE_URL}/api/document-comparison/list-documents?quotation_id=${quotationId}`,
    )

    console.log("[v0] Export tracker response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Export tracker error:", errorText)
      return NextResponse.json({ error: "Failed to fetch documents from export tracker" }, { status: response.status })
    }

    const data = await response.json()
    console.log("[v0] Documents fetched successfully:", data.documents?.length || 0)

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error in list-documents route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
