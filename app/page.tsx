"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { DocumentSelector } from "@/components/document-selector"
import { ComparisonResults } from "@/components/comparison-results"
import { ModeSelector } from "@/components/mode-selector"
import { DocumentGroupManager } from "@/components/document-group-manager"
import { FileUploader } from "@/components/file-uploader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { FileSearch, Sparkles, Settings, Loader2, Check, ChevronsUpDown } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { QuotationHistoryItem } from "@/lib/db"
import { AnalysisMode, UploadedDocument } from "@/lib/types"

interface AnalysisResult {
  document_id: string
  document_name: string
  document_type: string
  ai_feedback: string
  sequence_order: number
}

interface CriticalCheckResult {
  check_name: string
  status: "PASS" | "FAIL" | "WARNING"
  details: string
  issue: string
}

interface AnalysisResponse {
  results: AnalysisResult[]
  full_feedback?: string
  critical_checks_results?: CriticalCheckResult[]
}

export default function DocumentComparisonPage() {
  const searchParams = useSearchParams()
  const { user, isLoading: authLoading } = useAuth()
  const [mode, setMode] = useState<AnalysisMode>('quotation')
  const [quotationId, setQuotationId] = useState("")
  const [inputQuotationId, setInputQuotationId] = useState("")
  const [selectedGroupId, setSelectedGroupId] = useState("")
  const [quotationHistory, setQuotationHistory] = useState<QuotationHistoryItem[]>([])
  const [comboboxOpen, setComboboxOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<AnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [documentRefreshTrigger, setDocumentRefreshTrigger] = useState(0)

  useEffect(() => {
    const qId = searchParams.get("quotation_id")
    if (qId) {
      setQuotationId(qId)
      setInputQuotationId(qId)
    }
  }, [searchParams])

  // Load quotation history when user is authenticated
  useEffect(() => {
    if (user) {
      loadQuotationHistory()
    }
  }, [user])

  async function loadQuotationHistory() {
    try {
      const response = await fetch('/api/quotation-history')
      if (response.ok) {
        const data = await response.json()
        setQuotationHistory(data.quotation_history || [])
      }
    } catch (error) {
      console.error('Failed to load quotation history:', error)
    }
  }

  function handleQuotationSubmit() {
    if (inputQuotationId.trim()) {
      setQuotationId(inputQuotationId.trim())
      setError(null)
      setAnalysisResults(null)
    }
  }

  function handleGroupSelect(groupId: string) {
    setSelectedGroupId(groupId)
    setError(null)
    setAnalysisResults(null)
  }

  function handleModeChange(newMode: AnalysisMode) {
    setMode(newMode)
    // Reset states when switching modes
    setQuotationId("")
    setInputQuotationId("")
    setSelectedGroupId("")
    setAnalysisResults(null)
    setError(null)
  }

  async function handleAnalyze(documentIds: string[], ruleId: string) {
    setIsAnalyzing(true)
    setError(null)
    setAnalysisResults(null)

    try {
      const requestBody = mode === 'quotation'
        ? {
            mode,
            quotation_id: quotationId,
            document_ids: documentIds,
            rule_id: ruleId,
          }
        : {
            mode,
            group_id: selectedGroupId,
            document_ids: documentIds,
            rule_id: ruleId,
          }

      const response = await fetch("/api/document-comparison/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        let errorMessage = `Analysis failed (${response.status}): ${response.statusText}`;
        try {
          const errorText = await response.text();
          if (errorText) {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          }
        } catch (parseError) {
          // If response body is empty or not valid JSON, keep default error message
          console.warn('Could not parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const data: AnalysisResponse = await response.json()
      setAnalysisResults(data)

      // Refresh quotation history to include the new analysis
      loadQuotationHistory()
    } catch (err) {
      console.error("Analysis error:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Show loading while authenticating
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div>
            <h2 className="text-xl font-semibold">Loading...</h2>
            <p className="text-sm text-muted-foreground">Checking authentication</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <FileSearch className="h-6 w-6" />
              </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Document Analysis Service</h1>
                  <p className="text-sm text-muted-foreground">AI-powered cross-document verification for any document type</p>
                </div>
            </div>
            {user && (
              <Link href="/rules">
                <Button variant="outline" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Manage Rules
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Mode Selector */}
          {(!quotationId && !selectedGroupId) && (
            <ModeSelector selectedMode={mode} onModeChange={handleModeChange} />
          )}

          {/* Quotation Mode: Document Set ID Input */}
          {mode === 'quotation' && !quotationId && (
            <Card>
              <CardHeader>
                <CardTitle>Select or Enter Document Set ID</CardTitle>
                <CardDescription>Choose from your previous analyses or enter a new quotation ID to load and analyze related documents</CardDescription>
              </CardHeader>
              <div className="px-6 pb-6">
                <div className="flex gap-3">
                  <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={comboboxOpen}
                        className="flex-1 justify-between"
                      >
                        {inputQuotationId || "Select or enter quotation ID..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                      <Command>
                        <CommandInput
                          placeholder="Search or enter new ID..."
                          value={inputQuotationId}
                          onValueChange={setInputQuotationId}
                        />
                        <CommandList>
                          <CommandEmpty>No previous analyses found.</CommandEmpty>
                          {quotationHistory.length > 0 && (
                            <CommandGroup heading="Previous Analyses">
                              {quotationHistory.map((item) => (
                                <CommandItem
                                  key={item.quotation_id}
                                  value={item.quotation_id}
                                  onSelect={(currentValue) => {
                                    setInputQuotationId(currentValue === inputQuotationId ? "" : currentValue)
                                    setComboboxOpen(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      inputQuotationId === item.quotation_id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col w-full">
                                    <span className="font-medium">{item.quotation_id}</span>
                                    {item.quotation_summary && item.quotation_summary !== item.quotation_id && (
                                      <span className="text-sm text-muted-foreground truncate">
                                        {item.quotation_summary.replace(item.quotation_id + ' - ', '')}
                                      </span>
                                    )}
                                    {item.last_analyzed && (
                                      <span className="text-xs text-muted-foreground">
                                        Last analyzed: {new Date(item.last_analyzed).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Button onClick={handleQuotationSubmit} disabled={!inputQuotationId.trim()}>
                    Load Documents
                  </Button>
                </div>
                {quotationHistory.length > 0 && (
                  <div className="mt-3 text-sm text-muted-foreground">
                    Found {quotationHistory.length} previous analysis session{quotationHistory.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Uploaded Mode: Document Group Management */}
          {mode === 'uploaded' && !selectedGroupId && (
            <DocumentGroupManager
              selectedGroupId={selectedGroupId}
              onGroupSelect={handleGroupSelect}
            />
          )}

          {/* Uploaded Mode: File Uploader (Optional - Always visible but collapsible) */}
          {mode === 'uploaded' && selectedGroupId && !analysisResults && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upload Additional Documents (Optional)</CardTitle>
                <CardDescription>
                  You can upload new documents or proceed with existing documents in this group
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUploader
                  groupId={selectedGroupId}
                  onUploadComplete={(documents) => {
                    console.log('Documents uploaded:', documents.length)
                    // Trigger document selector refresh
                    setDocumentRefreshTrigger(prev => prev + 1)
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Document Selection */}
          {((mode === 'quotation' && quotationId) || (mode === 'uploaded' && selectedGroupId)) && !analysisResults && (
            <div className="space-y-6">
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {mode === 'quotation'
                          ? `Document Set: ${quotationId}`
                          : `Document Group: ${selectedGroupId}`
                        }
                      </CardTitle>
                      <CardDescription>Select documents and comparison rules below</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (mode === 'quotation') {
                          setQuotationId("")
                          setInputQuotationId("")
                        } else {
                          setSelectedGroupId("")
                        }
                      }}
                    >
                      {mode === 'quotation' ? 'Change Document Set' : 'Change Group'}
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              <DocumentSelector
                onAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
                mode={mode}
                quotationId={quotationId}
                groupId={selectedGroupId}
                refreshTrigger={documentRefreshTrigger}
              />
            </div>
          )}

          {/* Analysis Results */}
          {analysisResults && (
            <div className="space-y-6">
              {/* Results Header */}
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Analysis Complete</CardTitle>
                      <CardDescription className="mt-1">
                        Review the verification results and address any issues found
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAnalysisResults(null)
                        setQuotationId("")
                        setInputQuotationId("")
                        setSelectedGroupId("")
                      }}
                    >
                      Start New Analysis
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {/* Results Display */}
              <ComparisonResults
                results={analysisResults.results}
                fullFeedback={analysisResults.full_feedback}
                criticalChecksResults={analysisResults.critical_checks_results}
              />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t bg-muted/30 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Powered by AI • Ensuring document accuracy and consistency across any document type</p>
        </div>
      </footer>
    </div>
  )
}
