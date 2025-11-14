import { ExportTrackerDocument } from './types';

const EXPORT_TRACKER_API_URL = process.env.NEXT_PUBLIC_EXPORT_TRACKER_API_URL || 'https://exportation-tracker.vercel.app';

export class ExportTrackerClient {
  private baseUrl: string;

  constructor(baseUrl: string = EXPORT_TRACKER_API_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get documents for a quotation from Export Tracker
   */
  async getDocuments(quotationId: string): Promise<ExportTrackerDocument[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/document-comparison/list-documents?quotation_id=${quotationId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.documents || !Array.isArray(data.documents)) {
        throw new Error('Invalid response format from Export Tracker');
      }

      return data.documents;
    } catch (error) {
      console.error('Error fetching documents from Export Tracker:', error);
      throw error;
    }
  }

  /**
   * Analyze documents using Export Tracker's AI analysis
   */
  async analyzeDocuments(quotationId: string, documentIds: string[], ruleId: string, userId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/document-comparison/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quotation_id: quotationId,
          document_ids: documentIds,
          rule_id: ruleId,
          user_id: userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error analyzing documents via Export Tracker:', error);
      throw error;
    }
  }

  /**
   * Get quotation details from Export Tracker
   */
  async getQuotationDetails(quotationId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/quotation-details/${quotationId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Quotation ${quotationId} not found`);
        }
        throw new Error(`Failed to fetch quotation details: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching quotation details from Export Tracker:', error);
      throw error;
    }
  }

  /**
   * Get rules from Export Tracker (for migration/fallback)
   */
  async getRules(userId?: string): Promise<any[]> {
    try {
      const url = userId
        ? `${this.baseUrl}/api/document-comparison/rules?user_id=${userId}`
        : `${this.baseUrl}/api/document-comparison/rules`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch rules: ${response.statusText}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching rules from Export Tracker:', error);
      throw error;
    }
  }

  /**
   * Analyze uploaded documents using Export Tracker's AI analysis
   * Use the main analyze endpoint with document_urls parameter
   */
  async analyzeUploadedDocuments(documentUrls: string[], ruleId: string, userId: string, groupId: string): Promise<any> {
    try {
      // Send to main analyze endpoint with document_urls instead of document_ids
      const response = await fetch(`${this.baseUrl}/api/document-comparison/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quotation_id: `UPLOADED_GROUP_${groupId}`,
          document_urls: documentUrls,  // Send signed URLs as document_urls
          rule_id: ruleId,
          user_id: userId,
          analysis_mode: 'uploaded',  // Flag to indicate this is uploaded mode
        }),
      });

      if (!response.ok) {
        let errorMessage = `Analysis failed (${response.status}): ${response.statusText}`;
        try {
          const errorText = await response.text();
          if (errorText) {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          }
        } catch (parseError) {
          console.warn('Could not parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error analyzing uploaded documents via Export Tracker:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const exportTrackerClient = new ExportTrackerClient();