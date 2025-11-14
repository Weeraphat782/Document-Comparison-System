# Document Analysis Service

AI-powered cross-document verification system that analyzes any type of documents for discrepancies and compliance issues.

## Architecture Overview

This is a standalone document analysis service that shares authentication and database with the Export Tracker system. It provides AI-powered cross-document verification capabilities for any type of documents, not just export-related ones.

### Key Features
- **Shared Authentication**: Uses the same Supabase Auth as Export Tracker
- **Rule Management**: Create and manage custom comparison rules per user
- **Document Analysis**: AI-powered cross-document verification using Export Tracker's Gemini AI
- **Session Tracking**: Analysis history and results storage
- **Multi-tenant**: Each user has their own rules and data (using auth.users directly)
- **General Purpose**: Supports analysis of any document types, not limited to export documents

### Key Components

#### 1. Main Page (`app/page.tsx`)
- Entry point for the application
- Accepts quotation ID input
- Manages the analysis workflow
- Displays results using ComparisonResults component

#### 2. Document Selector (`components/document-selector.tsx`)
- Step 1: Select comparison rule
- Step 2: Select documents to analyze (minimum 2 required)
- Fetches documents from the backend API
- Validates selection before analysis

#### 3. Comparison Results (`components/comparison-results.tsx`)
- Displays critical checks status (PASS/FAIL/WARNING)
- Shows verification summary with issue counts
- Lists critical issues requiring immediate action
- Shows warnings and recommendations
- Provides detailed document reviews (collapsible)

#### 4. API Routes (Proxy Layer)
All API routes proxy requests to the Export Tracker backend:

- `GET /api/document-comparison/list-documents?quotation_id={id}`
  - Fetches all documents for a quotation
  
- `GET /api/document-comparison/rules?user_id={id}`
  - Fetches available comparison rules
  - Auto-selects default rule
  
- `POST /api/document-comparison/analyze`
  - Runs AI analysis on selected documents
  - Returns results with critical checks and feedback

#### 5. API Client (`lib/api-client.ts`)
- Provides typed methods for backend communication
- Configurable base URL via environment variable
- Methods: `getDocuments()`, `analyzeDocuments()`, `getRules()`

## User Flow

1. **Enter Quotation ID**
   - User provides quotation ID (e.g., "QT-2024-001")
   - System loads available documents

2. **Select Comparison Rule**
   - Choose how documents should be verified
   - Default rule is auto-selected

3. **Select Documents**
   - Choose at least 2 documents for cross-comparison
   - View document metadata (type, upload date, description)

4. **Run Analysis**
   - AI analyzes documents for:
     - Critical compliance checks
     - Cross-document discrepancies
     - Missing information
     - Data consistency

5. **Review Results**
   - Critical Checks Status (PASS/FAIL/WARNING)
   - Issue Summary (Critical/Warnings/Total Documents)
   - Detailed feedback per document
   - Actionable recommendations

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Export Tracker API Configuration (Required)
NEXT_PUBLIC_EXPORT_TRACKER_API_URL=https://exportation-tracker.vercel.app
```

### 2. Database Setup

1. **Use the SAME Supabase project as Export Tracker**
   - DO NOT create a new project
   - Use the existing Supabase project
2. Run the SQL migration in `migrations/create_document_comparison_tables.sql` in your Supabase SQL Editor
3. The migration will add only the `analysis_sessions` table with foreign key to `auth.users(id)` directly

### 3. Install Dependencies

```bash
npm install
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

## API Integration

### Backend Endpoints Used

All endpoints are on the Export Tracker backend:

\`\`\`
GET  /api/document-comparison/list-documents?quotation_id={id}
GET  /api/document-comparison/rules?user_id={id}
POST /api/document-comparison/analyze
\`\`\`

### Request/Response Examples

**List Documents:**
\`\`\`typescript
// Request
GET /api/document-comparison/list-documents?quotation_id=QT-2024-001

// Response
{
  "documents": [
    {
      "id": "doc_123",
      "quotation_id": "QT-2024-001",
      "document_type": "invoice",
      "file_name": "invoice.pdf",
      "file_url": "https://...",
      "submitted_at": "2024-01-15T10:30:00Z",
      "description": "Commercial invoice"
    }
  ]
}
\`\`\`

**Analyze Documents:**
\`\`\`typescript
// Request
POST /api/document-comparison/analyze
{
  "quotation_id": "QT-2024-001",
  "document_ids": ["doc_123", "doc_456"],
  "rule_id": "rule_789"
}

// Response
{
  "results": [
    {
      "document_id": "doc_123",
      "document_name": "invoice.pdf",
      "document_type": "invoice",
      "ai_feedback": "### Critical Issues...",
      "sequence_order": 1
    }
  ],
  "critical_checks_results": [
    {
      "check_name": "Weight Consistency",
      "status": "PASS",
      "details": "All weights match across documents",
      "issue": "None"
    }
  ]
}
\`\`\`

## Features

### Critical Checks
- Automated verification of compliance requirements
- Visual status indicators (PASS/FAIL/WARNING)
- Detailed explanations for each check

### Issue Detection
- **Critical Issues**: Must be fixed before proceeding
- **Warnings**: Recommendations for improvement
- Extracted from AI feedback using flexible pattern matching

### Document Reviews
- Collapsible detailed feedback per document
- Issue count badges
- Organized by severity

### User Experience
- Clean, modern UI with gradient accents
- Responsive design (mobile-friendly)
- Loading states and error handling
- Debug logging with `[v0]` prefix

## Development

### Running Locally

\`\`\`bash
npm install
npm run dev
\`\`\`

Visit `http://localhost:3000`

### Debug Logs

All API routes include debug logging:
\`\`\`typescript
console.log("[v0] Fetching documents for quotation:", quotationId)
\`\`\`

Check browser console and server logs for troubleshooting.

### Adding New Features

1. **New API Endpoint**: Add route in `app/api/document-comparison/`
2. **New Component**: Add to `components/` directory
3. **New Types**: Update `lib/types.ts`

## Deployment

Deploy to Vercel:

\`\`\`bash
vercel deploy
\`\`\`

Set environment variable in Vercel dashboard:
- `NEXT_PUBLIC_EXPORT_TRACKER_API_URL`

## Troubleshooting

### Documents Not Loading
- Check quotation ID is correct
- Verify backend API is accessible
- Check browser console for errors
- Look for `[v0]` debug logs

### Analysis Fails
- Ensure at least 2 documents are selected
- Verify comparison rule is selected
- Check network tab for API errors

### No Results Displayed
- Verify API response format matches expected types
- Check `critical_checks_results` array structure
- Review AI feedback format in response

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Backend**: Export Tracker API (external)

## File Structure

\`\`\`
document-comparison-service/
├── app/
│   ├── page.tsx                              # Main UI
│   ├── layout.tsx                            # Root layout
│   └── api/
│       └── document-comparison/
│           ├── list-documents/route.ts       # Proxy: List documents
│           ├── rules/route.ts                # Proxy: Get rules
│           └── analyze/route.ts              # Proxy: Run analysis
├── components/
│   ├── document-selector.tsx                 # Document selection UI
│   └── comparison-results.tsx                # Results display
├── lib/
│   ├── api-client.ts                         # API client
│   ├── types.ts                              # TypeScript types
│   └── utils.ts                              # Utilities
└── README.md                                 # This file
\`\`\`

## Support

For issues or questions, check:
1. Browser console logs
2. Server logs (look for `[v0]` prefix)
3. Network tab in DevTools
4. Backend API status

---

**Built with ❤️ using Next.js and AI**
