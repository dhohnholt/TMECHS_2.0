import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Papa from 'papaparse'
import { toast } from 'react-hot-toast'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import PeriodRosterTab from '@/components/PeriodRosterTab'
import SoundUploader from '@/components/SoundUploader'
import { useMediaQuery } from 'react-responsive'
import { Toaster } from 'react-hot-toast'

export default function ClassManagerPage() {
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [periods, setPeriods] = useState<
    { id?: string; period_number: number; class_name: string }[]
  >([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [previewRows, setPreviewRows] = useState<
    { barcode: string; name?: string; student_id?: string; found: boolean }[]
  >([])
  const [manualBarcode, setManualBarcode] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const isMobile = useMediaQuery({ maxWidth: 768 })
  const [activeTab, setActiveTab] = useState('setup')
  const [isScheduleBuilderCollapsed, setIsScheduleBuilderCollapsed] = useState(
    localStorage.getItem('scheduleBuilderCollapsed') === 'true'
  )

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) setTeacherId(user.id)
    }
    getUser()
  }, [])

  const fetchPeriods = async () => {
    if (!teacherId) return
    const { data, error } = await supabase
      .from('class_periods')
      .select('id, period_number, class_name')
      .eq('teacher_id', teacherId)
      .order('period_number')
    if (error) {
      console.error('Error fetching periods:', error)
      toast.error('Error fetching schedule: ' + error.message)
    } else {
      // Initialize default periods 1-8 if none exist
      if (!data || data.length === 0) {
        setPeriods([
          { period_number: 1, class_name: '' },
          { period_number: 2, class_name: '' },
          { period_number: 3, class_name: '' },
          { period_number: 4, class_name: '' },
          { period_number: 5, class_name: '' },
          { period_number: 6, class_name: '' },
          { period_number: 7, class_name: '' },
          { period_number: 8, class_name: '' },
        ])
      } else {
        setPeriods(data)
      }
    }
  }

  useEffect(() => {
    if (teacherId) fetchPeriods()
  }, [teacherId])

  const addPeriod = () => {
    setPeriods(prev => {
      const nextPeriodNumber =
        prev.length > 0 ? Math.max(...prev.map(p => p.period_number)) + 1 : 1
      if (prev.some(p => p.period_number === nextPeriodNumber)) {
        toast.error(`Period ${nextPeriodNumber} already exists`)
        return prev
      }
      return [...prev, { period_number: nextPeriodNumber, class_name: '' }]
    })
  }

  const removePeriod = (index: number) => {
    setPeriods(prev => prev.filter((_, i) => i !== index))
  }

  const handleCsvUpload = async () => {
    if (!csvFile) return
    Papa.parse(csvFile, {
      header: true,
      complete: async results => {
        const rows = results.data as { barcode?: string }[]
        const preview = []
        for (const row of rows) {
          const barcode = row.barcode?.trim()
          if (!barcode) continue
          const { data } = await supabase
            .from('students')
            .select('id, name')
            .eq('barcode', barcode)
            .single()
          preview.push({
            barcode,
            name: data?.name || 'Not Found',
            student_id: data?.id,
            found: !!data,
          })
        }
        setPreviewRows(preview)
        toast.success('File processed. Review and confirm.')
      },
    })
  }

  const confirmUpload = async () => {
    const confirmed = previewRows.filter(r => r.found && r.student_id)
    let inserted = 0
    for (const row of confirmed) {
      const { error } = await supabase.from('student_class_periods').upsert(
        {
          student_id: row.student_id,
          period_id: selectedPeriod,
        },
        {
          onConflict: ['student_id', 'period_id'],
        }
      )
      if (!error) inserted++
    }
    toast.success(
      `${inserted} student${inserted !== 1 ? 's' : ''} added to roster`
    )
    setPreviewRows([])
  }

  const handleManualAdd = async () => {
    const barcode = manualBarcode.trim()
    if (!barcode) return
    const { data, error } = await supabase
      .from('students')
      .select('id, name')
      .eq('barcode', barcode)
      .single()
    if (error || !data) {
      toast.error('Student not found with that barcode.')
    } else if (previewRows.some(r => r.barcode === barcode)) {
      toast.error('This student is already in the list.')
    } else {
      setPreviewRows(prev => [
        ...prev,
        { barcode, name: data.name, student_id: data.id, found: true },
      ])
      toast.success('Student added to preview.')
      setManualBarcode('')
    }
  }

  const toggleScheduleBuilder = () => {
    setIsScheduleBuilderCollapsed(prev => {
      const newState = !prev
      localStorage.setItem('scheduleBuilderCollapsed', newState.toString())
      return newState
    })
  }

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="mb-6 text-2xl font-bold">Class Manager</h1>

      {isMobile && (
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Select Tab</label>
          <select
            value={activeTab}
            onChange={e => setActiveTab(e.target.value)}
            className="w-full rounded border border-gray-300 p-2"
          >
            <option value="setup">Setup & Upload</option>
            {periods
              .filter(p => p.id)
              .map(p => (
                <option key={p.id} value={`period-${p.period_number}`}>
                  Period {p.period_number}
                </option>
              ))}
          </select>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {!isMobile && (
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="setup">Setup & Upload</TabsTrigger>
            {periods
              .filter(p => p.id)
              .map(p => (
                <TabsTrigger key={p.id} value={`period-${p.period_number}`}>
                  Period {p.period_number}
                </TabsTrigger>
              ))}
          </TabsList>
        )}

        <TabsContent value="setup">
          <div className="mb-6 rounded bg-white p-4 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Define Your Schedule</h2>
              <button
                onClick={toggleScheduleBuilder}
                className="rounded bg-tmechs-light px-3 py-1 text-tmechs-forest hover:bg-tmechs-sage active:scale-95"
              >
                {isScheduleBuilderCollapsed ? 'Expand' : 'Collapse'}
              </button>
            </div>
            {!isScheduleBuilderCollapsed && (
              <>
                {periods.length === 0 ? (
                  <p className="mb-4 text-gray-500">
                    No periods defined. Click below to add one.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {periods.map((p, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="block text-sm font-medium">{`Period ${p.period_number}`}</label>
                          <input
                            type="text"
                            value={p.class_name || ''}
                            onChange={e => {
                              const updated = [...periods]
                              updated[index].class_name = e.target.value
                              setPeriods(updated)
                            }}
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                            placeholder="e.g., GOVT 2306"
                          />
                        </div>
                        <span className="group relative">
                          <button
                            onClick={() => removePeriod(index)}
                            className="mt-6 text-red-500 hover:text-red-700"
                          >
                            X
                          </button>
                          <span className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-tmechs-forest px-2 py-1 text-xs text-white group-hover:block">
                            Remove period from schedule
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 space-x-2">
                  <button
                    onClick={addPeriod}
                    className="rounded bg-tmechs-light px-4 py-2 text-tmechs-forest hover:bg-tmechs-sage active:scale-95"
                  >
                    Add Period
                  </button>
                  <button
                    onClick={async () => {
                      if (!teacherId) {
                        toast.error('User not authenticated')
                        return
                      }
                      const inserts = periods
                        .filter(p => p.class_name.trim() !== '')
                        .map(p => ({
                          teacher_id: teacherId,
                          period_number: p.period_number,
                          class_name: p.class_name.trim(),
                        }))
                      if (inserts.length === 0) {
                        toast.error(
                          'Please add at least one period with a class name'
                        )
                        return
                      }
                      setIsSaving(true)
                      const { error } = await supabase
                        .from('class_periods')
                        .upsert(inserts, {
                          onConflict: ['teacher_id', 'period_number'],
                        })
                        .select()
                      setIsSaving(false)
                      if (error) {
                        console.error('Upsert error:', error)
                        toast.error('Failed to save schedule: ' + error.message)
                      } else {
                        toast.success('Schedule saved')
                        await fetchPeriods()
                      }
                    }}
                    disabled={isSaving}
                    className="rounded bg-tmechs-forest px-4 py-2 text-white hover:bg-tmechs-forest/90 active:scale-95 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Schedule'}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="mb-6 rounded bg-white p-4 shadow">
            <h2 className="mb-4 text-xl font-semibold">Upload Students</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium">Select Period</label>
              <select
                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                value={selectedPeriod}
                onChange={e => setSelectedPeriod(e.target.value)}
              >
                <option value="">-- Choose Period --</option>
                {periods
                  .filter(p => p.id)
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {`Period ${p.period_number} – ${p.class_name}`}
                    </option>
                  ))}
              </select>
            </div>

            <div
              onDrop={e => {
                e.preventDefault()
                const file = e.dataTransfer.files[0]
                if (file) {
                  setCsvFile(file)
                  toast.success(`File "${file.name}" ready to upload.`)
                }
              }}
              onDragOver={e => e.preventDefault()}
              className="mb-4 rounded border-2 border-dashed border-gray-400 p-6 text-center text-sm text-gray-600"
            >
              Drag & drop your CSV file here or use the upload input below.
            </div>

            <input
              type="file"
              accept=".csv"
              onChange={e => setCsvFile(e.target.files?.[0] || null)}
              className="mb-2"
            />
            <p className="mb-4 text-xs text-gray-500">
              Upload a CSV file with a single column named{' '}
              <code className="font-mono text-tmechs-forest">barcode</code>.
            </p>

            <div
              onClick={() => {
                console.log('Upload button clicked', {
                  selectedPeriod,
                  csvFile,
                })
                if (!selectedPeriod) {
                  toast('Please choose a period', {
                    style: {
                      background: '#2f4f4f',
                      color: '#fff',
                      borderRadius: '0.375rem',
                      padding: '8px 16px',
                    },
                  })
                } else if (!csvFile) {
                  toast('Please select a CSV file', {
                    style: {
                      background: '#2f4f4f',
                      color: '#fff',
                      borderRadius: '0.375rem',
                      padding: '8px 16px',
                    },
                  })
                }
              }}
            >
              <button
                onClick={handleCsvUpload}
                disabled={!csvFile || !selectedPeriod}
                className="rounded bg-tmechs-forest px-4 py-2 text-white active:scale-95 disabled:opacity-50"
                title={!selectedPeriod ? 'Please choose period' : ''}
              >
                Upload Roster
              </button>
            </div>

            {previewRows.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-2 text-lg font-semibold">Preview</h3>
                <p className="mb-4 text-sm text-gray-600">
                  {previewRows.filter(r => r.found).length} student
                  {previewRows.filter(r => r.found).length !== 1
                    ? 's'
                    : ''}{' '}
                  will be added
                </p>
                <table className="min-w-full rounded border border-gray-300 text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Barcode</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={row.found ? 'bg-white' : 'bg-red-50'}
                      >
                        <td className="px-4 py-2">{row.name}</td>
                        <td className="px-4 py-2">{row.barcode}</td>
                        <td className="px-4 py-2">
                          {row.found ? '✅ Found' : '❌ Not Found'}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() =>
                              setPreviewRows(prev =>
                                prev.filter(r => r.barcode !== row.barcode)
                              )
                            }
                            className="text-xs text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-6">
                  <h4 className="mb-1 text-sm font-medium">
                    Add barcode manually
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter barcode"
                      value={manualBarcode}
                      onChange={e => setManualBarcode(e.target.value)}
                      className="flex-1 rounded border border-gray-300 p-2 text-sm"
                    />
                    <button
                      onClick={handleManualAdd}
                      className="rounded bg-tmechs-forest px-4 py-2 text-white active:scale-95"
                    >
                      Add
                    </button>
                  </div>
                </div>
                <button
                  onClick={confirmUpload}
                  className="mt-6 rounded bg-tmechs-forest px-4 py-2 text-white active:scale-95 disabled:opacity-50"
                  disabled={
                    !selectedPeriod ||
                    previewRows.filter(r => r.found).length === 0
                  }
                >
                  Add Students to Roster
                </button>
                <button
                  onClick={() => {
                    setPreviewRows([])
                    setCsvFile(null)
                    setManualBarcode('')
                  }}
                  className="mt-2 rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300 active:scale-95"
                >
                  Cancel
                </button>
              </div>
            )}
            <div className="mt-10 rounded border border-yellow-300 bg-yellow-50 p-4 shadow">
              <h4 className="mb-2 text-lg font-semibold">
                📌 How to Upload Your Roster
              </h4>
              <p className="mb-2 text-sm text-gray-700">
                To upload students into each class period, create a CSV file
                with a single column named{' '}
                <code className="font-mono text-tmechs-forest">barcode</code>.
                Paste your student ID numbers under that column.
              </p>
              <p className="mb-2 text-sm text-gray-700">
                Each student ID must already exist in the system. If a barcode
                is not found, you’ll see it highlighted in red in the preview.
              </p>
              <a
                href="/mnt/data/sample_student_roster.csv"
                download
                className="mt-2 inline-block font-medium text-tmechs-forest underline hover:text-tmechs-forest/80"
              >
                ⬇ Download Sample CSV
              </a>
            </div>
          </div>

          <div className="mt-6 rounded bg-white p-4 shadow">
            <h2 className="mb-4 text-xl font-semibold">Upload Custom Sounds</h2>
            <SoundUploader />
          </div>
        </TabsContent>

        {periods
          .filter(p => p.id)
          .map(p => (
            <TabsContent key={p.id} value={`period-${p.period_number}`}>
              <PeriodRosterTab
                periodId={p.id}
                periodNumber={p.period_number}
                className={p.class_name}
              />
            </TabsContent>
          ))}
      </Tabs>
    </div>
  )
}
