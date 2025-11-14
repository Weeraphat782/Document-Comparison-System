// src/lib/api-client.ts
const EXPORT_TRACKER_BASE_URL =
  process.env.NEXT_PUBLIC_EXPORT_TRACKER_API_URL || "https://exportation-tracker.vercel.app"

export class DocumentComparisonAPI {
  async getDocuments(accessCode: string) {
    const response = await fetch(
      `${EXPORT_TRACKER_BASE_URL}/api/document-comparison/documents?access_code=${accessCode}`,
    )
    return response.json()
  }

  async analyzeDocuments(documentIds: string[], ruleId: string, accessCode?: string) {
    const response = await fetch(`${EXPORT_TRACKER_BASE_URL}/api/document-comparison/standalone-analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds, ruleId, accessCode }),
    })
    return response.json()
  }

  async getRules(userId: string) {
    // อาจต้องมี authentication mechanism
    const response = await fetch(`${EXPORT_TRACKER_BASE_URL}/api/document-comparison/rules?user_id=${userId}`)
    return response.json()
  }
}
