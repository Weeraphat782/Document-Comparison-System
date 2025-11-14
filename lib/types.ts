// Types for Document Comparison Service (aligned with Tr system)

export interface Profile {
  id: string;
  email: string;
  name?: string;
  company_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ComparisonRule {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  extraction_fields: string[]; // JSONB in DB, array here
  comparison_instructions: string;
  critical_checks: string[]; // JSONB in DB, array here
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnalysisSession {
  id: string;
  user_id: string;
  rule_id: string;
  quotation_id?: string; // From Tr system
  quotation_summary?: string; // Summary for display: "Company - Destination"
  document_ids: string[]; // JSONB in DB, array here
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results?: AnalysisResponse;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

// Document types from Tr system
export interface DocumentSubmission {
  id: string;
  quotation_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  description?: string;
  submitted_at: string;
}

export interface DocumentAnalysisResult {
  document_id: string;
  document_name: string;
  document_type: string;
  ai_feedback: string;
  sequence_order: number;
}

export interface CriticalCheckResult {
  check_name: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: string;
  issue: string;
}

export interface AnalysisResponse {
  success: boolean;
  full_feedback: string;
  results: DocumentAnalysisResult[];
  extracted_data: Record<string, any>;
  critical_checks_results: CriticalCheckResult[];
  critical_checks_list: string[];
}

// Form types
export interface RuleFormData {
  name: string;
  description: string;
  extraction_fields: string[];
  comparison_instructions: string;
  critical_checks: string[];
}

// Export Tracker API types (for integration)
export interface ExportTrackerDocument {
  id: string;
  quotation_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  description?: string;
  submitted_at: string;
}

// Document Groups and Upload types (new feature)
export interface DocumentGroup {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface UploadedDocument {
  id: string;
  user_id: string;
  group_id: string;
  file_name: string;
  original_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  document_type?: string;
  description?: string;
  checksum?: string;
  uploaded_at: string;
}

export interface DocumentGroupForm {
  name: string;
  description?: string;
}

export interface DocumentUploadForm {
  group_id: string;
  document_type?: string;
  description?: string;
}

// Analysis modes
export type AnalysisMode = 'quotation' | 'uploaded';

// Extended analysis types
export interface AnalysisSessionRequest {
  mode: AnalysisMode;
  quotation_id?: string;  // For quotation mode
  group_id?: string;      // For uploaded mode
  document_ids: string[];
  rule_id: string;
}

// Common document types for suggestions (general purpose)
export const COMMON_DOCUMENT_TYPES = [
  // Business & Financial
  'invoice', 'receipt', 'contract', 'agreement', 'proposal', 'quote',
  'purchase-order', 'bill-of-lading', 'statement', 'budget', 'financial-report',

  // Legal & Compliance
  'certificate', 'license', 'permit', 'regulation', 'policy', 'terms-of-service',
  'nda', 'patent', 'trademark', 'copyright',

  // Personal & Identity
  'id-card', 'passport', 'drivers-license', 'birth-certificate', 'marriage-license',
  'diploma', 'transcript', 'resume', 'recommendation-letter',

  // Property & Real Estate
  'deed', 'mortgage', 'lease', 'property-tax', 'insurance-policy',

  // Medical & Health
  'medical-record', 'prescription', 'insurance-claim', 'lab-results', 'vaccination-record',

  // Education & Academic
  'transcript', 'diploma', 'certificate', 'research-paper', 'thesis',

  // Government & Official
  'tax-return', 'social-security', 'immigration', 'visa', 'permit',
  'court-document', 'warrant', 'summons',

  // Export/Import (legacy support)
  'tk-32', 'tk-31', 'tk-10', 'tk-11', 'import-permit', 'export-permit',
  'commercial-invoice', 'packing-list', 'certificate-of-origin', 'msds',

  // Other
  'other', 'miscellaneous', 'custom'
];

// Common extraction fields for suggestions (general purpose)
export const COMMON_EXTRACTION_FIELDS = [
  // Personal Information
  'full_name', 'first_name', 'last_name', 'date_of_birth', 'age', 'gender',
  'national_id', 'passport_number', 'drivers_license_number', 'phone_number', 'email',

  // Address Information
  'address', 'street_address', 'city', 'state', 'zip_code', 'country',

  // Business Information
  'company_name', 'business_name', 'tax_id', 'registration_number',
  'contact_person', 'position', 'department',

  // Financial Information
  'amount', 'total_amount', 'subtotal', 'tax_amount', 'discount',
  'currency', 'account_number', 'routing_number', 'iban', 'swift_code',

  // Document Metadata
  'document_number', 'reference_number', 'issue_date', 'expiration_date',
  'effective_date', 'signature_date', 'approval_date',

  // Product/Service Information
  'product_name', 'product_description', 'quantity', 'unit_price',
  'total_value', 'item_number', 'sku', 'category',

  // Legal Information
  'party_a', 'party_b', 'witness_name', 'notary_name', 'judge_name',
  'case_number', 'court_name', 'attorney_name',

  // Medical Information
  'patient_name', 'doctor_name', 'diagnosis', 'treatment', 'medication',
  'dosage', 'frequency', 'lab_test', 'results',

  // Educational Information
  'student_name', 'institution_name', 'degree', 'major', 'gpa',
  'graduation_date', 'course_name', 'grade',

  // Export/Import Fields (legacy support)
  'import_permit_date', 'import_permit_authorization_no', 'import_permit_number',
  'importer_name', 'importer_address', 'exporter_name', 'exporter_address',
  'authorized_quantity', 'export_quantity_net_weight', 'destination_country',
  'destination_address', 'license_holder_name', 'permit_number', 'buyer_name',
  'buyer_details', 'seller_name', 'po_number', 'customer_po_number', 'order_quantity',
  'consignee_name', 'consignee_address', 'consigner_name', 'consigner_address',
  'net_weight', 'total_weight', 'total_net_weight', 'gross_weight',
  'gross_weight_pallet_included', 'shipping_mark', 'port_loading', 'port_destination',
  'airport', 'country_of_origin', 'pallet_count', 'pallet_numbers', 'box_size',
  'box_numbers', 'box_count', 'product_quantity', 'product_price', 'product_value',
  'total_value', 'invoice_number', 'invoice_date', 'shipped_from', 'shipped_to',
  'remarks', 'declaration_number'
];
