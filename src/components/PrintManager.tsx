import React, { useRef } from 'react'
import Print, { PrintHandle } from '../components/Print'
import { toast } from 'react-hot-toast'

interface Violation {
  name: string
  id: string
  violation: string
  date: string
  issued: string
}

interface PrintManagerProps {
  violations: Violation[] | undefined // Allow undefined but handle it
  printLabel?: boolean
}

export const PrintManager: React.FC<PrintManagerProps> = ({
  violations = [],
  printLabel = false,
}) => {
  const printRefs = useRef<(PrintHandle | null)[]>([])
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleBatchPrint = () => {
    if (!iframeRef.current) {
      console.error('Iframe ref is null')
      toast.error('Batch print failed: Iframe not found')
      return
    }

    const iframe = iframeRef.current
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) {
      console.error('Iframe document is inaccessible')
      toast.error('Batch print failed: Cannot access iframe document')
      return
    }

    // If violations is empty, show a message and return
    if (!violations || violations.length === 0) {
      toast.error('No violations to print')
      return
    }

    const printDataArray = violations.map(violation => ({
      name: violation.name,
      barcode: violation.id,
      violation_type: violation.violation,
      detention_date: violation.date,
    }))

    const batchContent = printDataArray
      .map(data => {
        const isLabel = printLabel
        return `
          <div style="page-break-after: always;">
            ${
              isLabel
                ? `
              <div style="font-family: Arial, sans-serif; margin: 0; padding: 5px; font-size: 10px; line-height: 1.2; width: 58mm;">
                <div style="border: 1px solid #000; padding: 5px;">
                  <div style="text-align: center; font-size: 12px; font-weight: bold; margin-bottom: 5px;">Detention Label</div>
                  <div style="margin-bottom: 3px;"><span style="font-weight: bold;">Name:</span> ${data.name}</div>
                  <div style="margin-bottom: 3px;"><span style="font-weight: bold;">ID:</span> ${data.barcode}</div>
                  <div style="margin-bottom: 3px;"><span style="font-weight: bold;">Violation:</span> ${data.violation_type}</div>
                  <div style="margin-bottom: 3px;"><span style="font-weight: bold;">Date:</span> ${data.detention_date}</div>
                  <div style="margin-bottom: 3px;"><span style="font-weight: bold;">Issued:</span> ${new Date().toLocaleDateString()}</div>
                </div>
              </div>
            `
                : `
              <div style="font-family: Arial, sans-serif; margin: 0; padding: 20px; font-size: 14px; line-height: 1.5;">
                <div style="border: 2px solid #000; padding: 15px; width: 300px; margin: 0 auto;">
                  <div style="text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 15px;">Detention Slip</div>
                  <div style="margin-bottom: 10px;"><span style="font-weight: bold;">Student Name:</span> ${data.name}</div>
                  <div style="margin-bottom: 10px;"><span style="font-weight: bold;">Student ID:</span> ${data.barcode}</div>
                  <div style="margin-bottom: 10px;"><span style="font-weight: bold;">Violation Type:</span> ${data.violation_type}</div>
                  <div style="margin-bottom: 10px;"><span style="font-weight: bold;">Detention Date:</span> ${data.detention_date}</div>
                  <div style="margin-bottom: 10px;"><span style="font-weight: bold;">Issued On:</span> ${new Date().toLocaleDateString()}</div>
                </div>
              </div>
            `
            }
          </div>
        `
      })
      .join('')

    try {
      doc.open()
      doc.write(`
        <html>
          <head>
            <title>Batch Print</title>
          </head>
          <body>${batchContent}</body>
        </html>
      `)
      doc.close()

      const triggerPrint = () => {
        console.log('Triggering batch print dialog')
        iframe.contentWindow?.focus()
        const success = iframe.contentWindow?.print()
        if (!success) {
          console.error('Batch print dialog failed to open')
          toast.error('Failed to open batch print dialog')
        }
      }

      if (iframe.contentDocument?.readyState === 'complete') {
        triggerPrint()
      } else {
        iframe.onload = () => {
          console.log('Iframe loaded for batch print')
          triggerPrint()
        }
      }
    } catch (error) {
      console.error('Batch printing failed:', error)
      toast.error('Failed to batch print')
    }
  }

  return (
    <div>
      <button
        onClick={handleBatchPrint}
        disabled={!violations || violations.length === 0} // Disable button if no violations
      >
        Batch Print Labels
      </button>
      <div style={{ display: 'none' }}>
        {violations.map((violation, index) => {
          const printData = {
            name: violation.name,
            barcode: violation.id,
            violation_type: violation.violation,
            detention_date: violation.date,
          }
          return (
            <Print
              key={index}
              type="detention"
              data={printData}
              showButton={false}
              printLabel={printLabel}
              ref={el => (printRefs.current[index] = el)}
            />
          )
        })}
      </div>
      <iframe
        ref={iframeRef}
        style={{ display: 'none' }}
        title="Batch Print Frame"
      />
    </div>
  )
}

export default PrintManager
