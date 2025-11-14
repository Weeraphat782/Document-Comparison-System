'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, FileCheck, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ComparisonRule } from '@/lib/types';
import { ComparisonResults } from '@/components/comparison-results';

interface Document {
  id: string;
  file_name: string;
  document_type: string;
  submitted_at: string;
}

interface CustomerInfo {
  name: string;
  email: string;
  company: string;
}

interface DocumentData {
  customer_info: CustomerInfo;
  documents: Document[];
}

export default function AnalyzePage() {
  const searchParams = useSearchParams();
  const accessCodeFromUrl = searchParams.get('code');

  const [accessCode, setAccessCode] = useState(accessCodeFromUrl || '');
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [rules, setRules] = useState<ComparisonRule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string>('');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load rules on mount
  useEffect(() => {
    loadRules();
  }, []);

  // Load documents when access code changes
  useEffect(() => {
    if (accessCode) {
      loadDocuments();
    } else {
      setDocumentData(null);
      setSelectedDocuments(new Set());
    }
  }, [accessCode]);

  async function loadRules() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const response = await fetch('/api/rules');
      if (response.ok) {
        const data = await response.json();
        setRules(data);
        // Auto-select first rule
        if (data.length > 0) {
          setSelectedRuleId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading rules:', err);
    }
  }

  async function loadDocuments() {
    if (!accessCode) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents?access_code=${accessCode}`);
      if (response.ok) {
        const data = await response.json();
        setDocumentData(data);
        // Auto-select all documents
        setSelectedDocuments(new Set(data.documents.map((doc: Document) => doc.id)));
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load documents');
      }
    } catch (err) {
      console.error('Error loading documents:', err);
      setError('Failed to connect to document service');
    } finally {
      setLoading(false);
    }
  }

  function toggleDocument(documentId: string) {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId);
    } else {
      newSelected.add(documentId);
    }
    setSelectedDocuments(newSelected);
  }

  function selectAllDocuments() {
    if (documentData) {
      if (selectedDocuments.size === documentData.documents.length) {
        setSelectedDocuments(new Set());
      } else {
        setSelectedDocuments(new Set(documentData.documents.map(doc => doc.id)));
      }
    }
  }

  async function handleAnalyze() {
    if (!selectedRuleId || selectedDocuments.size === 0) {
      return;
    }

    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const selectedRule = rules.find(r => r.id === selectedRuleId);
      if (!selectedRule) {
        throw new Error('Selected rule not found');
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_ids: Array.from(selectedDocuments),
          rule_id: selectedRuleId,
          access_code: accessCode,
          rule_instructions: {
            comparison_instructions: selectedRule.comparison_instructions,
            extraction_fields: selectedRule.extraction_fields,
            critical_checks: selectedRule.critical_checks
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setAnalysisResult(result);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Analysis failed');
      }
    } catch (err) {
      console.error('Error during analysis:', err);
      setError('Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Document Analysis</h1>
        <p className="text-muted-foreground">
          Compare and verify documents using AI-powered analysis
        </p>
      </div>

      <div className="grid gap-6">
        {/* Access Code Input */}
        <Card>
          <CardHeader>
            <CardTitle>1. Enter Access Code</CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter the access code provided by your document provider
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Enter access code (e.g., ABC-2024-001)"
                className="flex-1"
              />
              <Button onClick={loadDocuments} disabled={!accessCode || loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load Documents'}
              </Button>
            </div>
            {error && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Info & Documents */}
        {documentData && (
          <Card>
            <CardHeader>
              <CardTitle>2. Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Customer Name</Label>
                  <p className="text-sm text-muted-foreground">{documentData.customer_info.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-muted-foreground">{documentData.customer_info.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Company</Label>
                  <p className="text-sm text-muted-foreground">{documentData.customer_info.company}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rule Selection */}
        {documentData && rules.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>3. Select Analysis Rule</CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose how documents should be compared and verified
              </p>
            </CardHeader>
            <CardContent>
              <Select value={selectedRuleId} onValueChange={setSelectedRuleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an analysis rule" />
                </SelectTrigger>
                <SelectContent>
                  {rules.map((rule) => (
                    <SelectItem key={rule.id} value={rule.id}>
                      {rule.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRuleId && rules.find(r => r.id === selectedRuleId)?.description && (
                <p className="text-sm text-muted-foreground mt-2">
                  {rules.find(r => r.id === selectedRuleId)?.description}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Document Selection */}
        {documentData && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>4. Select Documents to Analyze</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Choose at least 2 documents for cross-document comparison
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllDocuments}
                >
                  {selectedDocuments.size === documentData.documents.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {documentData.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedDocuments.has(doc.id)}
                      onCheckedChange={() => toggleDocument(doc.id)}
                      id={doc.id}
                    />
                    <label htmlFor={doc.id} className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{doc.file_name}</span>
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                          {doc.document_type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Uploaded: {new Date(doc.submitted_at).toLocaleString()}
                      </p>
                    </label>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {selectedDocuments.size} of {documentData.documents.length} documents selected
                </div>
                <Button
                  onClick={handleAnalyze}
                  disabled={selectedDocuments.size < 2 || analyzing || !selectedRuleId}
                  size="lg"
                  className="gap-2"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <FileCheck className="h-5 w-5" />
                      Run AI Analysis ({selectedDocuments.size} docs)
                    </>
                  )}
                </Button>
              </div>

              {!selectedRuleId && selectedDocuments.size >= 2 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    ℹ️ Please select an analysis rule first.
                  </p>
                </div>
              )}

              {selectedDocuments.size === 1 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Please select at least 2 documents for cross-document comparison.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Analysis Results */}
        {analysisResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Analysis Complete
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ComparisonResults
                results={analysisResult.results || []}
                fullFeedback={analysisResult.full_feedback}
                criticalChecksResults={analysisResult.critical_checks_results}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}