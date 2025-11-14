"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { FileSearch, Upload } from "lucide-react"
import { AnalysisMode } from "@/lib/types"

interface ModeSelectorProps {
  selectedMode: AnalysisMode
  onModeChange: (mode: AnalysisMode) => void
}

export function ModeSelector({ selectedMode, onModeChange }: ModeSelectorProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-xl">Choose Analysis Mode</CardTitle>
        <CardDescription>
          Select how you want to provide documents for analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedMode}
          onValueChange={(value) => onModeChange(value as AnalysisMode)}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Quotation Mode */}
          <div className="relative">
            <RadioGroupItem
              value="quotation"
              id="quotation"
              className="peer sr-only"
            />
            <Label
              htmlFor="quotation"
              className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-colors"
            >
              <FileSearch className="mb-3 h-12 w-12 text-primary" />
              <div className="text-center">
                <div className="font-semibold text-lg mb-1">Quotation Documents</div>
                <div className="text-sm text-muted-foreground">
                  Use documents from Export Tracker by entering a quotation ID
                </div>
              </div>
            </Label>
          </div>

          {/* Uploaded Mode */}
          <div className="relative">
            <RadioGroupItem
              value="uploaded"
              id="uploaded"
              className="peer sr-only"
            />
            <Label
              htmlFor="uploaded"
              className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-colors"
            >
              <Upload className="mb-3 h-12 w-12 text-primary" />
              <div className="text-center">
                <div className="font-semibold text-lg mb-1">Upload Documents</div>
                <div className="text-sm text-muted-foreground">
                  Create a document group and upload your own files for analysis
                </div>
              </div>
            </Label>
          </div>
        </RadioGroup>

        {/* Mode Description */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          {selectedMode === 'quotation' ? (
            <div className="text-sm">
              <strong>Quotation Mode:</strong> Enter a quotation ID to load documents from the Export Tracker system.
              This mode works with existing quotation workflows and provides seamless integration.
            </div>
          ) : (
            <div className="text-sm">
              <strong>Upload Mode:</strong> Create your own document groups and upload files directly.
              Perfect for standalone document analysis or when you don't have quotation IDs.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}


