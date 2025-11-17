"use client"

import { driver, DriveStep } from "driver.js"
import { Button } from "@/components/ui/button"
import { HelpCircle, FileText, Upload } from "lucide-react"

export function TutorialGuide() {
  // Tutorial steps for Quotation Mode
  const quotationSteps: DriveStep[] = [
    {
      element: "[data-tour='mode-selector']",
      popover: {
        title: "Select Analysis Mode",
        description: "Choose 'Quotation Documents' to analyze documents from Export Tracker using a Quotation ID",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='quotation-input']",
      popover: {
        title: "Enter Quotation ID",
        description: "Enter a Quotation ID or select from your previous analysis history",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='quotation-load']",
      popover: {
        title: "Load Documents",
        description: "Click this button to load documents from the specified Quotation",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='rule-selector']",
      popover: {
        title: "Select Comparison Rule",
        description: "Choose a rule for analysis - each rule has different verification criteria and checks",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='document-list']",
      popover: {
        title: "Select Documents",
        description: "Choose documents to analyze (minimum 2 documents required for cross-document comparison)",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='analyze-button']",
      popover: {
        title: "Run Analysis",
        description: "Click to start AI-powered analysis - the system will check consistency and find discrepancies",
        side: "top",
        align: "center",
      },
    },
  ]

  // Tutorial steps for Upload Mode
  const uploadSteps: DriveStep[] = [
    {
      element: "[data-tour='mode-selector']",
      popover: {
        title: "Select Analysis Mode",
        description: "Choose 'Upload Documents' to upload and analyze your own files",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='group-manager']",
      popover: {
        title: "Manage Document Groups",
        description: "Create or select a Document Group to organize your files",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='create-group']",
      popover: {
        title: "Create New Group",
        description: "Click this button to create a new Document Group for your files",
        side: "left",
        align: "center",
      },
    },
    {
      element: "[data-tour='file-uploader']",
      popover: {
        title: "Upload Documents",
        description: "Upload documents you want to analyze (you can upload multiple files at once)",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='rule-selector']",
      popover: {
        title: "Select Comparison Rule",
        description: "Choose a rule for analysis - each rule has different verification criteria",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='document-list']",
      popover: {
        title: "Select Documents",
        description: "Choose documents to analyze (minimum 2 documents required)",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='analyze-button']",
      popover: {
        title: "Run Analysis",
        description: "Click to start AI-powered document verification",
        side: "top",
        align: "center",
      },
    },
  ]

  const startQuotationTutorial = () => {
    const driverObj = driver({
      showProgress: true,
      showButtons: ["next", "previous", "close"],
      steps: quotationSteps,
      nextBtnText: "Next",
      prevBtnText: "Previous",
      doneBtnText: "Done",
      popoverClass: "driver-popover-custom",
      onDestroyStarted: () => {
        driverObj.destroy()
      },
      onPopoverRender: (popover) => {
        // Allow clicking through the overlay for dialogs
        const overlay = document.querySelector('.driver-overlay')
        if (overlay) {
          (overlay as HTMLElement).style.pointerEvents = 'none'
        }
        const activeElement = document.querySelector('.driver-active-element')
        if (activeElement) {
          (activeElement as HTMLElement).style.pointerEvents = 'auto'
        }
      },
    })

    driverObj.drive()
  }

  const startUploadTutorial = () => {
    const driverObj = driver({
      showProgress: true,
      showButtons: ["next", "previous", "close"],
      steps: uploadSteps,
      nextBtnText: "Next",
      prevBtnText: "Previous",
      doneBtnText: "Done",
      popoverClass: "driver-popover-custom",
      onDestroyStarted: () => {
        driverObj.destroy()
      },
      onPopoverRender: (popover) => {
        // Allow clicking through the overlay for dialogs
        const overlay = document.querySelector('.driver-overlay')
        if (overlay) {
          (overlay as HTMLElement).style.pointerEvents = 'none'
        }
        const activeElement = document.querySelector('.driver-active-element')
        if (activeElement) {
          (activeElement as HTMLElement).style.pointerEvents = 'auto'
        }
      },
    })

    driverObj.drive()
  }

  return (
    <div className="flex gap-2">
      <Button
        onClick={startQuotationTutorial}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <FileText className="h-4 w-4" />
        Quotation Guide
      </Button>
      <Button
        onClick={startUploadTutorial}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <Upload className="h-4 w-4" />
        Upload Guide
      </Button>
    </div>
  )
}
