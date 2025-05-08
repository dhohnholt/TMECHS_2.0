import React, { forwardRef, useImperativeHandle, useRef } from 'react'
import { Printer } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface PrintData {
  name: string
  barcode: string
  violation_type: string
  detention_date: string
}

interface PrintProps {
  type: 'detention'
  data: PrintData
  showButton?: boolean
  printLabel?: boolean
}

export interface PrintHandle {
  print: () => void
}

const Print = forwardRef<PrintHandle, PrintProps>(
  ({ type, data, showButton = true, printLabel = false }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null)

    const printDetentionSlip = () => {
      if (!iframeRef.current) {
        console.error('Iframe ref is null')
        toast.error('Print failed: Iframe not found')
        return
      }

      const iframe = iframeRef.current
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (!doc) {
        console.error('Iframe document is inaccessible')
        toast.error('Print failed: Cannot access iframe document')
        return
      }

      const printContent = `
        <html>
          <head>
            <title>Detention Slip</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                font-size: 14px;
                line-height: 1.5;
              }
              .slip-container {
                border: 2px solid #000;
                padding: 15px;
                width: 300px;
                margin: 0 auto;
              }
              .header {
                text-align: center;
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 15px;
              }
              .field {
                margin-bottom: 10px;
              }
              .field-label {
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <div class="slip-container">
              <div class="header">Detention Slip</div>
              <div class="field">
                <span class="field-label">Student Name:</span> ${data.name}
              </div>
              <div class="field">
                <span class="field-label">Student ID:</span> ${data.barcode}
              </div>
              <div class="field">
                <span class="field-label">Violation Type:</span> ${data.violation_type}
              </div>
              <div class="field">
                <span class="field-label">Detention Date:</span> ${data.detention_date}
              </div>
              <div class="field">
                <span class="field-label">Issued On:</span> ${new Date().toLocaleDateString()}
              </div>
            </div>
          </body>
        </html>
      `

      try {
        doc.open()
        doc.write(printContent)
        doc.close()

        const triggerPrint = () => {
          console.log('Triggering print dialog')
          iframe.contentWindow?.focus()
          const success = iframe.contentWindow?.print()
          if (!success) {
            console.error('Print dialog failed to open')
            toast.error('Failed to open print dialog')
          }
        }

        if (iframe.contentDocument?.readyState === 'complete') {
          triggerPrint()
        } else {
          iframe.onload = () => {
            console.log('Iframe loaded')
            triggerPrint()
          }
        }
      } catch (error) {
        console.error('Printing failed:', error)
        toast.error('Failed to print detention slip')
      }
    }

    const printLabelForBrother = () => {
      if (!iframeRef.current) {
        console.error('Iframe ref is null')
        toast.error('Print failed: Iframe not found')
        return
      }

      const iframe = iframeRef.current
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (!doc) {
        console.error('Iframe document is inaccessible')
        toast.error('Print failed: Cannot access iframe document')
        return
      }

      const labelContent = `
        <html>
          <head>
            <title>Detention Label</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 5px;
                font-size: 10px;
                line-height: 1.2;
                width: 58mm;
              }
              .label-container {
                border: 1px solid #000;
                padding: 5px;
              }
              .header {
                text-align: center;
                font-size: 12px;
                font-weight: bold;
                margin-bottom: 5px;
              }
              .field {
                margin-bottom: 3px;
              }
              .field-label {
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <div class="label-container">
              <div class="header">Detention Label</div>
              <div class="field">
                <span class="field-label">Name:</span> ${data.name}
              </div>
              <div class="field">
                <span class="field-label">ID:</span> ${data.barcode}
              </div>
              <div class="field">
                <span class="field-label">Violation:</span> ${data.violation_type}
              </div>
              <div class="field">
                <span class="field-label">Date:</span> ${data.detention_date}
              </div>
              <div class="field">
                <span class="field-label">Issued:</span> ${new Date().toLocaleDateString()}
              </div>
            </div>
          </body>
        </html>
      `

      try {
        doc.open()
        doc.write(labelContent)
        doc.close()

        const triggerPrint = () => {
          console.log('Triggering print dialog for label')
          iframe.contentWindow?.focus()
          const success = iframe.contentWindow?.print()
          if (!success) {
            console.error('Print dialog failed to open')
            toast.error('Failed to open print dialog')
          }
        }

        if (iframe.contentDocument?.readyState === 'complete') {
          triggerPrint()
        } else {
          iframe.onload = () => {
            console.log('Iframe loaded')
            triggerPrint()
          }
        }
      } catch (error) {
        console.error('Label printing failed:', error)
        toast.error('Failed to print label')
      }
    }

    useImperativeHandle(ref, () => ({
      print: () => {
        if (type === 'detention') {
          if (printLabel) {
            printLabelForBrother()
          } else {
            printDetentionSlip()
          }
        }
      },
    }))

    return (
      <>
        {showButton && (
          <button
            onClick={() => {
              console.log('Print button clicked, printLabel:', printLabel)
              printLabel ? printLabelForBrother() : printDetentionSlip()
            }}
            className="flex items-center rounded-full px-3 py-2 text-tmechs-forest transition-all duration-300 hover:scale-105 hover:bg-tmechs-sage/20"
          >
            <Printer className="mr-2 h-5 w-5 transition-all duration-300 hover:rotate-12" />
            <span className="text-base font-medium tracking-wide">
              Print Slip
            </span>
          </button>
        )}
        <iframe
          ref={iframeRef}
          style={{ display: 'none' }}
          title="Print Frame"
        />
      </>
    )
  }
)

Print.displayName = 'Print'

export default Print
