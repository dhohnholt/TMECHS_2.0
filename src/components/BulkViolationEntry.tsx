import React, { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Upload, Download, AlertCircle, Save } from 'lucide-react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

interface BulkViolation {
  barcode: string
  violation_type: string
  detention_date: string
}

export default function BulkViolationEntry() {
  const [violations, setViolations] = useState<BulkViolation[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const fileExt = file.name.split('.').pop()?.toLowerCase()

    if (fileExt === 'csv') {
      Papa.parse(file, {
        complete: results => {
          const violations = results.data.slice(1).map((row: any) => ({
            barcode: row[0],
            violation_type: row[1],
            detention_date: row[2],
          }))
          setViolations(violations)
          toast.success(`Loaded ${violations.length} violations`)
        },
        header: true,
      })
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      const reader = new FileReader()
      reader.onload = e => {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const violations = XLSX.utils.sheet_to_json(sheet)
        setViolations(violations as BulkViolation[])
        toast.success(`Loaded ${violations.length} violations`)
      }
      reader.readAsBinaryString(file)
    }
  }

  const downloadTemplate = () => {
    const template = [
      ['barcode', 'violation_type', 'detention_date'],
      ['12345', 'No ID', '2025-04-01'],
      ['67890', 'Tardy', '2025-04-01'],
    ]

    const csv = Papa.unparse(template)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'violation_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleSubmit = async () => {
    if (violations.length === 0) {
      toast.error('No violations to submit')
      return
    }

    setIsSubmitting(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Process violations in batches of 10
      const batchSize = 10
      for (let i = 0; i < violations.length; i += batchSize) {
        const batch = violations.slice(i, i + batchSize)

        // Get student IDs for the batch
        const { data: students, error: studentError } = await supabase
          .from('students')
          .select('id, barcode')
          .in(
            'barcode',
            batch.map(v => v.barcode)
          )

        if (studentError) throw studentError

        // Create violation records
        const violationRecords = batch
          .map(violation => {
            const student = students?.find(s => s.barcode === violation.barcode)
            if (!student) return null

            return {
              student_id: student.id,
              violation_type: violation.violation_type,
              detention_date: violation.detention_date,
              teacher_id: user.id,
              status: 'pending',
            }
          })
          .filter(Boolean)

        const { error: insertError } = await supabase
          .from('violations')
          .insert(violationRecords)

        if (insertError) throw insertError
      }

      toast.success('All violations recorded successfully')
      setViolations([])
    } catch (error) {
      console.error('Error submitting violations:', error)
      toast.error('Failed to record violations')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 text-xl font-bold text-tmechs-dark">
        Bulk Violation Entry
      </h2>

      <div className="mb-6 flex space-x-4">
        <label className="flex cursor-pointer items-center rounded-md bg-tmechs-forest px-4 py-2 text-white hover:bg-tmechs-forest/90">
          <Upload className="mr-2 h-5 w-5" />
          Upload File
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>
        <button
          onClick={downloadTemplate}
          className="flex items-center rounded-md bg-tmechs-sage/20 px-4 py-2 text-tmechs-forest hover:bg-tmechs-sage/30"
        >
          <Download className="mr-2 h-5 w-5" />
          Download Template
        </button>
      </div>

      {violations.length > 0 && (
        <>
          <div className="mb-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Barcode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Violation Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Detention Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {violations.map((violation, index) => (
                  <tr key={index}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {violation.barcode}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {violation.violation_type}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {violation.detention_date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-tmechs-gray flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              {violations.length} violations ready to submit
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex items-center rounded-md bg-tmechs-forest px-4 py-2 text-white hover:bg-tmechs-forest/90 ${
                isSubmitting ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              <Save className="mr-2 h-5 w-5" />
              {isSubmitting ? 'Submitting...' : 'Submit All'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
