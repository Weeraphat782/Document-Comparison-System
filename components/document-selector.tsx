"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Loader2, FileCheck, AlertCircle } from "lucide-react"
import { AnalysisMode, ExportTrackerDocument, UploadedDocument } from "@/lib/types"

// Union type for documents from different sources
type DocumentSource = ExportTrackerDocument | UploadedDocument

interface Rule {
  id: string
  name: string
  description: string
  is_default: boolean
}

interface DocumentSelectorProps {
  onAnalyze: (documentIds: string[], ruleId: string) => void
  isAnalyzing: boolean
  mode: AnalysisMode
  quotationId?: string  // For quotation mode
  groupId?: string      // For uploaded mode
}

export function DocumentSelector({ onAnalyze, isAnalyzing, mode, quotationId, groupId }: DocumentSelectorProps) {
  const [documents, setDocuments] = useState<DocumentSource[]>([])
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [rules, setRules] = useState<Rule[]>([])
  const [selectedRuleId, setSelectedRuleId] = useState<string>("")
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const [loadingRules, setLoadingRules] = useState(false)

  // Load documents and rules when dependencies change
  useEffect(() => {
    loadDocuments()
    loadRules()
  }, [mode, quotationId, groupId])

  async function loadRules() {
    setLoadingRules(true)
    try {
      const response = await fetch(`/api/document-comparison/rules`)
      if (response.ok) {
        const data = await response.json()
        setRules(data)

        // Auto-select default rule
        const defaultRule = data.find((r: Rule) => r.is_default)
        if (defaultRule) {
          setSelectedRuleId(defaultRule.id)
        }
      }
    } catch (error) {
      console.error("Error loading rules:", error)
    } finally {
      setLoadingRules(false)
    }
  }

  async function loadDocuments() {
    // Clear previous documents and selection
    setDocuments([])
    setSelectedDocuments(new Set())

    if (mode === 'quotation' && !quotationId) return
    if (mode === 'uploaded' && !groupId) return

    setLoadingDocuments(true)
    try {
      let response;

      if (mode === 'quotation') {
        console.log("Loading documents for quotation:", quotationId)
        response = await fetch(`/api/document-comparison/list-documents?quotation_id=${quotationId}`)
      } else if (mode === 'uploaded') {
        console.log("Loading documents for group:", groupId)
        response = await fetch(`/api/documents/${groupId}`)
      }

      if (!response) {
        throw new Error("Invalid mode configuration")
      }

      console.log("Response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error response:", errorData)
        throw new Error("Failed to load documents")
      }

      const data = await response.json()
      console.log("Received data:", data)

      let documentsList: DocumentSource[] = []

      if (mode === 'quotation') {
        documentsList = data.documents || []
        console.log("Documents count:", documentsList.length)
      } else if (mode === 'uploaded') {
        documentsList = data.documents || []
        console.log("Uploaded documents count:", documentsList.length)
      }

      setDocuments(documentsList)
    } catch (error) {
      console.error("Error loading documents:", error)
      setDocuments([])
    } finally {
      setLoadingDocuments(false)
    }
  }

  function toggleDocument(documentId: string) {
    const newSelected = new Set(selectedDocuments)
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId)
    } else {
      newSelected.add(documentId)
    }
    setSelectedDocuments(newSelected)
  }

  function handleSelectAll() {
    if (selectedDocuments.size === documents.length) {
      setSelectedDocuments(new Set())
    } else {
      setSelectedDocuments(new Set(documents.map((d) => d.id)))
    }
  }

  function handleAnalyze() {
    if (selectedDocuments.size === 0 || !selectedRuleId) {
      return
    }
    onAnalyze(Array.from(selectedDocuments), selectedRuleId)
  }

  return (
    <div className="space-y-6">
      {/* Rule Selection */}
      <Card>
        <CardHeader>
          <CardTitle>1. Select Comparison Rule</CardTitle>
          <CardDescription>Choose how documents should be compared and verified</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRules ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Select value={selectedRuleId} onValueChange={setSelectedRuleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a comparison rule" />
              </SelectTrigger>
              <SelectContent>
                {rules.map((rule) => (
                  <SelectItem key={rule.id} value={rule.id}>
                    <div className="flex items-center gap-2">
                      <span>{rule.name}</span>
                      {rule.is_default && (
                        <Badge variant="outline" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {selectedRuleId && rules.find((r) => r.id === selectedRuleId)?.description && (
            <p className="text-sm text-muted-foreground mt-2">
              {rules.find((r) => r.id === selectedRuleId)?.description}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Document Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>2. Select Documents to Analyze</CardTitle>
              <CardDescription>Choose at least 2 documents for cross-document comparison</CardDescription>
            </div>
            {documents.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedDocuments.size === documents.length ? "Deselect All" : "Select All"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingDocuments ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Documents Found</h3>
              <p className="text-sm text-muted-foreground">
                {mode === 'quotation'
                  ? "This quotation doesn't have any uploaded documents yet."
                  : "This document group doesn't have any uploaded documents yet."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
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
                      <span className="font-medium">
                        {mode === 'uploaded' && 'original_name' in doc ? doc.original_name : doc.file_name}
                      </span>
                      <Badge variant="outline">{doc.document_type || 'Unknown'}</Badge>
                    </div>
                    {doc.description && <p className="text-sm text-muted-foreground">{doc.description}</p>}
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {mode === 'quotation'
                          ? `Submitted: ${new Date((doc as ExportTrackerDocument).submitted_at).toLocaleString()}`
                          : `Uploaded: ${new Date((doc as UploadedDocument).uploaded_at).toLocaleString()}`
                        }
                      </p>
                      {mode === 'uploaded' && 'file_size' in doc && (
                        <p className="text-xs text-muted-foreground">
                          {Math.round((doc as UploadedDocument).file_size / (1024 * 1024) * 100) / 100} MB
                        </p>
                      )}
                    </div>
                  </label>
                </div>
              ))}
            </div>
          )}

          {documents.length > 0 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedDocuments.size} of {documents.length} documents selected
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={selectedDocuments.size < 2 || isAnalyzing || !selectedRuleId}
                size="lg"
                className="gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <FileCheck className="h-5 w-5" />
                    Run AI Verification ({selectedDocuments.size} docs)
                  </>
                )}
              </Button>
            </div>
          )}

          {!selectedRuleId && selectedDocuments.size >= 2 && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">ℹ️ Please select a comparison rule first.</p>
            </div>
          )}

          {selectedDocuments.size === 1 && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ Please select at least 2 documents for cross-document comparison.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
