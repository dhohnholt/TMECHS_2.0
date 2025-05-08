import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import { ArrowLeft, X, Calendar } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import 'react-datepicker/dist/react-datepicker.css'

interface DetentionStudent {
  id: string
  name: string
  violation: string
  status: 'attended' | 'absent' | 'pending' | 'reassigned'
  barcode: string
  violation_id: string
  attendance_id: string
  reason: string
  notes: string
}

type AttendanceStatus = 'attended' | 'absent' | 'pending' | 'reassigned'

interface PendingUpdate {
  violation_id: string
  status: AttendanceStatus
  reason: string
  notes: string
  student_id: string
  attendance_id: string
  detention_date: string
}

const toUTCISOStringFromDateOnly = (date: Date): string => {
  const localMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0)
  const offsetMs = localMidnight.getTimezoneOffset() * 60000
  return new Date(localMidnight.getTime() - offsetMs).toISOString().split('T')[0]
}

const isSameDay = (d1: Date, d2: Date): boolean =>
  d1.toISOString().split('T')[0] === d2.toISOString().split('T')[0]

const handleError = (
  error: unknown,
  message: string,
  navigate?: (path: string) => void
): void => {
  console.error(message, error)
  toast.error(
    `${message}: ${error instanceof Error ? error.message : 'Unknown error'}`
  )
  if (navigate) navigate('/login')
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>
            Something went wrong. Please refresh the page or try again later.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

function DetentionAttendance() {
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [students, setStudents] = useState<DetentionStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attendanceRecords, setAttendanceRecords] = useState<
    Record<string, AttendanceStatus>
  >({})
  const [reasonRecords, setReasonRecords] = useState<Record<string, string>>({})
  const [notesRecords, setNotesRecords] = useState<Record<string, string>>({})
  const [showReassignModal, setShowReassignModal] = useState(false)
  const [absentStudents, setAbsentStudents] = useState<DetentionStudent[]>([])
  const [reassignDates, setReassignDates] = useState<
    Record<string, Date | null>
  >({})
  const [autoAssignNextDate, setAutoAssignNextDate] = useState(true)
  const [availableDates, setAvailableDates] = useState<Date[]>([])
  const [isAttendanceTaken, setIsAttendanceTaken] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdate[]>([])
  const [bookedDates, setBookedDates] = useState<Record<string, Date[]>>({})

  useEffect(() => {
    localStorage.removeItem('cachedAvailableDates')
  }, [])

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          console.log('Auth state changed:', event)
          if (!session)
            handleError(
              new Error('Session expired'),
              'Session expired',
              navigate
            )
        }
      }
    )
    return () => authListener.subscription.unsubscribe()
  }, [navigate])

  const fetchStudents = useCallback(async (date: Date) => {
    try {
      setLoading(true)
      const isoDate = toUTCISOStringFromDateOnly(date)
      const { data, error } = await supabase
        .from('attendance')
        .select(
          'id,violation_id,status,reason,notes,detention_date,reassigned_date,violations:violation_id(violation_type),students:student_id(id,name,barcode)'
        )
        .eq('detention_date', isoDate)

      if (error) throw error
      if (!data) throw new Error('No data returned')

      const formatted: DetentionStudent[] = data.map((record: any) => ({
        id: record.students.id,
        name: record.students.name,
        violation: record.violations?.violation_type || 'Unknown',
        status: record.status,
        barcode: record.students.barcode,
        violation_id: record.violation_id,
        attendance_id: record.id,
        reason: record.reason || 'unexcused',
        notes: record.notes || '',
      }))

      const initialAttendance: Record<string, AttendanceStatus> = {}
      const initialReasons: Record<string, string> = {}
      const initialNotes: Record<string, string> = {}

      formatted.forEach(s => {
        initialAttendance[s.violation_id] =
          s.status === 'pending' ? 'pending' : s.status
        initialReasons[s.violation_id] = s.reason
        initialNotes[s.violation_id] = s.notes
      })

      setStudents(formatted)
      setAttendanceRecords(initialAttendance)
      setReasonRecords(initialReasons)
      setNotesRecords(initialNotes)
      setIsAttendanceTaken(
        formatted.every(s => s.status === 'attended' || s.status === 'absent')
      )
    } catch (err) {
      handleError(err, 'Error loading attendance')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedDate) fetchStudents(selectedDate)
  }, [selectedDate, fetchStudents])

  const fetchAvailableDates = useCallback(async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()
      if (sessionError || !session) throw new Error('Session expired')

      const baseDate = selectedDate || new Date()
      baseDate.setHours(0, 0, 0, 0)
      const baseDateStr = toUTCISOStringFromDateOnly(baseDate)

      const { data, error } = await supabase
        .from('detention_slots')
        .select('date, current_count, capacity')
        .gt('date', baseDateStr)
        .order('date')

      if (error) throw error
      if (!data || data.length === 0) {
        console.log('No detention slots found after', baseDateStr)
        setAvailableDates([])
        return
      }

      const filteredDates = data
        .filter(slot => (slot.current_count || 0) < (slot.capacity || 20))
        .map(slot => {
          const parts = slot.date.split('-')
          const date = new Date(
            parseInt(parts[0]),
            parseInt(parts[1]) - 1,
            parseInt(parts[2])
          )
          date.setHours(0, 0, 0, 0)
          return date
        })

      setAvailableDates(filteredDates)
    } catch (error) {
      handleError(error, 'Failed to fetch detention slots')
      setAvailableDates([])
    }
  }, [selectedDate])

  const fetchBookedDates = useCallback(async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('violations')
        .select('detention_date')
        .eq('student_id', studentId)
        .eq('is_warning', false)
        .eq('is_archived', false)

      if (error) throw error
      return (data || [])
        .map(v => new Date(v.detention_date))
        .filter(d => !isNaN(d.getTime()))
    } catch (error) {
      handleError(error, 'Error fetching booked dates')
      return []
    }
  }, [])

  const fetchAllBookedDates = useCallback(async () => {
    const bookedDatesMap: Record<string, Date[]> = {}
    for (const student of absentStudents) {
      bookedDatesMap[student.id] = await fetchBookedDates(student.id)
    }
    setBookedDates(bookedDatesMap)
  }, [absentStudents, fetchBookedDates])

  useEffect(() => {
    if (showReassignModal) {
      setAvailableDates([])
      fetchAvailableDates()
      fetchAllBookedDates()
    }
  }, [showReassignModal, fetchAvailableDates, fetchAllBookedDates])

  const getNextAvailableDate = useCallback(
    async (studentId: string, attendanceDate: Date) => {
      try {
        const baseDateStr = toUTCISOStringFromDateOnly(attendanceDate)
        const bookedDates = await fetchBookedDates(studentId)
        const bookedDateStrings = bookedDates.map(toUTCISOStringFromDateOnly)

        const nextAvailable = availableDates.find(slotDate => {
          const slotDateStr = toUTCISOStringFromDateOnly(slotDate)
          return (
            slotDateStr > baseDateStr &&
            !bookedDateStrings.includes(slotDateStr)
          )
        })

        if (!nextAvailable) {
          console.log(
            `No available slots found after ${baseDateStr} for student ${studentId}`
          )
          return null
        }
        return nextAvailable
      } catch (error) {
        handleError(error, 'Error finding next available date')
        return null
      }
    },
    [availableDates, fetchBookedDates]
  )

  const applyAttendanceUpdates = useCallback(
    async (updates: PendingUpdate[], userId: string) => {
      const updatePromises = updates.map(async update => {
        const {
          violation_id,
          status,
          reason,
          notes,
          student_id,
          attendance_id,
          detention_date,
        } = update

        console.log(`Updating attendance for violation ${violation_id}: status=${status}`)

        // 1. Update attendance
        const { error } = await supabase
          .from('attendance')
          .update({
            status,
            reason,
            notes,
            marked_by: userId,
            date_marked: new Date().toISOString(),
          })
          .eq('violation_id', violation_id)
          .eq('detention_date', detention_date)
        if (error) throw new Error(`Update failed: ${error.message}`)

        console.log(`Updating violation ${violation_id}: status=${status}`)

        // 2. Sync violation status
        const { error: violationError } = await supabase
          .from('violations')
          .update({ status })
          .eq('id', violation_id)
        if (violationError) {
          throw new Error(
            `Failed to update violation status: ${violationError.message}`
          )
        }

        // 3. Log absence if needed
        if (status === 'absent') {
          console.log(`Logging absence for violation ${violation_id}`)
          const { error: logError } = await supabase
            .from('absence_log')
            .insert({
              attendance_id,
              violation_id,
              student_id,
              detention_date,
              absence_date: toUTCISOStringFromDateOnly(new Date()),
              marked_by: userId,
              reason,
            })
          if (logError)
            throw new Error(`Failed to log absence: ${logError.message}`)
        }
      })
      await Promise.all(updatePromises)
    },
    []
  )

  const handleTakeAttendance = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      try {
        setIsSubmitting(true)
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        const isoDate = selectedDate
          ? toUTCISOStringFromDateOnly(selectedDate)
          : null
        if (!isoDate) throw new Error('No selected date')

        const pendingStudents = students.filter(
          s => attendanceRecords[s.violation_id] === 'pending'
        )
        if (pendingStudents.length > 0) {
          toast.error(
            `Please mark attendance for: ${pendingStudents.map(s => s.name).join(', ')}.`
          )
          return
        }

        // Prepare updates and identify unexcused absences
        const updates: PendingUpdate[] = []
        const unexcusedStudentIds: string[] = []

        Object.entries(attendanceRecords).forEach(([violation_id, status]) => {
          const student = students.find(s => s.violation_id === violation_id)
          if (!student) return

          const reason = reasonRecords[violation_id] || 'unexcused'
          updates.push({
            violation_id,
            status,
            reason,
            notes: notesRecords[violation_id] || '',
            student_id: student.id,
            attendance_id: student.attendance_id,
            detention_date: isoDate,
          })

          // Collect student IDs for unexcused absences
          if (status === 'absent' && reason === 'unexcused') {
            unexcusedStudentIds.push(student.id)
          }
        })

        // Increment unexcused_count for unexcused absences
        if (unexcusedStudentIds.length > 0) {
          // Fetch current unexcused_count values
          const { data: studentData, error: fetchError } = await supabase
            .from('students')
            .select('id, unexcused_count')
            .in('id', unexcusedStudentIds)

          if (fetchError) {
            throw new Error(
              `Failed to fetch unexcused counts: ${fetchError.message}`
            )
          }

          // Prepare updates with incremented values
          const studentUpdates = studentData.map(student => ({
            id: student.id,
            unexcused_count: (student.unexcused_count || 0) + 1,
          }))

          // Apply updates
          for (const update of studentUpdates) {
            const { error: updateError } = await supabase
              .from('students')
              .update({ unexcused_count: update.unexcused_count })
              .eq('id', update.id)

            if (updateError) {
              throw new Error(
                `Failed to increment unexcused count for student ${update.id}: ${updateError.message}`
              )
            }
          }
        }

        const absent = students.filter(
          s => attendanceRecords[s.violation_id] === 'absent'
        )
        setAbsentStudents(absent)
        setPendingUpdates(updates)

        if (absent.length > 0) {
          setShowReassignModal(true)
        } else {
          await applyAttendanceUpdates(updates, user.id)
          toast.success('Attendance recorded successfully')
          setIsAttendanceTaken(true)
          setPendingUpdates([])
        }
      } catch (err) {
        handleError(err, 'Error recording attendance')
        setPendingUpdates([])
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      students,
      selectedDate,
      attendanceRecords,
      reasonRecords,
      notesRecords,
      applyAttendanceUpdates,
    ]
  )

  const handleUpdateAttendance = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      try {
        setIsSubmitting(true)
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        const isoDate = selectedDate
          ? toUTCISOStringFromDateOnly(selectedDate)
          : null
        if (!isoDate) throw new Error('No selected date')

        const pendingStudents = students.filter(
          s => attendanceRecords[s.violation_id] === 'pending'
        )
        if (pendingStudents.length > 0) {
          toast.error(
            `Please mark attendance for: ${pendingStudents.map(s => s.name).join(', ')}.`
          )
          return
        }

        // Track changes to unexcused_count
        const studentsToIncrement: string[] = []
        const studentsToDecrement: string[] = []

        Object.entries(attendanceRecords).forEach(([violation_id, newStatus]) => {
          const student = students.find(s => s.violation_id === violation_id)
          if (!student) return

          const newReason = reasonRecords[violation_id] || 'unexcused'
          const oldStatus = student.status
          const oldReason = student.reason || 'unexcused'

          // Increment: Not absent before, now absent and unexcused
          if (
            oldStatus !== 'absent' &&
            newStatus === 'absent' &&
            newReason === 'unexcused'
          ) {
            studentsToIncrement.push(student.id)
          }
          // Decrement: Was absent and unexcused, now not absent
          if (
            oldStatus === 'absent' &&
            oldReason === 'unexcused' &&
            (newStatus !== 'absent' || newReason !== 'unexcused')
          ) {
            studentsToDecrement.push(student.id)
          }
        })

        // Increment unexcused_count
        if (studentsToIncrement.length > 0) {
          const { data: studentData, error: fetchError } = await supabase
            .from('students')
            .select('id, unexcused_count')
            .in('id', studentsToIncrement)

          if (fetchError) {
            throw new Error(
              `Failed to fetch unexcused counts for increment: ${fetchError.message}`
            )
          }

          const updates = studentData.map(student => ({
            id: student.id,
            unexcused_count: (student.unexcused_count || 0) + 1,
          }))

          for (const update of updates) {
            const { error: updateError } = await supabase
              .from('students')
              .update({ unexcused_count: update.unexcused_count })
              .eq('id', update.id)

            if (updateError) {
              throw new Error(
                `Failed to increment unexcused count for student ${update.id}: ${updateError.message}`
              )
            }
          }
        }

        // Decrement unexcused_count
        if (studentsToDecrement.length > 0) {
          const { data: studentData, error: fetchError } = await supabase
            .from('students')
            .select('id, unexcused_count')
            .in('id', studentsToDecrement)

          if (fetchError) {
            throw new Error(
              `Failed to fetch unexcused counts for decrement: ${fetchError.message}`
            )
          }

          const updates = studentData.map(student => ({
            id: student.id,
            unexcused_count: Math.max((student.unexcused_count || 0) - 1, 0),
          }))

          for (const update of updates) {
            const { error: updateError } = await supabase
              .from('students')
              .update({ unexcused_count: update.unexcused_count })
              .eq('id', update.id)

            if (updateError) {
              throw new Error(
                `Failed to decrement unexcused count for student ${update.id}: ${updateError.message}`
              )
            }
          }
        }

        // Prepare updates
        const updates: PendingUpdate[] = Object.entries(attendanceRecords).map(
          ([violation_id, status]) => {
            const student = students.find(s => s.violation_id === violation_id)
            if (!student) throw new Error(`Student not found for violation ${violation_id}`)

            return {
              violation_id,
              status,
              reason: reasonRecords[violation_id] || 'unexcused',
              notes: notesRecords[violation_id] || '',
              student_id: student.id,
              attendance_id: student.attendance_id,
              detention_date: isoDate,
            }
          }
        )

        // Apply updates using applyAttendanceUpdates
        await applyAttendanceUpdates(updates, user.id)

        toast.success('Attendance updated successfully')
        setIsEditing(false)
        if (selectedDate) fetchStudents(selectedDate)
      } catch (err) {
        handleError(err, 'Error updating attendance')
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      students,
      selectedDate,
      attendanceRecords,
      reasonRecords,
      notesRecords,
      applyAttendanceUpdates,
      fetchStudents,
    ]
  )

  const handleReassignSubmit = useCallback(async () => {
    try {
      setIsSubmitting(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const missingDates = absentStudents.some(
        student => !reassignDates[student.violation_id] && !autoAssignNextDate
      )
      if (missingDates) {
        toast.error(
          'Please select a date for all students or enable auto-assign.'
        )
        return
      }

      const reassignments = absentStudents.map(async student => {
        const newDate =
          reassignDates[student.violation_id] ||
          (autoAssignNextDate && selectedDate
            ? await getNextAvailableDate(student.id, selectedDate)
            : null)

        if (!newDate) {
          toast.error(`No available slot for ${student.name}`)
          return
        }

        const newDateStr = toUTCISOStringFromDateOnly(newDate)
        const { error: updateError } = await supabase
          .from('attendance')
          .update({
            status: 'reassigned',
            detention_date: newDateStr,
            reassigned_date: new Date().toISOString(),
            marked_by: user.id,
            date_marked: new Date().toISOString(),
          })
          .eq('violation_id', student.violation_id)
          .eq(
            'detention_date',
            selectedDate ? toUTCISOStringFromDateOnly(selectedDate) : ''
          )
        if (updateError)
          throw new Error(`Update failed: ${updateError.message}`)

        await supabase
          .from('violations')
          .update({
            detention_date: newDateStr,
            assigned_date: new Date().toISOString(),
            status: 'reassigned',
          })
          .eq('id', student.violation_id)
      })

      await Promise.all(reassignments)

      // Update pendingUpdates to reflect the reassigned status
      const updatedPendingUpdates = pendingUpdates.map(update => {
        if (absentStudents.some(student => student.violation_id === update.violation_id)) {
          return { ...update, status: 'reassigned' as AttendanceStatus }
        }
        return update
      })

      // Send emails for unexcused absences
      const unexcusedUpdates = updatedPendingUpdates.filter(
        update => update.status === 'absent' && update.reason === 'unexcused'
      )
      if (unexcusedUpdates.length > 0) {
        const emailPromises = unexcusedUpdates.map(async update => {
          try {
            const res = await fetch(
              'https://zgrxawyginizrshjmkum.supabase.co/functions/v1/send_versioned_unexcused_email',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                  'x-webhook-secret': import.meta.env.VITE_WEBHOOK_SECRET,
                },
                body: JSON.stringify({
                  student_id: update.student_id,
                  attendance_id: update.attendance_id,
                }),
              }
            )

            if (!res.ok) {
              throw new Error(`HTTP error ${res.status}`)
            }

            const data = await res.json()
            console.log(`Email sent for student ${update.student_id}:`, data)
          } catch (error) {
            console.error(
              `Failed to send email for student ${update.student_id}:`,
              error
            )
            // Don't throw to avoid blocking reassignment
          }
        })

        await Promise.all(emailPromises)
      }

      await applyAttendanceUpdates(updatedPendingUpdates, user.id)

      toast.success('Absences reassigned successfully')
      setShowReassignModal(false)
      setReassignDates({})
      setAvailableDates([])
      setBookedDates({})
      setPendingUpdates([])
      setIsAttendanceTaken(true)
      if (selectedDate) fetchStudents(selectedDate)
    } catch (err) {
      handleError(err, 'Error reassigning absences')
    } finally {
      setIsSubmitting(false)
    }
  }, [
    absentStudents,
    reassignDates,
    autoAssignNextDate,
    selectedDate,
    getNextAvailableDate,
    pendingUpdates,
    applyAttendanceUpdates,
    fetchStudents,
  ])

  const handleModalClose = async () => {
    const missingDates = absentStudents.some(
      student => !reassignDates[student.violation_id] && !autoAssignNextDate
    )
    if (
      missingDates &&
      !window.confirm('Closing will cancel attendance submission. Proceed?')
    ) {
      return
    }

    // Decrement unexcused_count for unexcused absences in pending updates
    const unexcusedStudentIds = pendingUpdates
      .filter(
        update => update.status === 'absent' && update.reason === 'unexcused'
      )
      .map(update => update.student_id)

    if (unexcusedStudentIds.length > 0) {
      try {
        // Fetch current unexcused_count values
        const { data: studentData, error: fetchError } = await supabase
          .from('students')
          .select('id, unexcused_count')
          .in('id', unexcusedStudentIds)

        if (fetchError) {
          throw new Error(
            `Failed to fetch unexcused counts: ${fetchError.message}`
          )
        }

        // Prepare updates with decremented values
        const updates = studentData.map(student => ({
          id: student.id,
          unexcused_count: Math.max((student.unexcused_count || 0) - 1, 0),
        }))

        // Apply updates
        for (const update of updates) {
          const { error: updateError } = await supabase
            .from('students')
            .update({ unexcused_count: update.unexcused_count })
            .eq('id', update.id)

          if (updateError) {
            throw new Error(
              `Failed to decrement unexcused count for student ${update.id}: ${updateError.message}`
            )
          }
        }
      } catch (err) {
        console.error('Failed to decrement unexcused count:', err)
        toast.error(
          'Error reverting unexcused counts. Please check student records.'
        )
      }
    }

    setShowReassignModal(false)
    setReassignDates({})
    setAvailableDates([])
    setBookedDates({})
    setPendingUpdates([])
    setAbsentStudents([])
    toast.info('Attendance submission canceled.')
  }

  const handleAttendanceChange = (
    violationId: string,
    status: 'attended' | 'absent'
  ) => {
    setAttendanceRecords(prev => ({ ...prev, [violationId]: status }))
  }

  return (
    <ErrorBoundary>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-tmechs-forest hover:text-tmechs-forest/80"
            aria-label="Go back"
          >
            <ArrowLeft className="h-6 w-6" />
            <span className="ml-1">Back</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            Detention Attendance
          </h1>
        </div>

        <div className="mb-6 flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">
            Detention Date
          </label>
          <DatePicker
            selected={selectedDate}
            onChange={date => setSelectedDate(date)}
            className="w-full rounded-md border border-gray-300 bg-tmechs-forest pl-10 text-tmechs-light shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
            dateFormat="MMMM d, yyyy"
            aria-label="Select detention date"
          />
        </div>

        {loading && (
          <div className="flex justify-center py-4">
            <svg
              className="h-5 w-5 animate-spin text-tmechs-forest"
              viewBox="0 0 24 24"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
            </svg>
          </div>
        )}

        <form
          onSubmit={isEditing ? handleUpdateAttendance : handleTakeAttendance}
        >
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Violation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Attendance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {!loading &&
                students.map(s => (
                  <tr key={s.violation_id}>
                    <td className="whitespace-nowrap px-6 py-4">{s.name}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {s.violation}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {attendanceRecords[s.violation_id] === 'pending' && (
                        <span className="mr-2 text-xs text-yellow-600">
                          Not Marked
                        </span>
                      )}
                      <div className="group relative mr-4 inline-block">
                        <label className="mr-4">
                          <input
                            type="radio"
                            name={s.violation_id}
                            value="attended"
                            checked={
                              attendanceRecords[s.violation_id] === 'attended'
                            }
                            onChange={() =>
                              handleAttendanceChange(s.violation_id, 'attended')
                            }
                            disabled={isAttendanceTaken && !isEditing}
                            className="mr-1 focus:ring-tmechs-forest"
                          />
                          Present
                        </label>
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 w-max max-w-xs -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 sm:hidden">
                          Mark this student as present for detention
                        </div>
                      </div>
                      <div className="group relative inline-block">
                        <label>
                          <input
                            type="radio"
                            name={s.violation_id}
                            value="absent"
                            checked={
                              attendanceRecords[s.violation_id] === 'absent'
                            }
                            onChange={() =>
                              handleAttendanceChange(s.violation_id, 'absent')
                            }
                            disabled={isAttendanceTaken && !isEditing}
                            className="mr-1 focus:ring-tmechs-forest"
                          />
                          Absent
                        </label>
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 w-max max-w-xs -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 sm:hidden">
                          Mark this student as absent; they will need to be
                          reassigned
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {attendanceRecords[s.violation_id] === 'absent' ? (
                        <div className="group relative inline-block">
                          <select
                            value={reasonRecords[s.violation_id] || 'unexcused'}
                            onChange={e =>
                              setReasonRecords(prev => ({
                                ...prev,
                                [s.violation_id]: e.target.value,
                              }))
                            }
                            disabled={isAttendanceTaken && !isEditing}
                            className="rounded border border-gray-300 p-1 text-sm focus:border-tmechs-forest focus:ring-tmechs-forest"
                          >
                            <option value="unexcused">Unexcused</option>
                            <option value="excused">Excused</option>
                            <option value="medical">Medical</option>
                            <option value="school_event">School Event</option>
                          </select>
                          <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 w-max max-w-xs -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 sm:hidden">
                            Select the reason for the student’s absence
                          </div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="group relative inline-block w-full">
                        <input
                          type="text"
                          value={notesRecords[s.violation_id] || ''}
                          onChange={e =>
                            setNotesRecords(prev => ({
                              ...prev,
                              [s.violation_id]: e.target.value,
                            }))
                          }
                          disabled={isAttendanceTaken && !isEditing}
                          className="w-full rounded border border-gray-300 p-1 text-sm focus:border-tmechs-forest focus:ring-tmechs-forest"
                          placeholder="Optional notes"
                        />
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 w-max max-w-xs -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 sm:hidden">
                          Add optional notes about the student’s attendance
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          <div className="mt-4 flex items-center space-x-4 sm:flex-col sm:items-start sm:gap-2">
            <div className="group relative inline-block w-full">
              <button
                type="submit"
                disabled={
                  isSubmitting || loading || (isAttendanceTaken && !isEditing)
                }
                className="btn-primary w-full transition-all hover:bg-tmechs-forest/90 active:bg-tmechs-forest/80 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={isEditing ? 'Update attendance' : 'Take attendance'}
              >
                {isSubmitting
                  ? 'Processing...'
                  : isEditing
                    ? 'Update Attendance'
                    : 'Take Attendance'}
              </button>
              <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 w-max max-w-xs -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 sm:hidden">
                Submit the attendance records for this detention session
              </div>
            </div>
            {isAttendanceTaken && (
              <div className="group relative inline-block">
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={isEditing}
                    onChange={() => setIsEditing(prev => !prev)}
                    className="h-4 w-4 rounded border-gray-300 text-tmechs-forest focus:ring-tmechs-forest"
                    aria-label="Toggle edit attendance"
                  />
                  <span>Edit Attendance</span>
                </label>
                <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 w-max max-w-xs -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 sm:hidden">
                  Enable editing of previously recorded attendance
                </div>
              </div>
            )}
            <div className="mt-2 w-full rounded-lg border border-gray-300 bg-gray-100 p-3 text-xs text-gray-700 sm:text-sm">
              <p className="font-semibold">Attendance Tips:</p>
              <ul className="mt-1 list-inside list-disc space-y-1">
                <li>
                  Mark each student as "Present" or "Absent" using the radio
                  buttons.
                </li>
                <li>
                  If a student is absent, select a reason and add optional
                  notes.
                </li>
                <li>
                  After submitting, absent students can be reassigned to a
                  future date.
                </li>
                <li>
                  Use "Edit Attendance" to modify previously recorded
                  attendance.
                </li>
              </ul>
            </div>
          </div>
        </form>

        {showReassignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="relative max-h-[80vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
              <div className="group absolute relative right-4 top-4 inline-block">
                <button
                  onClick={handleModalClose}
                  className="text-gray-500 transition-colors hover:text-gray-800"
                  aria-label="Close reassignment modal"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 w-max max-w-xs -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 sm:hidden">
                  Close the reassignment modal without saving
                </div>
              </div>
              <h2 className="mb-4 text-center text-lg font-bold">
                Reassign Absent Students
              </h2>
              <div className="group relative mb-4 inline-block w-full">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={autoAssignNextDate}
                    onChange={() => setAutoAssignNextDate(prev => !prev)}
                    className="rounded border-gray-300 text-tmechs-forest focus:ring-tmechs-forest"
                    aria-label="Toggle auto-assign"
                  />
                  <span>Auto-assign unless overridden</span>
                </label>
                <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 w-max max-w-xs -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 sm:hidden">
                  Automatically assign to next available date unless a specific
                  date is selected
                </div>
              </div>
              {availableDates.length === 0 ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <p>
                    No available detention dates found. Add slots or refresh.
                  </p>
                  <button
                    onClick={fetchAvailableDates}
                    className="mt-2 text-sm text-tmechs-forest transition-all hover:text-tmechs-forest/80 hover:underline"
                  >
                    Refresh Dates
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {absentStudents.map(student => (
                    <div
                      key={student.violation_id}
                      className="flex items-center justify-between gap-4"
                    >
                      <span className="w-1/3 truncate">{student.name}</span>
                      <div className="flex w-2/3 items-center gap-2">
                        <div className="relative flex-1">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 transform bg-tmechs-forest text-tmechs-light" />
                          <DatePicker
                            selected={
                              reassignDates[student.violation_id] || null
                            }
                            onChange={date => {
                              const adjustedDate = new Date(date)
                              adjustedDate.setHours(0, 0, 0, 0)
                              setReassignDates(prev => ({
                                ...prev,
                                [student.violation_id]: adjustedDate,
                              }))
                            }}
                            includeDates={availableDates}
                            excludeDates={bookedDates[student.id] || []}
                            dayClassName={date =>
                              (bookedDates[student.id] || []).some(d =>
                                isSameDay(d, date)
                              )
                                ? 'bg-pink-500 text-white rounded'
                                : undefined
                            }
                            placeholderText="Select new date"
                            className={`w-full rounded-md border p-1 pl-10 shadow-sm transition-all focus:border-tmechs-forest focus:ring-tmechs-forest ${
                              !reassignDates[student.violation_id] &&
                              !autoAssignNextDate
                                ? 'border-red-500'
                                : 'border-gray-300'
                            } bg-tmechs-forest text-tmechs-light`}
                            dateFormat="MMMM d, yyyy"
                            minDate={selectedDate || new Date()}
                            aria-label={`Select new detention date for ${student.name}`}
                          />
                        </div>
                        {!autoAssignNextDate &&
                          !reassignDates[student.violation_id] && (
                            <span className="whitespace-nowrap text-xs text-red-500">
                              (required)
                            </span>
                          )}
                      </div>
                    </div>
                  ))}
                  <p className="mt-2 text-sm text-tmechs-forest">
                    Students are already scheduled on{' '}
                    <span className="font-semibold text-pink-600">pink</span>{' '}
                    days.
                  </p>
                </div>
              )}
              <div className="group relative mt-4 inline-block w-full">
                <button
                  onClick={handleReassignSubmit}
                  disabled={isSubmitting || availableDates.length === 0}
                  className="btn-primary w-full transition-all hover:bg-tmechs-forest/90 active:bg-tmechs-forest/80 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Confirm reassignments"
                >
                  {isSubmitting ? 'Reassigning...' : 'Confirm Reassignments'}
                </button>
                <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 w-max max-w-xs -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 sm:hidden">
                  Submit the new detention dates for absent students
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}

export default DetentionAttendance