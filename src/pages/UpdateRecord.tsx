import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import { toast } from 'react-hot-toast'
import {
  ArrowLeft,
  AlertCircle,
  Search,
  Calendar,
  Loader2,
  User,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import 'react-datepicker/dist/react-datepicker.css'

interface Student {
  id: string
  name: string
  barcode: string
  email?: string
}

interface AttendanceRecord {
  id: string
  violation_id: string
  detention_date: string
  status: string
  reason: string | null
  marked_by: string
  new_reason?: string | null
  new_detention_date?: string | null
  new_status?: string | null
  new_violation_type?: string | null
  show_custom_violation?: boolean
  violations: {
    violation_type: string
  }
}

interface AbsenceRecord {
  id: string
  attendance_id: string
  violation_id: string
  student_id: string
  detention_date: string
  absence_date: string
  marked_by: string
  reason: string
  new_reason?: string | null
  new_absence_date?: string | null
  violations: {
    violation_type: string
  }
}

const toUTCISOStringFromDateOnly = (date: Date) => {
  const mountainTime = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0
  )
  const offsetMs = mountainTime.getTimezoneOffset() * 60000
  return new Date(mountainTime.getTime() - offsetMs).toISOString().split('T')[0]
}

const reasonOptions = [
  'unexcused',
  'excused',
  'medical',
  'family emergency',
  'school activity',
]

const statusOptions = ['pending', 'reassigned', 'absent', 'completed']

const DEFAULT_VIOLATIONS = [
  { id: 'dress_code', label: 'Dress Code Violation' },
  { id: 'no_id', label: 'No Id or ID not Displayed' },
  { id: 'phone_use', label: 'Improper Phone Use' },
  { id: 'tardy', label: 'Tardy' },
  { id: 'disrespectful', label: 'Disrespectful Behavior' },
]

export default function RescheduleAttendance() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Student[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([])
  const [absenceRecords, setAbsenceRecords] = useState<AbsenceRecord[]>([])
  const [availableDates, setAvailableDates] = useState<Date[]>([])
  const [bookedDates, setBookedDates] = useState<Date[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAttendanceRecords, setShowAttendanceRecords] = useState(true)
  const [showAbsenceRecords, setShowAbsenceRecords] = useState(true)
  const [userRole, setUserRole] = useState<'admin' | 'teacher' | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [modal, setModal] = useState<{
    isOpen: boolean
    message: string
    onConfirm: () => void
  }>({ isOpen: false, message: '', onConfirm: () => {} })
  const searchTimeout = useRef<number | null>(null)

  // Fetch user role and ID
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          setUserId(user.id)
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()
          setUserRole(profile?.role || 'teacher')
        }
      } catch (error) {
        console.error('Error fetching user:', error)
        toast.error('Failed to load user data')
      }
    }
    fetchUser()
  }, [])

  const searchStudents = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, barcode, email')
        .or(`name.ilike.%${query}%,barcode.ilike.%${query}%`)
        .order('name')
        .limit(5)

      if (error) throw error
      setSearchResults(data || [])
      setShowSearchResults(true)
    } catch (error) {
      console.error('Error searching students:', error)
      toast.error('Failed to search students')
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    if (searchQuery.trim()) {
      searchTimeout.current = window.setTimeout(() => {
        searchStudents(searchQuery)
      }, 300)
    } else {
      setSearchResults([])
      setShowSearchResults(false)
    }

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current)
      }
    }
  }, [searchQuery])

  const selectStudent = async (student: Student) => {
    setSelectedStudent(student)
    setSearchQuery('')
    setShowSearchResults(false)
    await fetchAttendanceRecords(student.id)
    await fetchAbsenceRecords(student.id)
    await fetchBookedDates(student.id)
    await fetchAvailableDates()
  }

  const fetchAttendanceRecords = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(
          `
          id,
          violation_id,
          detention_date,
          status,
          reason,
          marked_by,
          violations:violation_id (violation_type)
        `
        )
        .eq('student_id', studentId)
        .in('status', ['pending', 'reassigned', 'absent', 'completed'])

      if (error) throw error

      const records = (data || []).map(record => ({
        ...record,
        new_reason: record.reason,
        new_status: record.status,
        new_violation_type: record.violations.violation_type,
        show_custom_violation: !DEFAULT_VIOLATIONS.some(
          v => v.id === record.violations.violation_type
        ),
      }))
      setAttendanceRecords(records)
    } catch (error) {
      console.error('Error fetching attendance records:', error)
      toast.error('Failed to load attendance records')
      setAttendanceRecords([])
    }
  }

  const fetchAbsenceRecords = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('absence_log')
        .select(
          `
          id,
          attendance_id,
          violation_id,
          student_id,
          detention_date,
          absence_date,
          marked_by,
          reason,
          violations:violation_id (violation_type)
        `
        )
        .eq('student_id', studentId)

      if (error) throw error

      const records = (data || []).map(record => ({
        ...record,
        new_reason: record.reason,
        new_absence_date: record.absence_date,
      }))
      setAbsenceRecords(records)
    } catch (error) {
      console.error('Error fetching absence records:', error)
      toast.error('Failed to load absence records')
      setAbsenceRecords([])
    }
  }

  const fetchBookedDates = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('detention_date')
        .eq('student_id', studentId)
        .in('status', ['pending', 'reassigned', 'absent'])

      if (error) throw error

      const dates = (data || [])
        .map(record => new Date(record.detention_date))
        .filter(d => !isNaN(d.getTime()))

      setBookedDates(dates)
    } catch (error) {
      console.error('Error fetching booked dates:', error)
      setBookedDates([])
    }
  }

  const fetchAvailableDates = async () => {
    try {
      const today = toUTCISOStringFromDateOnly(new Date())
      const { data, error } = await supabase
        .from('detention_slots')
        .select('date, current_count, capacity')
        .gt('date', today)
        .order('date')

      if (error) throw error

      const dates = data
        .filter(slot => slot.current_count < slot.capacity)
        .map(slot => {
          const parts = slot.date.split('-')
          return new Date(
            parseInt(parts[0]),
            parseInt(parts[1]) - 1,
            parseInt(parts[2])
          )
        })

      setAvailableDates(dates)
    } catch (error) {
      console.error('Error fetching available dates:', error)
      toast.error('Failed to load available dates')
      setAvailableDates([])
    }
  }

  const handleDateChange = (recordId: string, date: Date | null) => {
    setAttendanceRecords(prev =>
      prev.map(record =>
        record.id === recordId
          ? {
              ...record,
              new_detention_date: date
                ? toUTCISOStringFromDateOnly(date)
                : null,
            }
          : record
      )
    )
  }

  const handleReasonChange = (recordId: string, newReason: string) => {
    setAttendanceRecords(prev =>
      prev.map(record =>
        record.id === recordId ? { ...record, new_reason: newReason } : record
      )
    )
  }

  const handleStatusChange = (recordId: string, newStatus: string) => {
    setAttendanceRecords(prev =>
      prev.map(record =>
        record.id === recordId ? { ...record, new_status: newStatus } : record
      )
    )
  }

  const handleViolationTypeChange = (
    recordId: string,
    newViolationType: string
  ) => {
    setAttendanceRecords(prev =>
      prev.map(record =>
        record.id === recordId
          ? { ...record, new_violation_type: newViolationType }
          : record
      )
    )
  }

  const toggleCustomViolation = (recordId: string) => {
    setAttendanceRecords(prev =>
      prev.map(record =>
        record.id === recordId
          ? { ...record, show_custom_violation: !record.show_custom_violation }
          : record
      )
    )
  }

  const handleAttendanceEdit = async (record: AttendanceRecord) => {
    try {
      if (!userId) throw new Error('User not authenticated')
      if (userRole !== 'admin' && record.marked_by !== userId) {
        toast.error('You can only edit records you created')
        return
      }

      const attendanceUpdate: any = {}
      const violationUpdate: any = {}

      if (record.new_reason && record.new_reason !== record.reason) {
        attendanceUpdate.reason = record.new_reason
      }
      if (
        record.new_detention_date &&
        record.new_detention_date !== record.detention_date
      ) {
        attendanceUpdate.detention_date = record.new_detention_date
      }
      if (record.new_status && record.new_status !== record.status) {
        attendanceUpdate.status = record.new_status
      }
      if (
        record.new_violation_type &&
        record.new_violation_type !== record.violations.violation_type
      ) {
        violationUpdate.violation_type = record.new_violation_type
      }

      if (
        Object.keys(attendanceUpdate).length === 0 &&
        Object.keys(violationUpdate).length === 0
      ) {
        toast.info('No changes to save')
        return
      }

      if (Object.keys(attendanceUpdate).length > 0) {
        const { error } = await supabase
          .from('attendance')
          .update({
            ...attendanceUpdate,
            marked_by: userId,
            date_marked: new Date().toISOString(),
          })
          .eq('id', record.id)

        if (error)
          throw new Error(`Failed to update attendance: ${error.message}`)
      }

      if (Object.keys(violationUpdate).length > 0) {
        const { error } = await supabase
          .from('violations')
          .update(violationUpdate)
          .eq('id', record.violation_id)

        if (error)
          throw new Error(`Failed to update violation: ${error.message}`)
      }

      // Send notification for detention_date change
      if (
        record.new_detention_date &&
        record.new_detention_date !== record.detention_date
      ) {
        const session = await supabase.auth.getSession()
        if (!session.data.session?.access_token) {
          throw new Error('Session expired. Please log in again.')
        }

        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/Send_reschedule_notification`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${session.data.session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                student_email: selectedStudent!.email,
                detention_date: record.new_detention_date,
                student_name: selectedStudent!.name,
              }),
            }
          )

          if (!response.ok) {
            console.error(
              'Failed to send notification email:',
              await response.text()
            )
            toast.warn(
              'Attendance updated, but failed to send notification email.'
            )
          }
        } catch (emailError) {
          console.error('Error sending notification email:', emailError)
          toast.warn(
            'Attendance updated, but failed to send notification email.'
          )
        }
      }

      toast.success('Attendance record updated')
      if (selectedStudent) {
        await fetchAttendanceRecords(selectedStudent.id)
        await fetchBookedDates(selectedStudent.id)
      }
    } catch (error) {
      console.error('Error updating attendance:', error)
      toast.error(`Failed to update attendance record: ${error.message}`)
    }
  }

  const handleAbsenceReasonChange = (recordId: string, newReason: string) => {
    setAbsenceRecords(prev =>
      prev.map(record =>
        record.id === recordId ? { ...record, new_reason: newReason } : record
      )
    )
  }

  const handleAbsenceDateChange = (recordId: string, date: Date | null) => {
    setAbsenceRecords(prev =>
      prev.map(record =>
        record.id === recordId
          ? {
              ...record,
              new_absence_date: date ? toUTCISOStringFromDateOnly(date) : null,
            }
          : record
      )
    )
  }

  const handleAbsenceEdit = async (record: AbsenceRecord) => {
    try {
      if (!userId) throw new Error('User not authenticated')
      if (userRole !== 'admin' && record.marked_by !== userId) {
        toast.error('You can only edit records you created')
        return
      }

      const update: any = {}
      if (record.new_reason && record.new_reason !== record.reason) {
        update.reason = record.new_reason
      }
      if (
        record.new_absence_date &&
        record.new_absence_date !== record.absence_date
      ) {
        update.absence_date = record.new_absence_date
      }

      if (Object.keys(update).length === 0) {
        toast.info('No changes to save')
        return
      }

      const { error } = await supabase
        .from('absence_log')
        .update(update)
        .eq('id', record.id)

      if (error) throw error

      toast.success('Absence record updated')
      if (selectedStudent) {
        await fetchAbsenceRecords(selectedStudent.id)
      }
    } catch (error) {
      console.error('Error updating absence:', error)
      toast.error('Failed to update absence record')
    }
  }

  const handleAbsenceDelete = async (recordId: string, markedBy: string) => {
    try {
      if (!userId) throw new Error('User not authenticated')
      if (userRole !== 'admin' && markedBy !== userId) {
        toast.error('You can only delete records you created')
        return
      }

      const { error } = await supabase
        .from('absence_log')
        .delete()
        .eq('id', recordId)

      if (error) throw error

      toast.success('Absence record deleted')
      if (selectedStudent) {
        await fetchAbsenceRecords(selectedStudent.id)
      }
    } catch (error) {
      console.error('Error deleting absence:', error)
      toast.error('Failed to delete absence record')
    }
  }

  const openModal = (message: string, onConfirm: () => void) => {
    setModal({ isOpen: true, message, onConfirm })
  }

  const closeModal = () => {
    setModal({ isOpen: false, message: '', onConfirm: () => {} })
  }

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const session = await supabase.auth.getSession()
      if (!session.data.session?.access_token) {
        throw new Error('Session expired. Please log in again.')
      }

      const updates = attendanceRecords.map(async record => {
        const newDate = record.new_detention_date
        const newReason = record.new_reason

        const attendanceUpdate: any = {
          marked_by: user.id,
          date_marked: new Date().toISOString(),
        }

        if (newDate) {
          attendanceUpdate.detention_date = newDate
        }

        if (newReason && newReason !== record.reason) {
          attendanceUpdate.reason = newReason
        }

        if (Object.keys(attendanceUpdate).length > 2) {
          const { error: attendanceError } = await supabase
            .from('attendance')
            .update(attendanceUpdate)
            .eq('id', record.id)

          if (attendanceError)
            throw new Error(
              `Failed to update attendance for record ${record.id}: ${attendanceError.message}`
            )

          if (newDate) {
            const { error: violationError } = await supabase
              .from('violations')
              .update({
                detention_date: newDate,
                assigned_date: new Date().toISOString(),
              })
              .eq('id', record.violation_id)

            if (violationError)
              throw new Error(
                `Failed to update violation for record ${record.id}: ${violationError.message}`
              )
          }

          if (
            newReason &&
            newReason !== record.reason &&
            record.status === 'absent'
          ) {
            const { error: absenceLogError } = await supabase
              .from('absence_log')
              .update({ reason: newReason })
              .eq('attendance_id', record.id)

            if (absenceLogError)
              throw new Error(
                `Failed to update absence_log for record ${record.id}: ${absenceLogError.message}`
              )
          }

          if (newDate) {
            try {
              const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/Send_reschedule_notification`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${session.data.session.access_token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    student_email: selectedStudent!.email,
                    detention_date: newDate,
                    student_name: selectedStudent!.name,
                  }),
                }
              )

              if (!response.ok) {
                console.error(
                  'Failed to send notification email:',
                  await response.text()
                )
                toast.warn(
                  'Detention updated, but failed to send notification email.'
                )
              }
            } catch (emailError) {
              console.error('Error sending notification email:', emailError)
              toast.warn(
                'Detention updated, but failed to send notification email.'
              )
            }
          }
        }
      })

      await Promise.all(updates)
      toast.success('Detention dates and reasons updated successfully')
      if (selectedStudent) {
        await fetchAttendanceRecords(selectedStudent.id)
        await fetchBookedDates(selectedStudent.id)
      }
    } catch (error) {
      console.error('Reschedule error:', error)
      toast.error(`Error updating detention dates or reasons: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-tmechs-sage/10 to-white py-6 sm:py-12">
      <div className="mx-auto max-w-full space-y-6 px-4 sm:max-w-5xl sm:space-y-8 sm:px-0">
        {/* Header Section */}
        <div className="relative py-4 sm:py-6">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center rounded-full px-3 py-2 text-tmechs-forest transition-all duration-300 hover:scale-105 hover:bg-tmechs-sage/20"
              >
                <ArrowLeft className="mr-2 h-5 w-5 transition-all duration-300 hover:rotate-12 sm:h-6 sm:w-6" />
                <span className="text-base font-medium tracking-wide sm:text-lg">
                  Back
                </span>
              </button>
              <h1 className="relative text-2xl font-bold text-gray-800 sm:text-4xl">
                Update Records
                <span className="absolute -bottom-1 left-0 h-1 w-20 rounded-full bg-gradient-to-r from-tmechs-forest to-tmechs-sage sm:-bottom-2 sm:w-24" />
              </h1>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="rounded-xl bg-white/80 p-4 shadow-lg backdrop-blur-md transition-all duration-300 hover:shadow-xl sm:p-8">
          <label className="mb-2 block text-xs font-medium tracking-wide text-tmechs-forest sm:mb-3 sm:text-sm">
            Search Student by Name or Barcode
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-tmechs-sage sm:left-4 sm:h-6 sm:w-6" />
            {selectedStudent ? (
              <div className="flex">
                <input
                  type="text"
                  value={selectedStudent.name}
                  readOnly
                  className="w-full rounded-l-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-700 shadow-sm transition-all duration-300 focus:border-tmechs-forest focus:ring-2 focus:ring-tmechs-forest/50 sm:py-3 sm:pl-12"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent(null)
                    setAttendanceRecords([])
                    setAbsenceRecords([])
                    setBookedDates([])
                  }}
                  className="rounded-r-lg bg-tmechs-forest px-3 text-white transition-all duration-300 hover:scale-105 hover:bg-tmechs-forest/90 sm:px-4"
                >
                  <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>
            ) : (
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-700 shadow-sm transition-all duration-300 focus:border-tmechs-forest focus:ring-2 focus:ring-tmechs-forest/50 sm:py-3 sm:pl-12"
                placeholder="Search by student name or barcode..."
              />
            )}
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 transform animate-spin text-tmechs-forest sm:right-4 sm:h-6 sm:w-6" />
            )}
          </div>
          {showSearchResults && searchResults.length > 0 && (
            <div className="animate-fade-in absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-tmechs-forest/95 shadow-lg backdrop-blur-sm">
              {searchResults.map(student => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => selectStudent(student)}
                  className="flex w-full items-center justify-between px-4 py-2 text-left text-tmechs-light transition-all duration-300 hover:bg-tmechs-sage/30 sm:py-3"
                >
                  <div>
                    <div className="text-base font-medium sm:text-lg">
                      {student.name}
                    </div>
                    <div className="text-xs text-tmechs-light/80 sm:text-sm">
                      ID: {student.barcode}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {selectedStudent && (
            <div className="mt-3 flex items-center rounded-lg bg-tmechs-sage/10 p-3 sm:mt-4 sm:p-4">
              <User className="mr-2 h-5 w-5 text-tmechs-forest transition-all duration-300 hover:rotate-12 sm:mr-3 sm:h-6 sm:w-6" />
              <div>
                <p className="text-base font-medium text-tmechs-forest sm:text-lg">
                  {selectedStudent.name}
                </p>
                <p className="text-xs text-tmechs-forest/80 sm:text-sm">
                  Barcode: {selectedStudent.barcode}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal */}
        {modal.isOpen && (
          <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-md rounded-xl bg-white/80 p-4 shadow-xl backdrop-blur-md transition-all duration-300 hover:shadow-2xl sm:p-6">
              <p className="mb-4 text-base text-gray-800 sm:mb-6 sm:text-lg">
                {modal.message}
              </p>
              <div className="flex justify-end space-x-2 sm:space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full bg-gray-200 px-3 py-2 text-sm text-gray-700 shadow-sm transition-all duration-300 hover:scale-105 hover:bg-gray-300 sm:px-4 sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    modal.onConfirm()
                    closeModal()
                  }}
                  className="rounded-full bg-gradient-to-r from-tmechs-forest to-tmechs-forest/80 px-3 py-2 text-sm text-white shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md sm:px-4 sm:text-base"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Records Section */}
        {selectedStudent && (
          <div className="rounded-xl bg-white/80 p-4 shadow-lg backdrop-blur-md transition-all duration-300 hover:shadow-xl sm:p-8">
            {/* Attendance Records */}
            <div className="mb-6 rounded-lg border border-gray-200 p-4 sm:mb-8 sm:p-6">
              <div className="mb-3 flex items-center justify-between sm:mb-4">
                <h2 className="text-lg font-semibold text-gray-800 sm:text-xl">
                  Violation Records
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    setShowAttendanceRecords(!showAttendanceRecords)
                  }
                  className="flex items-center rounded-full px-2 py-1 text-tmechs-forest transition-all duration-300 hover:scale-105 hover:bg-tmechs-sage/20 sm:px-3 sm:py-2"
                >
                  {showAttendanceRecords ? (
                    <ChevronDown className="mr-1 h-5 w-5 transition-all duration-300 hover:rotate-180 sm:h-6 sm:w-6" />
                  ) : (
                    <ChevronRight className="mr-1 h-5 w-5 transition-all duration-300 hover:rotate-90 sm:h-6 sm:w-6" />
                  )}
                  <span className="text-base sm:text-lg">
                    {showAttendanceRecords ? 'Hide' : 'Show'} Records
                  </span>
                </button>
              </div>

              {showAttendanceRecords && (
                <div>
                  <p className="mb-3 text-xs italic text-tmechs-forest/80 sm:mb-4 sm:text-sm">
                    Note: Users can only edit records they created, unless they
                    are an admin.
                  </p>
                  <table className="min-w-full divide-y divide-gray-200 rounded-lg border border-gray-200 shadow-sm">
                    <thead className="bg-tmechs-sage/10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-tmechs-forest sm:px-6 sm:text-sm">
                          Violation
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-tmechs-forest sm:px-6 sm:text-sm">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-tmechs-forest sm:px-6 sm:text-sm">
                          Reason
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-tmechs-forest sm:px-6 sm:text-sm">
                          Detention Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-tmechs-forest sm:px-6 sm:text-sm">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {attendanceRecords.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-4 text-center text-sm text-gray-500 sm:px-6 sm:text-base"
                          >
                            No attendance records for this student.
                          </td>
                        </tr>
                      ) : (
                        attendanceRecords.map((record, index) => (
                          <tr
                            key={record.id}
                            className={`${
                              index % 2 === 0 ? 'bg-white' : 'bg-tmechs-sage/5'
                            } transition-all duration-300 hover:bg-tmechs-sage/10`}
                          >
                            <td className="whitespace-nowrap px-4 py-4 sm:px-6">
                              <div className="flex items-center space-x-2">
                                {record.show_custom_violation ? (
                                  <input
                                    type="text"
                                    value={record.new_violation_type || ''}
                                    onChange={e =>
                                      handleViolationTypeChange(
                                        record.id,
                                        e.target.value
                                      )
                                    }
                                    className="w-40 rounded-lg border border-gray-300 bg-white p-1 text-sm text-gray-700 shadow-sm transition-all duration-300 focus:border-tmechs-forest focus:ring-tmechs-forest sm:p-2 sm:text-base"
                                    placeholder="Custom violation"
                                  />
                                ) : (
                                  <select
                                    value={record.new_violation_type || ''}
                                    onChange={e =>
                                      handleViolationTypeChange(
                                        record.id,
                                        e.target.value
                                      )
                                    }
                                    className="w-40 rounded-lg border border-gray-300 bg-white p-1 text-sm text-gray-700 shadow-sm transition-all duration-300 focus:border-tmechs-forest focus:ring-tmechs-forest sm:p-2 sm:text-base"
                                  >
                                    <option value="" disabled>
                                      Select violation
                                    </option>
                                    {DEFAULT_VIOLATIONS.map(violation => (
                                      <option
                                        key={violation.id}
                                        value={violation.id}
                                      >
                                        {violation.label}
                                      </option>
                                    ))}
                                  </select>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleCustomViolation(record.id)
                                  }
                                  className="rounded-full px-2 py-1 text-xs text-tmechs-forest transition-all duration-300 hover:scale-105 hover:bg-tmechs-sage/20 sm:text-sm"
                                >
                                  {record.show_custom_violation
                                    ? 'Use preset'
                                    : 'Custom'}
                                </button>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 sm:px-6">
                              <select
                                value={record.new_status || ''}
                                onChange={e =>
                                  handleStatusChange(record.id, e.target.value)
                                }
                                className="rounded-lg border border-gray-300 bg-white p-1 text-sm text-gray-700 shadow-sm transition-all duration-300 focus:border-tmechs-forest focus:ring-tmechs-forest sm:p-2 sm:text-base"
                              >
                                <option value="" disabled>
                                  Select status
                                </option>
                                {statusOptions.map(status => (
                                  <option key={status} value={status}>
                                    {status.charAt(0).toUpperCase() +
                                      status.slice(1)}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 sm:px-6">
                              <select
                                value={record.new_reason || ''}
                                onChange={e =>
                                  handleReasonChange(record.id, e.target.value)
                                }
                                className="rounded-lg border border-gray-300 bg-white p-1 text-sm text-gray-700 shadow-sm transition-all duration-300 focus:border-tmechs-forest focus:ring-tmechs-forest sm:p-2 sm:text-base"
                              >
                                <option value="" disabled>
                                  Select reason
                                </option>
                                {reasonOptions.map(reason => (
                                  <option key={reason} value={reason}>
                                    {reason.charAt(0).toUpperCase() +
                                      reason.slice(1).replace(/ /g, ' ')}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 sm:px-6">
                              <div className="relative">
                                <Calendar className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 transform text-tmechs-forest transition-all duration-300 hover:rotate-12 sm:left-3 sm:h-5 sm:w-5" />
                                <DatePicker
                                  selected={
                                    record.new_detention_date
                                      ? new Date(record.new_detention_date)
                                      : null
                                  }
                                  onChange={date =>
                                    handleDateChange(record.id, date)
                                  }
                                  includeDates={availableDates}
                                  excludeDates={bookedDates.filter(
                                    d =>
                                      toUTCISOStringFromDateOnly(d) !==
                                      record.detention_date
                                  )}
                                  placeholderText="Select new date"
                                  className="w-full rounded-lg border border-gray-300 bg-white py-1 pl-8 pr-2 text-sm text-gray-700 shadow-sm transition-all duration-300 focus:border-tmechs-forest focus:ring-2 focus:ring-tmechs-forest/50 sm:py-2 sm:pl-10 sm:text-base"
                                  dateFormat="MMMM d, yyyy"
                                  minDate={new Date()}
                                />
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 sm:px-6">
                              <button
                                type="button"
                                onClick={() =>
                                  openModal(
                                    'Are you sure you want to update this attendance record?',
                                    () => handleAttendanceEdit(record)
                                  )
                                }
                                disabled={
                                  userRole !== 'admin' &&
                                  record.marked_by !== userId
                                }
                                className="rounded-full p-1 text-tmechs-forest transition-all duration-300 hover:scale-105 hover:bg-tmechs-sage/20 disabled:cursor-not-allowed disabled:opacity-50 sm:p-2"
                                title="Edit attendance"
                              >
                                <Edit className="h-4 w-4 transition-all duration-300 hover:rotate-12 sm:h-5 sm:w-5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Absence Records */}
            <div className="rounded-lg border border-gray-200 p-4 sm:p-6">
              <div className="mb-3 flex items-center justify-between sm:mb-4">
                <h2 className="text-lg font-semibold text-gray-800 sm:text-xl">
                  Absence Records
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAbsenceRecords(!showAbsenceRecords)}
                  className="flex items-center rounded-full px-2 py-1 text-tmechs-forest transition-all duration-300 hover:scale-105 hover:bg-tmechs-sage/20 sm:px-3 sm:py-2"
                >
                  {showAbsenceRecords ? (
                    <ChevronDown className="mr-1 h-5 w-5 transition-all duration-300 hover:rotate-180 sm:h-6 sm:w-6" />
                  ) : (
                    <ChevronRight className="mr-1 h-5 w-5 transition-all duration-300 hover:rotate-90 sm:h-6 sm:w-6" />
                  )}
                  <span className="text-base sm:text-lg">
                    {showAbsenceRecords ? 'Hide' : 'Show'} Records
                  </span>
                </button>
              </div>

              {showAbsenceRecords && (
                <div>
                  <p className="mb-3 text-xs italic text-tmechs-forest/80 sm:mb-4 sm:text-sm">
                    Note: Users can only edit or delete records they created,
                    unless they are an admin.
                  </p>
                  <table className="min-w-full divide-y divide-gray-200 rounded-lg border border-gray-200 shadow-sm">
                    <thead className="bg-tmechs-sage/10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-tmechs-forest sm:px-6 sm:text-sm">
                          Violation
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-tmechs-forest sm:px-6 sm:text-sm">
                          Reason
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-tmechs-forest sm:px-6 sm:text-sm">
                          Absence Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-tmechs-forest sm:px-6 sm:text-sm">
                          Detention Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-tmechs-forest sm:px-6 sm:text-sm">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {absenceRecords.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-4 text-center text-sm text-gray-500 sm:px-6 sm:text-base"
                          >
                            No absence records for this student.
                          </td>
                        </tr>
                      ) : (
                        absenceRecords.map((record, index) => (
                          <tr
                            key={record.id}
                            className={`${
                              index % 2 === 0 ? 'bg-white' : 'bg-tmechs-sage/5'
                            } transition-all duration-300 hover:bg-tmechs-sage/10`}
                          >
                            <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 sm:px-6 sm:text-base">
                              {record.violations?.violation_type || 'Unknown'}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 sm:px-6">
                              <select
                                value={record.new_reason || ''}
                                onChange={e =>
                                  handleAbsenceReasonChange(
                                    record.id,
                                    e.target.value
                                  )
                                }
                                className="rounded-lg border border-gray-300 bg-white p-1 text-sm text-gray-700 shadow-sm transition-all duration-300 focus:border-tmechs-forest focus:ring-tmechs-forest sm:p-2 sm:text-base"
                              >
                                <option value="" disabled>
                                  Select reason
                                </option>
                                {reasonOptions.map(reason => (
                                  <option key={reason} value={reason}>
                                    {reason.charAt(0).toUpperCase() +
                                      reason.slice(1).replace(/ /g, ' ')}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 sm:px-6">
                              <div className="relative">
                                <Calendar className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 transform text-tmechs-forest transition-all duration-300 hover:rotate-12 sm:left-3 sm:h-5 sm:w-5" />
                                <DatePicker
                                  selected={
                                    record.new_absence_date
                                      ? new Date(record.new_absence_date)
                                      : null
                                  }
                                  onChange={date =>
                                    handleAbsenceDateChange(record.id, date)
                                  }
                                  placeholderText="Select absence date"
                                  className="w-full rounded-lg border border-gray-300 bg-white py-1 pl-8 pr-2 text-sm text-gray-700 shadow-sm transition-all duration-300 focus:border-tmechs-forest focus:ring-2 focus:ring-tmechs-forest/50 sm:py-2 sm:pl-10 sm:text-base"
                                  dateFormat="MMMM d, yyyy"
                                  minDate={new Date('2020-01-01')}
                                />
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 sm:px-6 sm:text-base">
                              {new Date(
                                record.detention_date + 'T00:00:00Z'
                              ).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'numeric',
                                day: 'numeric',
                                timeZone: 'UTC',
                              })}
                            </td>
                            <td className="flex space-x-2 whitespace-nowrap px-4 py-4 sm:px-6">
                              <button
                                type="button"
                                onClick={() =>
                                  openModal(
                                    'Are you sure you want to update this absence record?',
                                    () => handleAbsenceEdit(record)
                                  )
                                }
                                disabled={
                                  userRole !== 'admin' &&
                                  record.marked_by !== userId
                                }
                                className="rounded-full p-1 text-tmechs-forest transition-all duration-300 hover:scale-105 hover:bg-tmechs-sage/20 disabled:cursor-not-allowed disabled:opacity-50 sm:p-2"
                                title="Edit absence"
                              >
                                <Edit className="h-4 w-4 transition-all duration-300 hover:rotate-12 sm:h-5 sm:w-5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  openModal(
                                    "This will delete the student's absence record. Are you sure you want to do this?",
                                    () =>
                                      handleAbsenceDelete(
                                        record.id,
                                        record.marked_by
                                      )
                                  )
                                }
                                disabled={
                                  userRole !== 'admin' &&
                                  record.marked_by !== userId
                                }
                                className="rounded-full p-1 text-red-600 transition-all duration-300 hover:scale-105 hover:bg-red-100/50 disabled:cursor-not-allowed disabled:opacity-50 sm:p-2"
                                title="Delete absence"
                              >
                                <Trash2 className="h-4 w-4 transition-all duration-300 hover:rotate-12 sm:h-5 sm:w-5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Note Section */}
            <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-md sm:mt-8 sm:p-6">
              <div className="flex items-start space-x-2 sm:space-x-3">
                <AlertCircle className="mt-0.5 h-5 w-5 animate-pulse text-yellow-500 sm:mt-1 sm:h-6 sm:w-6" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 sm:text-base">
                    Important Note:
                  </h3>
                  <ul className="mt-1 list-inside list-disc text-xs leading-relaxed text-gray-700 sm:mt-2 sm:text-sm">
                    <li>
                      Use this page to correct errors or accommodate student
                      requests for changing detention dates, reasons, violation
                      types, status, or absence records.
                    </li>
                    <li>
                      Attendance and absence records can be edited, but only by
                      the creator or admins.
                    </li>
                    <li>
                      Students cannot be scheduled for multiple detentions on
                      the same date.
                    </li>
                    <li>
                      Students will receive an email notification with the
                      updated detention date (if changed).
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
