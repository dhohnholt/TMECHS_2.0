import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { Download } from 'lucide-react'

function toUTCDateOnly(date: Date): string {
  const utc = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  )
  return utc.toISOString().split('T')[0]
}

interface Period {
  id: string
  period_number: number
  class_name: string
  student_count: number
}

interface AttendanceRecord {
  id: string
  date: string
  student_id: string
  period_id: string
  status: 'present' | 'absent'
  tardy: boolean
  is_advisory: boolean
  notes: string | null
  students: { name: string }
  class_periods: { class_name: string; period_number: number }
}

function downloadCSV(data: AttendanceRecord[], filename: string) {
  const headers = [
    'Date',
    'Period',
    'Class',
    'Student',
    'Status',
    'Tardy',
    'Advisory',
    'Notes',
  ]
  const rows = data.map(row => [
    row.date,
    row.class_periods.period_number,
    row.class_periods.class_name,
    row.students.name,
    row.status.charAt(0).toUpperCase() + row.status.slice(1),
    row.tardy ? 'Yes' : 'No',
    row.is_advisory ? 'Yes' : 'No',
    row.notes || '',
  ])
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.click()
  URL.revokeObjectURL(url)
}

export default function TeacherReportPage() {
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [periods, setPeriods] = useState<Period[]>([])
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([])
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([])
  const [availableDates, setAvailableDates] = useState<Date[]>([])
  const [tab, setTab] = useState('log')
  const [sortColumn, setSortColumn] = useState<
    'date' | 'period' | 'student' | ''
  >('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [tardyFilter, setTardyFilter] = useState<'all' | 'tardy' | 'not-tardy'>(
    'all'
  )
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const fetchPeriods = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: periodsData, error: periodsError } = await supabase
        .from('class_periods')
        .select('id, period_number, class_name')
        .eq('teacher_id', user.id)
        .order('period_number')

      if (periodsError) {
        console.error('Error fetching periods:', periodsError)
        return
      }

      if (periodsData) {
        console.log('Raw periods data:', periodsData)

        const periodsWithCounts = await Promise.all(
          periodsData.map(async period => {
            const { count, error: countError } = await supabase
              .from('daily_class_attendance')
              .select('id', { count: 'exact' })
              .eq('period_id', period.id)
              .eq('marked_by', user.id)

            if (countError) {
              console.error(
                `Error counting students for period ${period.id}:`,
                countError
              )
              return {
                id: period.id,
                period_number: period.period_number,
                class_name: period.class_name,
                student_count: 0,
              }
            }

            return {
              id: period.id,
              period_number: period.period_number,
              class_name: period.class_name,
              student_count: count || 0,
            }
          })
        )

        console.log('Processed periods with counts:', periodsWithCounts)
        setPeriods(periodsWithCounts)
        setAvailablePeriods(periodsWithCounts.map(p => p.id))
      } else {
        console.log('No periods data returned')
      }
    }
    fetchPeriods()
  }, [])

  useEffect(() => {
    const fetchAvailableDates = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('daily_class_attendance')
        .select('date')
        .eq('marked_by', user.id)

      if (data) {
        const uniqueDates = [...new Set(data.map(record => record.date))].map(
          dateStr => {
            const date = new Date(dateStr)
            date.setHours(0, 0, 0, 0)
            return date
          }
        )
        setAvailableDates(uniqueDates)
      }
    }
    fetchAvailableDates()
  }, [])

  const fetchAttendance = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    let query = supabase
      .from('daily_class_attendance')
      .select('*, students(name), class_periods(class_name, period_number)')
      .eq('marked_by', user.id)
      .gte('date', toUTCDateOnly(startDate))
      .lte('date', toUTCDateOnly(endDate))
    if (selectedPeriods.length > 0) {
      query = query.in('period_id', selectedPeriods)
    }
    const { data } = await query
    if (data) {
      const sortedData = data.sort((a, b) => {
        return a.class_periods.period_number - b.class_periods.period_number
      })
      setAttendanceRecords(sortedData)
    }
  }

  useEffect(() => {
    fetchAttendance()
  }, [startDate, endDate, selectedPeriods])

  const handleAvailablePeriodToggle = (periodId: string) => {
    setAvailablePeriods(prev =>
      prev.includes(periodId)
        ? prev.filter(id => id !== periodId)
        : [...prev, periodId]
    )
    setSelectedPeriods(prev =>
      prev.filter(id => availablePeriods.includes(id) || periodId !== id)
    )
  }

  const handlePeriodToggle = (periodId: string) => {
    setSelectedPeriods(prev =>
      prev.includes(periodId)
        ? prev.filter(id => id !== periodId)
        : [...prev, periodId]
    )
  }

  const weeklySummary = attendanceRecords
    .filter(record => record.status === 'absent')
    .reduce(
      (acc, row) => {
        const weekKey = `${row.date.slice(0, 4)}-W${Math.ceil(
          new Date(row.date).getDate() / 7
        )}`
        acc[weekKey] = (acc[weekKey] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

  const totalsByStudent = attendanceRecords
    .filter(record => record.status === 'absent')
    .reduce(
      (acc, row) => {
        acc[row.student_id] = acc[row.student_id] || {
          name: row.students.name,
          count: 0,
        }
        acc[row.student_id].count++
        return acc
      },
      {} as Record<string, { name: string; count: number }>
    )

  const summaryMetrics = {
    absent: attendanceRecords.filter(r => r.status === 'absent').length,
    tardy: attendanceRecords.filter(r => r.tardy).length,
  }

  const filteredAbsences = attendanceRecords
    .filter(record => record.status === 'absent')
    .filter(record => {
      if (tardyFilter === 'tardy') return record.tardy
      if (tardyFilter === 'not-tardy') return !record.tardy
      return true
    })
    .sort((a, b) => {
      if (!sortColumn) return 0
      const direction = sortDirection === 'asc' ? 1 : -1
      if (sortColumn === 'date') {
        return (
          direction * (new Date(a.date).getTime() - new Date(b.date).getTime())
        )
      }
      if (sortColumn === 'period') {
        return (
          direction *
          (a.class_periods.period_number - b.class_periods.period_number)
        )
      }
      if (sortColumn === 'student') {
        return direction * a.students.name.localeCompare(b.students.name)
      }
      return 0
    })

  const handleSort = (column: 'date' | 'period' | 'student') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl bg-gray-50 p-4 sm:p-6 lg:p-8">
      <h1 className="mb-6 text-3xl font-bold text-gray-900 sm:mb-8 sm:text-4xl">
        Attendance Reports
      </h1>

      {/* Control Panel */}
      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm sm:mb-8 sm:p-6">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-start sm:space-x-6 sm:space-y-0">
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <DatePicker
                selected={startDate}
                onChange={date => setStartDate(date!)}
                includeDates={availableDates}
                dayClassName={date => {
                  const normalizedDate = new Date(date)
                  normalizedDate.setHours(0, 0, 0, 0)
                  const isAvailable = availableDates.some(
                    d => d.getTime() === normalizedDate.getTime()
                  )
                  return isAvailable
                    ? 'react-datepicker__day--available'
                    : undefined
                }}
                className="w-full rounded-lg border border-gray-200 p-2 text-sm shadow-sm focus:border-tmechs-forest focus:ring-tmechs-forest sm:w-40"
                placeholderText="Select start date"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                End Date
              </label>
              <DatePicker
                selected={endDate}
                onChange={date => setEndDate(date!)}
                includeDates={availableDates}
                dayClassName={date => {
                  const normalizedDate = new Date(date)
                  normalizedDate.setHours(0, 0, 0, 0)
                  const isAvailable = availableDates.some(
                    d => d.getTime() === normalizedDate.getTime()
                  )
                  return isAvailable
                    ? 'react-datepicker__day--available'
                    : undefined
                }}
                className="w-full rounded-lg border border-gray-200 p-2 text-sm shadow-sm focus:border-tmechs-forest focus:ring-tmechs-forest sm:w-40"
                placeholderText="Select end date"
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-4">
              <div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full rounded-lg bg-tmechs-light px-4 py-2 text-sm font-medium text-tmechs-forest shadow-sm transition-all hover:bg-tmechs-sage/90 active:scale-95 sm:w-auto"
                >
                  Adjust Available Periods
                </button>
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Filter by Period
                </label>
                <div className="flex flex-wrap gap-3">
                  {periods
                    .filter(p => availablePeriods.includes(p.id))
                    .map(p => (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPeriods.includes(p.id)}
                          onChange={() => handlePeriodToggle(p.id)}
                          className="h-4 w-4 rounded border-gray-300 text-tmechs-forest focus:ring-tmechs-forest"
                        />
                        <span className="text-gray-700">{`Period ${p.period_number}`}</span>
                      </label>
                    ))}
                  {availablePeriods.length === 0 && (
                    <p className="text-sm text-gray-500">
                      Select available periods in the modal
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Available Periods to Filter */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300">
          <div className="w-full max-w-md scale-100 transform rounded-xl bg-white p-6 shadow-xl transition-all duration-300 sm:max-w-lg sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 sm:text-2xl">
                Available Periods to Filter
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 transition-colors hover:text-gray-700"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="mb-6 flex flex-wrap gap-4">
              {periods.map(p => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 text-sm sm:text-base"
                >
                  <input
                    type="checkbox"
                    checked={availablePeriods.includes(p.id)}
                    onChange={() => handleAvailablePeriodToggle(p.id)}
                    className="h-4 w-4 rounded border-gray-300 text-tmechs-forest focus:ring-tmechs-forest sm:h-5 sm:w-5"
                  />
                  <span className="text-gray-700">{`Period ${p.period_number} (${p.student_count} attendance records)`}</span>
                </label>
              ))}
              {periods.length === 0 && (
                <p className="text-sm text-gray-500">No periods found</p>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg bg-tmechs-forest px-6 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-tmechs-forest/90 active:scale-95 sm:text-base"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:gap-6">
        <div className="flex-1 rounded-xl bg-white p-4 shadow-sm transition-all hover:scale-105 hover:shadow-md sm:p-6">
          <h3 className="mb-2 text-sm font-medium text-gray-600">Absent</h3>
          <p className="text-3xl font-bold text-red-600 sm:text-4xl">
            {summaryMetrics.absent}
          </p>
        </div>
        <div className="flex-1 rounded-xl bg-white p-4 shadow-sm transition-all hover:scale-105 hover:shadow-md sm:p-6">
          <h3 className="mb-2 text-sm font-medium text-gray-600">Tardy</h3>
          <p className="text-3xl font-bold text-yellow-600 sm:text-4xl">
            {summaryMetrics.tardy}
          </p>
        </div>
      </div>

      {/* Tabs and Content */}
      <div className="rounded-xl bg-white shadow-sm">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex border-b border-gray-200 px-4 sm:px-6">
            <TabsTrigger
              value="log"
              className={`px-4 py-3 text-sm font-medium transition-colors sm:text-base ${
                tab === 'log'
                  ? 'border-b-2 border-tmechs-forest font-semibold text-tmechs-forest'
                  : 'text-gray-600 hover:text-tmechs-forest'
              }`}
            >
              Attendance Log
            </TabsTrigger>
            <TabsTrigger
              value="weekly"
              className={`px-4 py-3 text-sm font-medium transition-colors sm:text-base ${
                tab === 'weekly'
                  ? 'border-b-2 border-tmechs-forest font-semibold text-tmechs-forest'
                  : 'text-gray-600 hover:text-tmechs-forest'
              }`}
            >
              Weekly Absence Summary
            </TabsTrigger>
            <TabsTrigger
              value="totals"
              className={`px-4 py-3 text-sm font-medium transition-colors sm:text-base ${
                tab === 'totals'
                  ? 'border-b-2 border-tmechs-forest font-semibold text-tmechs-forest'
                  : 'text-gray-600 hover:text-tmechs-forest'
              }`}
            >
              Absences by Student
            </TabsTrigger>
            <TabsTrigger
              value="details"
              className={`px-4 py-3 text-sm font-medium transition-colors sm:text-base ${
                tab === 'details'
                  ? 'border-b-2 border-tmechs-forest font-semibold text-tmechs-forest'
                  : 'text-gray-600 hover:text-tmechs-forest'
              }`}
            >
              Absence Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="log" className="p-4 sm:p-6">
            <div className="mb-4 flex justify-end">
              <button
                onClick={() =>
                  downloadCSV(
                    attendanceRecords,
                    `attendance_log_${toUTCDateOnly(startDate)}_to_${toUTCDateOnly(endDate)}.csv`
                  )
                }
                className="flex items-center gap-2 rounded-lg bg-tmechs-forest px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-tmechs-forest/90 active:scale-95 sm:text-base"
              >
                <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                Export as CSV
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg shadow-sm">
              <table className="w-full border-collapse text-sm sm:text-base">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left font-semibold text-gray-700 sm:p-4">
                      Date
                    </th>
                    <th className="p-3 text-left font-semibold text-gray-700 sm:p-4">
                      Period
                    </th>
                    <th className="p-3 text-left font-semibold text-gray-700 sm:p-4">
                      Class
                    </th>
                    <th className="p-3 text-left font-semibold text-gray-700 sm:p-4">
                      Student
                    </th>
                    <th className="p-3 text-left font-semibold text-gray-700 sm:p-4">
                      Status
                    </th>
                    <th className="p-3 text-left font-semibold text-gray-700 sm:p-4">
                      Tardy
                    </th>
                    <th className="p-3 text-left font-semibold text-gray-700 sm:p-4">
                      Advisory
                    </th>
                    <th className="p-3 text-left font-semibold text-gray-700 sm:p-4">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((a, i) => (
                    <tr
                      key={i}
                      className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} transition-colors hover:bg-gray-100`}
                    >
                      <td className="p-3 sm:p-4">{a.date}</td>
                      <td className="p-3 sm:p-4">
                        {a.class_periods.period_number}
                      </td>
                      <td className="p-3 sm:p-4">
                        {a.class_periods.class_name}
                      </td>
                      <td className="p-3 sm:p-4">{a.students?.name}</td>
                      <td className="p-3 sm:p-4">
                        <span
                          className={`inline-block rounded px-2 py-1 text-xs font-medium sm:text-sm ${
                            a.status === 'present'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4">
                        {a.tardy ? (
                          <span className="inline-block rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 sm:text-sm">
                            Yes
                          </span>
                        ) : (
                          'No'
                        )}
                      </td>
                      <td className="p-3 sm:p-4">
                        {a.is_advisory ? (
                          <span className="inline-flex items-center gap-1 rounded bg-tmechs-sage/20 px-2 py-1 text-xs font-medium text-tmechs-forest sm:text-sm">
                            Yes
                          </span>
                        ) : (
                          'No'
                        )}
                      </td>
                      <td className="p-3 sm:p-4">{a.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="weekly" className="p-4 sm:p-6">
            <div className="overflow-x-auto rounded-lg shadow-sm">
              <table className="w-full border-collapse text-sm sm:text-base">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left font-semibold text-gray-700 sm:p-4">
                      Week
                    </th>
                    <th className="p-3 text-left font-semibold text-gray-700 sm:p-4">
                      Absences
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(weeklySummary).map(([week, count], i) => (
                    <tr
                      key={week}
                      className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} transition-colors hover:bg-gray-100`}
                    >
                      <td className="p-3 sm:p-4">{week}</td>
                      <td className="p-3 sm:p-4">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="totals" className="p-4 sm:p-6">
            <div className="overflow-x-auto rounded-lg shadow-sm">
              <table className="w-full border-collapse text-sm sm:text-base">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left font-semibold text-gray-700 sm:p-4">
                      Student
                    </th>
                    <th className="p-3 text-left font-semibold text-gray-700 sm:p-4">
                      Total Absences
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(totalsByStudent).map(
                    ([id, { name, count }], i) => (
                      <tr
                        key={id}
                        className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} transition-colors hover:bg-gray-100`}
                      >
                        <td className="p-3 sm:p-4">{name}</td>
                        <td className="p-3 sm:p-4">{count}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="details" className="p-4 sm:p-6">
            <div className="mb-4 flex justify-end">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">
                  Tardy Filter:
                </label>
                <select
                  className="rounded-lg border border-gray-200 p-2 text-sm shadow-sm focus:border-tmechs-forest focus:ring-tmechs-forest sm:text-base"
                  value={tardyFilter}
                  onChange={e =>
                    setTardyFilter(
                      e.target.value as 'all' | 'tardy' | 'not-tardy'
                    )
                  }
                >
                  <option value="all">All Absences</option>
                  <option value="tardy">Tardy Only</option>
                  <option value="not-tardy">Not Tardy</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg shadow-sm">
              <table className="w-full border-collapse text-sm sm:text-base">
                <thead className="bg-gray-100">
                  <tr>
                    <th
                      className="cursor-pointer p-3 text-left font-semibold text-gray-700 sm:p-4"
                      onClick={() => handleSort('date')}
                    >
                      Date{' '}
                      {sortColumn === 'date' &&
                        (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="cursor-pointer p-3 text-left font-semibold text-gray-700 sm:p-4"
                      onClick={() => handleSort('period')}
                    >
                      Period{' '}
                      {sortColumn === 'period' &&
                        (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="p-3 text-left font-semibold text-gray-700 sm:p-4">
                      Class
                    </th>
                    <th
                      className="cursor-pointer p-3 text-left font-semibold text-gray-700 sm:p-4"
                      onClick={() => handleSort('student')}
                    >
                      Student{' '}
                      {sortColumn === 'student' &&
                        (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="p-3 text-left font-semibold text-gray-700 sm:p-4">
                      Tardy
                    </th>
                    <th className="p-3 text-left font-semibold text-gray-700 sm:p-4">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAbsences.map((a, i) => (
                    <tr
                      key={i}
                      className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} transition-colors hover:bg-gray-100`}
                    >
                      <td className="p-3 sm:p-4">{a.date}</td>
                      <td className="p-3 sm:p-4">
                        {a.class_periods.period_number}
                      </td>
                      <td className="p-3 sm:p-4">
                        {a.class_periods.class_name}
                      </td>
                      <td className="p-3 sm:p-4">{a.students?.name}</td>
                      <td className="p-3 sm:p-4">
                        {a.tardy ? (
                          <span className="inline-block rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 sm:text-sm">
                            Yes
                          </span>
                        ) : (
                          'No'
                        )}
                      </td>
                      <td className="p-3 sm:p-4">{a.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
