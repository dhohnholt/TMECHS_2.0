import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { School } from 'lucide-react'
import SoundManager from '../components/SoundManager'
import { useRandomSoundPlayer } from '../hooks/useRandomSoundPlayer'

interface Student {
  id: string
  name: string
  barcode: string
  sound_url?: string
}

interface ClassPeriod {
  id: string
  class_name: string
  period_number: number
}

interface AttendanceRecord {
  student_id: string
  status: 'present' | 'absent'
  notes?: string
  tardy?: boolean
}




export default function DailyAttendance() {
  const [periods, setPeriods] = useState<ClassPeriod[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({})
  const [defaultStatus, setDefaultStatus] = useState<'present' | 'absent'>(() => {
    const saved = localStorage.getItem('defaultAttendanceStatus')
    return saved === 'absent' ? 'absent' : 'present'
  })
  const [scannedStudentId, setScannedStudentId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  })
  const [validDates, setValidDates] = useState<Date[]>([])
  const [isAdvisory, setIsAdvisory] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [lastUpdatedAdvisory, setLastUpdatedAdvisory] = useState<boolean | null>(null)
  const [showSoundManager, setShowSoundManager] = useState(false)
  const [noRecordsWarning, setNoRecordsWarning] = useState(false)
  const playRandomSound = useRandomSoundPlayer()

  const barcodeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    barcodeInputRef.current?.focus()
  }, [])

  useEffect(() => {
    localStorage.setItem('defaultAttendanceStatus', defaultStatus)
    setAttendance(prev => {
      const updated: Record<string, AttendanceRecord> = {}
      for (const id in prev) {
        updated[id] = {
          ...prev[id],
          status: defaultStatus,
        }
      }
      return updated
    })
  }, [defaultStatus])

  useEffect(() => {
    const fetchDates = async () => {
      const { data, error } = await supabase
        .from('school_days')
        .select('date')
        .eq('is_school_day', true)
      if (error) {
        console.error('Error fetching school days:', error)
        return
      }
      if (data) {
        const parsed = data.map(d => {
          const [y, m, d2] = d.date.split('-').map(Number)
          return new Date(y, m - 1, d2)
        })
        setValidDates(parsed)
      }
    }
    fetchDates()
  }, [])

  useEffect(() => {
    const fetchPeriods = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('class_periods')
        .select('id, class_name, period_number')
        .eq('teacher_id', user.id)
        .order('period_number')

      if (error) {
        console.error('Error fetching periods:', error)
        return
      }
      if (data) setPeriods(data)
    }
    fetchPeriods()
  }, [])

  useEffect(() => {
    if (selectedPeriodId) {
      barcodeInputRef.current?.focus()
    }
  }, [selectedPeriodId])

  useEffect(() => {
    const fetchRosterAndLastUpdated = async () => {
      if (!selectedPeriodId) {
        setStudents([])
        setAttendance({})
        setLastUpdated(null)
        setLastUpdatedAdvisory(null)
        setNoRecordsWarning(false)
        return
      }
      const today = selectedDate.toISOString().split('T')[0]
      console.log('Fetching attendance with:', {
        period_id: selectedPeriodId,
        date: today,
        is_advisory: isAdvisory,
      })

      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from('student_class_periods')
        .select('students:fk_student_id(id, name, barcode, sound_url)')
        .eq('period_id', selectedPeriodId)
      if (studentsError) {
        console.error('Error fetching students:', studentsError)
        return
      }

      // Fetch all attendance data for the period and date
      const { data: allAttendanceData, error: allAttendanceError } = await supabase
        .from('daily_class_attendance')
        .select('marked_at, is_advisory, student_id, status, notes, tardy')
        .eq('period_id', selectedPeriodId)
        .eq('date', today)
      if (allAttendanceError) {
        console.error('All attendance query error:', allAttendanceError)
      }
      console.log('All attendance data:', allAttendanceData)

      // Set warning if no records found
      setNoRecordsWarning(!allAttendanceData || allAttendanceData.length === 0)

      // Filter records for the current isAdvisory value
      const filteredAttendanceData = allAttendanceData?.filter(
        record => record.is_advisory === isAdvisory
      ) || []

      // Set lastUpdated based on the latest record for the current isAdvisory
      if (filteredAttendanceData.length > 0) {
        const latestRecord = filteredAttendanceData.reduce((latest, current) =>
          new Date(current.marked_at) > new Date(latest.marked_at) ? current : latest
        )
        setLastUpdated(new Date(latestRecord.marked_at))
        setLastUpdatedAdvisory(latestRecord.is_advisory)
      } else {
        setLastUpdated(null)
        setLastUpdatedAdvisory(isAdvisory)
      }

      // Fetch attendance data with the current is_advisory filter
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('daily_class_attendance')
        .select('student_id, status, notes, tardy, marked_at, is_advisory')
        .eq('period_id', selectedPeriodId)
        .eq('date', today)
        .eq('is_advisory', isAdvisory)
      if (attendanceError) {
        console.error('Attendance query error:', attendanceError)
      }
      console.log('Attendance data (filtered):', attendanceData)

      if (studentsData) {
        const flattened = studentsData.map(row => row.students)
        flattened.sort((a, b) => {
          const lastA = a.name.trim().split(' ').slice(-1)[0].toLowerCase()
          const lastB = b.name.trim().split(' ').slice(-1)[0].toLowerCase()
          return lastA.localeCompare(lastB)
        })
        setStudents(flattened)

        const initialAttendance: Record<string, AttendanceRecord> = {}
        flattened.forEach(s => {
          const match = attendanceData?.find(a => a.student_id === s.id)
          initialAttendance[s.id] = match
            ? {
                student_id: s.id,
                status: match.status,
                notes: match.notes,
                tardy: match.tardy,
              }
            : {
                student_id: s.id,
                status: defaultStatus,
                tardy: false,
              }
        })
        setAttendance(initialAttendance)
      }
    }
    fetchRosterAndLastUpdated()
  }, [selectedPeriodId, selectedDate, defaultStatus, isAdvisory])

  const handleScan = async (barcode: string) => {
    const match = students.find(s => s.barcode === barcode)
    if (!match) return

    playRandomSound()

    setScannedStudentId(match.id)
    setTimeout(() => setScannedStudentId(null), 1500)
    setAttendance(prev => ({
      ...prev,
      [match.id]: {
        ...prev[match.id],
        status: 'present',
      },
    }))
    toast.success(`${match.name} marked present`)
    barcodeInputRef.current?.focus()
  }

  const handleSubmitAttendance = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || !selectedPeriodId) return

    const today = selectedDate.toISOString().split('T')[0]
    const entries = Object.values(attendance).map(record => ({
      student_id: record.student_id,
      period_id: selectedPeriodId,
      status: record.status,
      notes: record.notes || '',
      date: today,
      marked_by: user.id,
      marked_at: new Date().toISOString(),
      tardy: record.tardy || false,
      is_advisory: isAdvisory,
    }))

    const { error } = await supabase
      .from('daily_class_attendance')
      .upsert(entries, {
        onConflict: ['student_id', 'period_id', 'date', 'is_advisory'],
      })

    if (error) {
      toast.error('Failed to submit attendance: ' + error.message, {
        id: 'submit-toast',
      })
    } else {
      toast.success('Attendance submitted successfully', { id: 'submit-toast' })
      // Refresh last updated time
      const { data: updatedAttendance, error: updatedError } = await supabase
        .from('daily_class_attendance')
        .select('marked_at, is_advisory')
        .eq('period_id', selectedPeriodId)
        .eq('date', today)
        .eq('is_advisory', isAdvisory)
      if (updatedError) {
        console.error('Error refreshing attendance:', updatedError)
      }
      if (updatedAttendance && updatedAttendance.length > 0) {
        const latestRecord = updatedAttendance.reduce((latest, current) =>
          new Date(current.marked_at) > new Date(latest.marked_at) ? current : latest
        )
        setLastUpdated(new Date(latestRecord.marked_at))
        setLastUpdatedAdvisory(latestRecord.is_advisory)
        setNoRecordsWarning(false)
      }
    }
  }

  const resetToToday = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    setSelectedDate(today)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 relative">
      {showSoundManager && (
        <SoundManager onClose={() => setShowSoundManager(false)} />
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Daily Attendance</h1>
        <button
          onClick={() => setShowSoundManager(true)}
          className="rounded bg-tmechs-forest px-3 py-1 text-white hover:bg-tmechs-forest/90"
        >
          Manage Sounds
        </button>
      </div>

      {isAdvisory && (
        <div className="flex animate-pulse items-center gap-2 rounded-full bg-tmechs-sage/20 px-3 py-1 text-sm font-medium text-tmechs-forest shadow-inner ring-1 ring-tmechs-forest/40">
          <School className="h-4 w-4" />
          {(() => {
            const p = periods.find(p => p.id === selectedPeriodId)
            return p ? `Advisory for Period ${p.period_number}` : 'Advisory'
          })()}
        </div>
      )}

      <p className="text-sm text-red-500">
        {lastUpdated ? (
          <>
            Attendance last recorded: {lastUpdated.toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </>
        ) : (
          <>
            No attendance recorded yet for this period and date
            {noRecordsWarning && (
              <span className="text-red-500">
                {' '}
                (Attention: No records found for {selectedDate.toLocaleDateString('en-US', { dateStyle: 'medium' })}. Check date or submit new attendance.)
              </span>
            )}
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <label className="text-sm font-medium">Attendance Date:</label>
        <DatePicker
          selected={selectedDate}
          onChange={date => setSelectedDate(date!)}
          dateFormat="MMMM d, yyyy"
          includeDates={validDates}
          highlightDates={validDates}
          className="rounded border border-gray-300 p-2"
        />
        <button
          onClick={resetToToday}
          className="rounded bg-tmechs-sage px-3 py-1 text-white hover:bg-tmechs-sage/90"
        >
          Reset to Today
        </button>

        <label className="text-sm font-medium">Select Period:</label>
        <select
          value={selectedPeriodId}
          onChange={e => setSelectedPeriodId(e.target.value)}
          className="rounded border border-gray-300 p-2"
        >
          <option value="">-- Choose Period --</option>
          {periods.map(p => (
            <option key={p.id} value={p.id}>
              {`Period ${p.period_number} – ${p.class_name}`}
            </option>
          ))}
        </select>

        <label className="text-sm font-medium">Default Status:</label>
        <select
          value={defaultStatus}
          onChange={e =>
            setDefaultStatus(e.target.value as 'present' | 'absent')
          }
          className="rounded border border-gray-300 p-2"
        >
          <option value="present">Present</option>
          <option value="absent">Absent</option>
        </select>

        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={isAdvisory}
            onChange={e => setIsAdvisory(e.target.checked)}
            className="form-checkbox text-tmechs-forest"
          />
          Advisory
        </label>
      </div>

      {selectedPeriodId && (
        <>
          <div className="mt-4">
            <label className="block text-sm font-medium">Scan Barcode</label>
            <input
              ref={barcodeInputRef}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const barcode = (e.target as HTMLInputElement).value.trim()
                  if (barcode.length >= 6) {
                    handleScan(barcode)
                    ;(e.target as HTMLInputElement).value = ''
                  }
                }
              }}
              placeholder="Scan student barcode"
              className="mt-1 w-full rounded border border-gray-300 p-2"
              autoFocus
            />
          </div>

          <div className="mt-6">
            <h2 className="mb-2 text-lg font-semibold">Roster</h2>
            <table className="w-full border border-gray-300 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Present</th>
                  <th className="px-4 py-2 text-left">Tardy</th>
                  <th className="px-4 py-2 text-left">Scan Entry</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                  <th className="px-4 py-2 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr
                    key={s.id}
                    className={`transition-colors duration-700 ${
                      scannedStudentId === s.id ? 'bg-green-100' : ''
                    }`}
                  >
                    <td className="border px-4 py-2">{s.name}</td>
                    <td className="border px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={attendance[s.id]?.status === 'present'}
                        onChange={() => handleScan(s.barcode)}
                      />
                    </td>
                    <td className="border px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={attendance[s.id]?.tardy || false}
                        onChange={e =>
                          setAttendance(prev => ({
                            ...prev,
                            [s.id]: {
                              ...prev[s.id],
                              tardy: e.target.checked,
                            },
                          }))
                        }
                      />
                    </td>
                    <td className="border px-4 py-2 text-center">
                      {attendance[s.id]?.status === 'present' ? s.barcode : ''}
                    </td>
                    <td className="border px-4 py-2">
                      <button
                        onClick={() =>
                          setAttendance(prev => ({
                            ...prev,
                            [s.id]: {
                              ...prev[s.id],
                              status: 'absent',
                            },
                          }))
                        }
                        className={`rounded px-2 py-1 text-white hover:opacity-90 ${
                          attendance[s.id]?.status === 'absent'
                            ? 'bg-red-500 hover:bg-red-600'
                            : 'bg-tmechs-sage hover:bg-tmechs-sage/80'
                        }`}
                      >
                        Mark Absent
                      </button>
                    </td>
                    <td className="border px-4 py-2">
                      <input
                        type="text"
                        className="w-full border border-gray-300 p-1"
                        placeholder="Optional notes"
                        value={attendance[s.id]?.notes || ''}
                        onChange={e =>
                          setAttendance(prev => ({
                            ...prev,
                            [s.id]: {
                              ...prev[s.id],
                              notes: e.target.value,
                            },
                          }))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-2">Total: {students.length}</td>
                  <td className="px-4 py-2">
                    Present:{' '}
                    {
                      Object.values(attendance).filter(
                        a => a.status === 'present'
                      ).length
                    }
                  </td>
                  <td className="px-4 py-2">
                    Tardy:{' '}
                    {Object.values(attendance).filter(a => a.tardy).length}
                  </td>
                  <td className="px-4 py-2">
                    Absent:{' '}
                    {
                      Object.values(attendance).filter(
                        a => a.status === 'absent'
                      ).length
                    }
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>

            <button
              onClick={handleSubmitAttendance}
              className="mt-4 rounded bg-tmechs-forest px-4 py-2 text-white hover:bg-tmechs-forest/90 active:scale-95"
            >
              Submit Attendance
            </button>
          </div>
        </>
      )}
    </div>
  )
}