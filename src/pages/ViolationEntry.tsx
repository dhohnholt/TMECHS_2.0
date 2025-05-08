import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import { toast } from 'react-hot-toast'
import {
  Search,
  Calendar,
  AlertCircle,
  Plus,
  X,
  Scan,
  Printer,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
  AlertTriangle,
  Shield,
  User,
  ChevronDown,
  ChevronRight,
  Loader2,
  Camera,
  UserPlus,
  Mail,
  Hash,
} from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import PrintManager from '../components/PrintManager'
import BulkViolationEntry from '../components/BulkViolationEntry'
import BarcodeScanner from '../components/BarcodeScanner'
import Print, { PrintHandle } from '../components/Print'
import 'react-datepicker/dist/react-datepicker.css'

const DEFAULT_VIOLATIONS = [
  { id: 'dress_code', label: 'Dress Code Violation' },
  { id: 'no_id', label: 'No Id or ID not Displayed' },
  { id: 'phone_use', label: 'Improper Phone Use' },
  { id: 'tardy', label: 'Tardy' },
  { id: 'disrespectful', label: 'Disrespectful Behavior' },
]

const WARNING_LIMIT = 2

interface Warning {
  id: string
  violation_type: string
  issued_date: string
  teachers: {
    name: string
  }
}

interface WarningCount {
  violation_type: string
  count: number
}

interface Student {
  id: string
  name: string
  grade: number
  barcode: string
}

interface NewStudent {
  name: string
  email: string
  barcode: string
  grade: number
  parent_email: string
}

// Align with PrintManager's expected Violation interface
interface Violation {
  name: string
  id: string
  violation: string
  date: string
  issued: string
}

interface RecordedViolation {
  id: string
  student_name: string
  student_barcode: string
  violation_type: string
  detention_date: string
  assigned_date: string
}

export default function ViolationEntry() {
  const navigate = useNavigate()
  const [barcode, setBarcode] = useState('')
  const [selectedViolation, setSelectedViolation] = useState('')
  const [customViolation, setCustomViolation] = useState('')
  const [showCustomViolation, setShowCustomViolation] = useState(false)
  const [detentionDate, setDetentionDate] = useState<Date | null>(null)
  const [availableDates, setAvailableDates] = useState<Date[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scannedStudent, setScannedStudent] = useState<Student | null>(null)
  const [showBulkEntry, setShowBulkEntry] = useState(false)
  const [autoPrint, setAutoPrint] = useState(false)
  const [printLabel, setPrintLabel] = useState(false)
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [warningCounts, setWarningCounts] = useState<WarningCount[]>([])
  const [isWarning, setIsWarning] = useState(false)
  const [showWarnings, setShowWarnings] = useState(false)
  const [bookedDates, setBookedDates] = useState<Date[]>([])
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [showBatchPrintModal, setShowBatchPrintModal] = useState(false)
  const [violationsForBatchPrint, setViolationsForBatchPrint] = useState<
    RecordedViolation[]
  >([])
  const [selectedViolations, setSelectedViolations] = useState<string[]>([])
  const [lastViolationId, setLastViolationId] = useState<string | null>(null)
  const [hasMoreViolations, setHasMoreViolations] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [isLoadingViolations, setIsLoadingViolations] = useState(false)
  const [errorViolations, setErrorViolations] = useState<string | null>(null)
  const [lastRecordedViolation, setLastRecordedViolation] =
    useState<RecordedViolation | null>(null)
  const [newStudent, setNewStudent] = useState<NewStudent>({
    name: '',
    email: '',
    barcode: '',
    grade: 9,
    parent_email: '',
  })
  const barcodeBuffer = useRef('')
  const barcodeTimeout = useRef<number | null>(null)
  const printRef = useRef<PrintHandle>(null)
  const searchQuery = useState('')
  const searchResults = useState<Student[]>([])
  const searching = useState(false)
  const showSearchResults = useState(false)
  const searchTimeout = useRef<number | null>(null)
  const [student, setStudent] = useState<Student | null>(null)

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          console.log('Auth state changed:', event)
          if (!session) {
            toast.error('Session expired. Please log in again.')
            navigate('/login')
          }
        }
      }
    )

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [navigate])

  const fetchAvailableDates = async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = format(today, 'yyyy-MM-dd')
      console.log('Today (local):', todayStr)

      const { data, error } = await supabase
        .from('detention_slots')
        .select('date, current_count, capacity')
        .gte('date', todayStr)
        .order('date')

      if (error) throw error

      const availableDates = data
        .filter(slot => slot.current_count < slot.capacity)
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

      console.log('Available Dates:', availableDates)
      setAvailableDates(availableDates)
    } catch (error) {
      console.error('Error fetching available dates:', error)
      toast.error('Failed to load available dates')
    }
  }

  useEffect(() => {
    fetchAvailableDates()
  }, [])

  useEffect(() => {
    if (student) {
      fetchAvailableDates()
    }
  }, [student])

  const fetchWarnings = async (studentId: string) => {
    try {
      const { data: warningData, error: warningError } = await supabase
        .from('warnings')
        .select(
          `
          *,
          teachers:users!warnings_teacher_id_fkey (name)
        `
        )
        .eq('student_id', studentId)
        .eq('is_archived', false)
        .order('issued_date', { ascending: false })

      if (warningError) throw warningError

      setWarnings(warningData || [])
      setShowWarnings(warningData && warningData.length > 0)

      if (warningData && warningData.length > 0) {
        const counts = warningData.reduce(
          (acc: { [key: string]: number }, warning: Warning) => {
            acc[warning.violation_type] = (acc[warning.violation_type] || 0) + 1
            return acc
          },
          {}
        )

        setWarningCounts(
          Object.entries(counts).map(([type, count]) => ({
            violation_type: type,
            count,
          }))
        )
      } else {
        setWarningCounts([])
      }
    } catch (error) {
      console.error('Error fetching warnings:', error)
      if (error instanceof Error) {
        toast.error('Failed to load warnings')
      }
      setWarnings([])
      setWarningCounts([])
      setShowWarnings(false)
    }
  }

  const fetchViolationsForBatchPrint = async (
    lastId: string | null,
    append = false
  ) => {
    try {
      setIsLoadingViolations(true)
      setErrorViolations(null)

      const query = supabase
        .from('violations')
        .select(
          `
          id,
          violation_type,
          detention_date,
          assigned_date,
          barcode,
          students!violations_student_id_fkey (
            name,
            barcode
          )
        `
        )
        .eq('is_warning', false)
        .eq('is_archived', false)
        .order('assigned_date', { ascending: false })
        .limit(10)

      if (lastId) {
        query.lt('id', lastId)
      }

      const { data, error } = await query

      if (error) throw error

      const violations = data.map((violation: any) => ({
        id: violation.id,
        student_name: violation.students.name,
        student_barcode: violation.students.barcode,
        violation_type: violation.violation_type,
        detention_date: violation.detention_date,
        assigned_date: violation.assigned_date,
      }))

      setViolationsForBatchPrint(prev =>
        append ? [...prev, ...violations] : violations
      )
      setLastViolationId(
        violations.length > 0 ? violations[violations.length - 1].id : null
      )
      setHasMoreViolations(violations.length === 10)
    } catch (error) {
      console.error('Error fetching violations for batch print:', error)
      setErrorViolations('Failed to load violations for batch printing')
      toast.error('Failed to load violations')
    } finally {
      setIsLoadingViolations(false)
      setLoadingMore(false)
    }
  }

  const handleLoadMoreViolations = () => {
    setLoadingMore(true)
    fetchViolationsForBatchPrint(lastViolationId, true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!barcode || (!selectedViolation && !customViolation)) {
      toast.error('Please fill in all fields')
      return
    }

    if (!isWarning && !detentionDate) {
      toast.error('Please select a detention date')
      return
    }

    if (!isWarning && detentionDate) {
      const normalizedDetentionDate = new Date(detentionDate)
      normalizedDetentionDate.setHours(0, 0, 0, 0)
      if (
        bookedDates.some(d => d.getTime() === normalizedDetentionDate.getTime())
      ) {
        toast.error('This date is already booked for the student')
        return
      }
    }

    const violationType = showCustomViolation
      ? customViolation
      : selectedViolation

    try {
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, name, barcode')
        .eq('barcode', barcode)
        .single()

      if (studentError || !student) {
        toast.error('Student not found')
        return
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        toast.error('Please log in again')
        return
      }

      const warningCount =
        warningCounts.find(w => w.violation_type === violationType)?.count || 0
      const shouldWarn = isWarning || warningCount < WARNING_LIMIT

      if (isWarning) {
        const { error: warningError } = await supabase.from('warnings').insert({
          student_id: student.id,
          teacher_id: user.id,
          violation_type: violationType,
          issued_date: new Date().toISOString(),
        })

        if (warningError) {
          toast.error('Failed to record warning')
          return
        }

        toast.success('Warning recorded')
        await fetchWarnings(student.id)
      } else {
        const formattedDate = format(detentionDate!, 'yyyy-MM-dd')

        const { data: violation, error: violationError } = await supabase
          .from('violations')
          .insert({
            student_id: student.id,
            barcode: student.barcode,
            violation_type: violationType,
            detention_date: formattedDate,
            original_detention_date: formattedDate,
            teacher_id: user.id,
            assigned_date: new Date().toISOString(),
            is_warning: false,
          })
          .select()
          .single()

        if (violationError || !violation) {
          console.error('Violation insert failed:', violationError)
          toast.error('Violation not recorded. Detention slot may be full.')
          return
        }

        const { error: attendanceError } = await supabase
          .from('attendance')
          .insert({
            violation_id: violation.id,
            student_id: student.id,
            status: 'pending',
            detention_date: formattedDate,
            original_detention_date: formattedDate,
            marked_by: user.id,
          })

        if (attendanceError) {
          console.error('Attendance insert failed:', attendanceError)
        }

        await supabase
          .from('warnings')
          .update({ is_archived: true })
          .eq('student_id', student.id)
          .eq('violation_type', violationType)
          .eq('is_archived', false)

        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/Detention_notification`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ violationId: violation.id }),
          }
        )

        const recordedViolation: RecordedViolation = {
          id: violation.id,
          student_name: student.name,
          student_barcode: student.barcode,
          violation_type: violationType,
          detention_date: formattedDate,
          assigned_date: violation.assigned_date,
        }
        setLastRecordedViolation(recordedViolation)

        if (autoPrint && printRef.current) {
          printRef.current.print()
        }

        toast.success(
          `Violation recorded${autoPrint ? (printLabel ? ' and label printed' : ' and slip printed') : ''}`
        )
        await fetchBookedDates(student.id)

        if (showBatchPrintModal) {
          await fetchViolationsForBatchPrint(null)
        }
      }

      setBarcode('')
      setSelectedViolation('')
      setCustomViolation('')
      setShowCustomViolation(false)
      setDetentionDate(null)
      setScannedStudent(null)
      setIsWarning(false)
    } catch (error) {
      toast.error('An error occurred')
      console.error('Error:', error)
    }
  }

  const searchStudents = async (query: string) => {
    if (!query.trim()) {
      searchResults[1]([])
      return
    }

    searching[1](true)
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, grade, barcode')
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(5)

      if (error) throw error
      searchResults[1](data || [])
      showSearchResults[1](true)
    } catch (error) {
      console.error('Error searching students:', error)
      toast.error('Failed to search students')
    } finally {
      searching[1](false)
    }
  }

  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    if (searchQuery[0].trim()) {
      searchTimeout.current = window.setTimeout(() => {
        searchStudents(searchQuery[0])
      }, 300)
    } else {
      searchResults[1]([])
      showSearchResults[1](false)
    }

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current)
      }
    }
  }, [searchQuery[0]])

  const selectStudent = (student: Student) => {
    setBarcode(student.barcode)
    setScannedStudent(student)
    searchQuery[1]('')
    showSearchResults[1](false)
    fetchWarnings(student.id)
    fetchBookedDates(student.id)
  }

  const fetchStudentByBarcode = async (barcode: string) => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()
      if (sessionError || !session) {
        toast.error('Session expired. Please log in again.')
        navigate('/login')
        return
      }

      const trimmedBarcode = barcode.trim()
      console.log('Scanning barcode:', trimmedBarcode)
      const { data: students, error } = await supabase
        .from('students')
        .select('id, name, grade, barcode')
        .eq('barcode', trimmedBarcode)

      if (error) {
        console.error('Supabase error:', error)
        toast.error('Student not found')
        setScannedStudent(null)
        setShowAddStudentModal(true)
      } else if (students.length === 0) {
        toast.error('Student not found')
        setScannedStudent(null)
        setShowAddStudentModal(true)
      } else if (students.length > 1) {
        console.warn('Multiple students found with barcode:', trimmedBarcode)
        toast.error('Multiple students found with this barcode')
        setScannedStudent(null)
      } else {
        const student = students[0]
        setScannedStudent(student)
        toast.success(`Found: ${student.name}`)
        await fetchWarnings(student.id)
        await fetchBookedDates(student.id)
      }
    } catch (error) {
      console.error('Error fetching student:', error)
      toast.error('Error looking up student')
    }
  }

  const fetchBookedDates = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('violations')
        .select('detention_date')
        .eq('student_id', studentId)
        .eq('is_warning', false)
        .eq('is_archived', false)

      if (error) throw error

      const dates = (data || [])
        .map(v => {
          const [year, month, day] = v.detention_date.split('-').map(Number)
          const d = new Date(year, month - 1, day)
          d.setHours(0, 0, 0, 0)
          console.log(
            `Parsed detention_date: ${v.detention_date} -> ${d.toISOString()}`
          )
          return d
        })
        .filter(d => !isNaN(d.getTime()))

      console.log(
        'Booked Dates:',
        dates.map(d => d.toISOString())
      )
      setBookedDates(dates)
      return dates
    } catch (error) {
      console.error('Error fetching booked dates:', error)
      setBookedDates([])
      return []
    }
  }

  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (!isScanning) return

      if (barcodeTimeout.current) {
        window.clearTimeout(barcodeTimeout.current)
      }

      if (e.key !== 'Enter' && /[a-zA-Z0-9]/.test(e.key)) {
        barcodeBuffer.current += e.key
      }

      barcodeTimeout.current = window.setTimeout(async () => {
        if (barcodeBuffer.current) {
          const cleanedBarcode = barcodeBuffer.current.trim()
          console.log('Captured barcode buffer:', cleanedBarcode)
          setBarcode(cleanedBarcode)
          await fetchStudentByBarcode(cleanedBarcode)
          barcodeBuffer.current = ''
          setIsScanning(false)
        }
      }, 100)
    }

    window.addEventListener('keypress', handleKeyPress)
    return () => {
      window.removeEventListener('keypress', handleKeyPress)
      if (barcodeTimeout.current) {
        window.clearTimeout(barcodeTimeout.current)
      }
    }
  }, [isScanning])

  const startScanning = () => {
    setIsScanning(true)
    barcodeBuffer.current = ''
    toast.success('Scanning mode activated')
  }

  useEffect(() => {
    console.log(
      '📅 Booked Dates:',
      bookedDates.map(d => d.toISOString())
    )
  }, [bookedDates])

  const toggleViolationSelection = (id: string) => {
    setSelectedViolations(prev =>
      prev.includes(id) ? prev.filter(vid => vid !== id) : [...prev, id]
    )
  }

  const selectAllViolations = () => {
    if (selectedViolations.length === violationsForBatchPrint.length) {
      setSelectedViolations([])
    } else {
      setSelectedViolations(violationsForBatchPrint.map(v => v.id))
    }
  }

  const handleBatchPrint = () => {
    if (selectedViolations.length === 0) {
      toast.error('Please select at least one violation to print')
      return
    }

    toast.success(
      `Batch printing ${selectedViolations.length} ${printLabel ? 'labels' : 'slips'}`
    )
    setShowBatchPrintModal(false)
    setSelectedViolations([])
    setViolationsForBatchPrint([])
    setLastViolationId(null)
    setHasMoreViolations(true)
  }

  return (
    <div className="min-h-screen bg-tmechs-page-gradient py-6 sm:py-12">
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
              <h1 className="relative text-2xl font-bold text-[var(--color-text)] sm:text-4xl">
                Record Student Violation
                <span className="absolute -bottom-1 left-0 h-1 w-20 rounded-full bg-tmechs-page-gradient sm:-bottom-2 sm:w-24" />
              </h1>
            </div>
            <div className="flex flex-col items-start space-y-3 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
              <button
                onClick={() => setAutoPrint(!autoPrint)}
                className="flex w-full items-center space-x-2 rounded-full px-3 py-2 text-tmechs-forest transition-all duration-300 hover:scale-105 hover:bg-tmechs-sage/20 sm:w-auto"
              >
                {autoPrint ? (
                  <ToggleRight className="h-5 w-5 transition-all duration-300 hover:rotate-12 sm:h-6 sm:w-6" />
                ) : (
                  <ToggleLeft className="h-5 w-5 transition-all duration-300 hover:rotate-12 sm:h-6 sm:w-6" />
                )}
                <span className="text-base font-medium tracking-wide sm:text-lg">
                  Auto Print {autoPrint ? 'On' : 'Off'}
                </span>
              </button>
              <button
                onClick={() => setShowBulkEntry(!showBulkEntry)}
                className="w-full rounded-full px-3 py-2 text-tmechs-forest transition-all duration-300 hover:scale-105 hover:bg-tmechs-sage/20 sm:w-auto"
              >
                <span className="text-base font-medium tracking-wide sm:text-lg">
                  {showBulkEntry ? 'Single Entry' : 'Bulk Entry'}
                </span>
              </button>
              <label className="flex items-center space-x-2 rounded-full px-3 py-2 text-tmechs-forest transition-all duration-300 hover:scale-105 hover:bg-tmechs-sage/20">
                <input
                  type="checkbox"
                  checked={printLabel}
                  onChange={e => setPrintLabel(e.target.checked)}
                  className="h-5 w-5 text-tmechs-forest transition-all duration-300"
                />
                <span className="text-base font-medium tracking-wide sm:text-lg">
                  Print Label
                </span>
              </label>
              <button
                onClick={() => {
                  setShowBatchPrintModal(true)
                  fetchViolationsForBatchPrint(null)
                }}
                className="w-full rounded-full px-3 py-2 text-tmechs-forest transition-all duration-300 hover:scale-105 hover:bg-tmechs-sage/20 sm:w-auto"
              >
                <span className="text-base font-medium tracking-wide sm:text-lg">
                  Batch Print Labels
                </span>
              </button>
            </div>
          </div>
        </div>

        {showBulkEntry ? (
          <BulkViolationEntry />
        ) : (
          <div className="rounded-xl bg-white/80 p-4 shadow-lg backdrop-blur-md transition-all duration-300 hover:shadow-xl sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-8">
              {/* Student Search Section */}
              <div className="space-y-3 rounded-lg border border-gray-200 p-4 sm:space-y-4 sm:p-6">
                <label className="block text-xs font-medium tracking-wide text-tmechs-forest sm:text-sm">
                  Student ID Barcode or Name
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-tmechs-sage sm:left-4 sm:h-6 sm:w-6" />
                  {barcode ? (
                    <div className="flex">
                      <input
                        type="text"
                        value={barcode}
                        onChange={e => setBarcode(e.target.value)}
                        className="w-full rounded-l-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-700 shadow-sm transition-all duration-300 focus:border-tmechs-forest focus:ring-2 focus:ring-tmechs-forest/50 sm:py-3 sm:pl-12"
                        placeholder="Scan or enter student ID"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setBarcode('')
                          setScannedStudent(null)
                          searchQuery[1]('')
                        }}
                        className="rounded-r-lg bg-tmechs-forest px-3 text-white transition-all duration-300 hover:scale-105 hover:bg-tmechs-forest/90 sm:px-4"
                      >
                        <X className="h-5 w-5 sm:h-6 sm:w-6" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery[0]}
                        onChange={e => searchQuery[1](e.target.value)}
                        className="w-full rounded-l-lg border border-gray-300 bg-white py-2 pl-10 pr-16 text-gray-700 shadow-sm transition-all duration-300 focus:border-tmechs-forest focus:ring-2 focus:ring-tmechs-forest/50 sm:py-3 sm:pl-12 sm:pr-20"
                        placeholder="Search by student name..."
                      />
                      <div className="absolute inset-y-0 right-0 flex">
                        <button
                          type="button"
                          onClick={() => setShowScanner(true)}
                          className="bg-tmechs-sage px-3 transition-all duration-300 hover:scale-105 hover:bg-tmechs-sage/80 sm:px-4"
                          title="Scan with camera"
                        >
                          <Camera className="h-5 w-5 text-gray-500 transition-all duration-300 hover:rotate-12 sm:h-6 sm:w-6" />
                        </button>
                        <button
                          type="button"
                          onClick={startScanning}
                          className={`rounded-r-lg border border-gray-300 px-3 transition-all duration-300 hover:scale-105 sm:px-4 ${
                            isScanning
                              ? 'bg-tmechs-sage text-green-700'
                              : 'bg-tmechs-sage hover:bg-tmechs-sage/80'
                          }`}
                          title="Scan with barcode scanner"
                        >
                          <Scan className="h-5 w-5 transition-all duration-300 hover:rotate-12 sm:h-6 sm:w-6" />
                        </button>
                      </div>
                    </div>
                  )}
                  {searching[0] && (
                    <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 transform animate-spin text-tmechs-forest sm:right-4 sm:h-6 sm:w-6" />
                  )}
                </div>
                {showSearchResults[0] && searchResults[0].length > 0 && (
                  <div className="animate-fade-in absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-tmechs-forest/95 shadow-lg backdrop-blur-sm">
                    {searchResults[0].map(student => (
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
                        <div className="text-xs text-tmechs-sage sm:text-sm">
                          Grade {student.grade}
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowAddStudentModal(true)}
                      className="flex w-full items-center px-4 py-2 text-left text-tmechs-sage transition-all duration-300 hover:bg-tmechs-sage/30 sm:py-3"
                    >
                      <UserPlus className="mr-2 h-5 w-5 transition-all duration-300 hover:rotate-12 sm:h-6 sm:w-6" />
                      <span className="text-base sm:text-lg">
                        Add New Student
                      </span>
                    </button>
                  </div>
                )}
                {scannedStudent && (
                  <div className="flex items-center rounded-lg bg-tmechs-sage/10 p-3 sm:p-4">
                    <User className="mr-2 h-5 w-5 text-tmechs-forest transition-all duration-300 hover:rotate-12 sm:mr-3 sm:h-6 sm:w-6" />
                    <div>
                      <p className="text-base font-medium text-tmechs-forest sm:text-lg">
                        {scannedStudent.name}
                      </p>
                      <p className="text-xs text-tmechs-forest/80 sm:text-sm">
                        Grade {scannedStudent.grade}
                      </p>
                    </div>
                  </div>
                )}
                {isScanning && (
                  <div className="rounded-lg bg-green-50 p-3 sm:p-4">
                    <p className="text-xs leading-relaxed text-green-700 sm:text-sm">
                      Scanning mode active - Ready to scan student ID
                      <br />
                      <span className="italic">
                        If the scanner isn’t working, try refreshing the
                        browser.
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Warnings Section */}
              {warnings.length > 0 && (
                <div className="rounded-lg border border-gray-200 p-4 sm:p-6">
                  <button
                    type="button"
                    onClick={() => setShowWarnings(!showWarnings)}
                    className="flex w-full items-center justify-between rounded-lg p-3 text-left transition-all duration-300 hover:bg-yellow-100/50 focus:outline-none sm:p-4"
                  >
                    <div className="flex items-center">
                      <AlertTriangle className="mr-2 h-5 w-5 text-yellow-800 transition-all duration-300 hover:rotate-12 sm:mr-3 sm:h-6 sm:w-6" />
                      <h3 className="text-base font-medium text-yellow-800 sm:text-lg">
                        Previous Warnings ({warnings.length})
                      </h3>
                    </div>
                    {showWarnings ? (
                      <ChevronDown className="h-5 w-5 text-yellow-800 transition-all duration-300 hover:rotate-180 sm:h-6 sm:w-6" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-yellow-800 transition-all duration-300 hover:rotate-90 sm:h-6 sm:w-6" />
                    )}
                  </button>

                  {showWarnings && (
                    <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
                      {warningCounts.map((count, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between text-xs text-yellow-700 sm:text-sm"
                        >
                          <span className="font-medium">
                            {count.violation_type}
                          </span>
                          <span className="font-semibold">
                            {count.count}/{WARNING_LIMIT} warnings
                          </span>
                        </div>
                      ))}
                      <div className="mt-3 border-t border-yellow-200 pt-3 sm:mt-4 sm:pt-4">
                        <div className="space-y-2 sm:space-y-3">
                          {warnings.map((warning, index) => (
                            <div
                              key={index}
                              className="text-xs leading-relaxed text-yellow-700 sm:text-sm"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">
                                  {new Date(
                                    warning.issued_date
                                  ).toLocaleDateString()}
                                </span>
                                <span className="text-xs text-yellow-600">
                                  by {warning.teachers.name}
                                </span>
                              </div>
                              <p className="mt-1">{warning.violation_type}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Violation Type Section */}
              <div className="space-y-3 rounded-lg border border-gray-200 p-4 sm:space-y-4 sm:p-6">
                <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <label className="block text-xs font-medium tracking-wide text-tmechs-forest sm:text-sm">
                    Violation Type
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCustomViolation(!showCustomViolation)}
                    className="flex items-center rounded-full px-2 py-1 text-xs text-tmechs-forest transition-all duration-300 hover:scale-105 hover:bg-tmechs-sage/20 sm:px-3 sm:text-sm"
                  >
                    {showCustomViolation ? (
                      <>
                        <X className="mr-1 h-4 w-4 transition-all duration-300 hover:rotate-90 sm:h-5 sm:w-5" />
                        Use preset violation
                      </>
                    ) : (
                      <>
                        <Plus className="mr-1 h-4 w-4 transition-all duration-300 hover:rotate-90 sm:h-5 sm:w-5" />
                        Add custom violation
                      </>
                    )}
                  </button>
                </div>

                {showCustomViolation ? (
                  <input
                    type="text"
                    value={customViolation}
                    onChange={e => setCustomViolation(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2 shadow-sm transition-all duration-300 focus:border-tmechs-forest focus:ring-2 focus:ring-tmechs-forest/50 sm:p-3"
                    placeholder="Enter custom violation"
                  />
                ) : (
                  <select
                    value={selectedViolation}
                    onChange={e => setSelectedViolation(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-700 shadow-sm transition-all duration-300 focus:border-tmechs-forest focus:ring-2 focus:ring-tmechs-forest/50 sm:p-3"
                  >
                    <option value="">Select violation type</option>
                    {DEFAULT_VIOLATIONS.map(violation => (
                      <option key={violation.id} value={violation.id}>
                        {violation.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Warning Toggle */}
              <div className="flex flex-col space-y-2 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:p-4">
                <label className="flex cursor-pointer items-center space-x-2 sm:space-x-3">
                  <input
                    type="checkbox"
                    checked={isWarning}
                    onChange={e => {
                      setIsWarning(e.target.checked)
                      if (e.target.checked) {
                        setDetentionDate(null)
                      }
                    }}
                    disabled={
                      selectedViolation &&
                      warningCounts.find(
                        w => w.violation_type === selectedViolation
                      )?.count >= WARNING_LIMIT
                    }
                    className="h-4 w-4 rounded border-gray-300 text-tmechs-forest transition-all duration-300 focus:ring-tmechs-forest/50 sm:h-5 sm:w-5"
                  />
                  <span className="text-xs font-medium tracking-wide text-gray-700 sm:text-sm">
                    Issue Warning
                  </span>
                  <Shield className="h-4 w-4 w-5 text-tmechs-forest transition-all duration-300 hover:rotate-12 sm:h-5" />
                </label>
                {selectedViolation &&
                  warningCounts.find(
                    w => w.violation_type === selectedViolation
                  )?.count === WARNING_LIMIT && (
                    <span className="text-xs font-medium text-red-600 sm:text-sm">
                      Warning limit reached for this violation type
                    </span>
                  )}
              </div>

              {/* Detention Date Section */}
              {!isWarning && (
                <div className="space-y-3 rounded-lg border border-gray-200 p-4 sm:space-y-4 sm:p-6">
                  <label className="block text-xs font-medium tracking-wide text-tmechs-forest sm:text-sm">
                    Detention Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-tmechs-forest transition-all duration-300 hover:rotate-12 sm:left-4 sm:h-6 sm:w-6" />
                    <DatePicker
                      selected={detentionDate}
                      onChange={date => {
                        const adjusted = new Date(date)
                        adjusted.setHours(0, 0, 0, 0)
                        console.log(`Selected date: ${adjusted.toISOString()}`)
                        setDetentionDate(adjusted)
                      }}
                      includeDates={availableDates}
                      excludeDates={bookedDates}
                      dayClassName={date => {
                        const normalizedDate = new Date(date)
                        normalizedDate.setHours(0, 0, 0, 0)
                        const isBooked = bookedDates.some(d => {
                          const match = d.getTime() === normalizedDate.getTime()
                          console.log(
                            `Comparing ${normalizedDate.toISOString()} with booked ${d.toISOString()}: ${match}`
                          )
                          return match
                        })
                        return isBooked
                          ? 'react-datepicker__day--booked'
                          : undefined
                      }}
                      placeholderText="Select detention date"
                      className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-700 shadow-sm transition-all duration-300 focus:border-tmechs-forest focus:ring-2 focus:ring-tmechs-forest/50 sm:py-3 sm:pl-12"
                      dateFormat="MMMM d, yyyy"
                      minDate={(() => {
                        const min = new Date()
                        min.setHours(0, 0, 0, 0)
                        return min
                      })()}
                    />
                  </div>
                  <p className="text-xs leading-relaxed text-tmechs-forest sm:text-sm">
                    Students are already scheduled on{' '}
                    <span className="font-semibold text-pink-600">pink</span>{' '}
                    days.
                  </p>
                </div>
              )}

              {/* Info Section */}
              <div className="flex items-start rounded-lg bg-tmechs-sage/10 p-4 sm:p-6">
                <AlertCircle className="mr-2 mt-1 h-5 w-5 text-tmechs-forest transition-all duration-300 hover:rotate-12 sm:mr-3 sm:h-6 sm:w-6" />
                <p className="text-xs leading-relaxed text-tmechs-forest sm:text-sm">
                  {isWarning ? (
                    'A warning will be recorded and tracked. After 2 warnings of the same type, detention will be required.'
                  ) : (
                    <>
                      An email will be automatically sent to the student with
                      detention details once submitted.
                      {autoPrint &&
                        (printLabel
                          ? ' A detention label will be printed automatically.'
                          : ' A detention slip will be printed automatically.')}
                    </>
                  )}
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full rounded-full bg-gradient-to-r from-tmechs-forest to-tmechs-forest/80 py-3 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl active:bg-tmechs-forest/90 sm:py-4 sm:text-lg"
              >
                {isWarning
                  ? 'Record Warning'
                  : `Record Violation${autoPrint ? (printLabel ? ' & Print Label' : ' & Print Slip') : ''}`}
              </button>
            </form>

            {/* Last Violation Section */}
            {lastRecordedViolation && !isWarning && (
              <div className="mt-6 border-t border-gray-200 p-4 sm:mt-8 sm:p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 sm:text-xl">
                    Last Recorded Violation
                  </h3>
                  {!autoPrint && (
                    <Print
                      type="detention"
                      data={{
                        name: lastRecordedViolation.student_name,
                        barcode: lastRecordedViolation.student_barcode,
                        violation_type: lastRecordedViolation.violation_type,
                        detention_date: lastRecordedViolation.detention_date,
                      }}
                      printLabel={printLabel}
                    />
                  )}
                </div>
                <div className="mt-4">
                  <p>
                    <strong>Name:</strong> {lastRecordedViolation.student_name}
                  </p>
                  <p>
                    <strong>ID:</strong> {lastRecordedViolation.student_barcode}
                  </p>
                  <p>
                    <strong>Violation:</strong>{' '}
                    {lastRecordedViolation.violation_type}
                  </p>
                  <p>
                    <strong>Detention Date:</strong>{' '}
                    {lastRecordedViolation.detention_date}
                  </p>
                  <p>
                    <strong>Assigned Date:</strong>{' '}
                    {new Date(
                      lastRecordedViolation.assigned_date
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}

            {/* Hidden Print component for auto-print */}
            {lastRecordedViolation && (
              <div style={{ display: 'none' }}>
                <Print
                  ref={printRef}
                  type="detention"
                  data={{
                    name: lastRecordedViolation.student_name,
                    barcode: lastRecordedViolation.student_barcode,
                    violation_type: lastRecordedViolation.violation_type,
                    detention_date: lastRecordedViolation.detention_date,
                  }}
                  showButton={false}
                  printLabel={printLabel}
                />
              </div>
            )}
          </div>
        )}

        {/* Batch Print Modal */}
        {showBatchPrintModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
            <div className="animate-fade-in mx-4 w-11/12 rounded-xl bg-white/90 p-4 shadow-2xl backdrop-blur-md sm:max-w-4xl sm:p-8">
              <h2 className="mb-4 flex items-center text-xl font-semibold text-gray-800 sm:mb-6 sm:text-2xl">
                <Printer className="mr-2 h-6 w-6 text-tmechs-forest transition-all duration-300 hover:rotate-12 sm:mr-3 sm:h-7 sm:w-7" />
                Batch Print {printLabel ? 'Labels' : 'Slips'}
              </h2>

              {isLoadingViolations && violationsForBatchPrint.length === 0 ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-tmechs-forest" />
                </div>
              ) : errorViolations ? (
                <div className="py-4 text-center">
                  <p className="text-red-500">{errorViolations}</p>
                  <button
                    onClick={() => fetchViolationsForBatchPrint(null)}
                    className="mt-2 rounded-full px-4 py-2 text-tmechs-forest transition-all duration-300 hover:scale-105 hover:bg-tmechs-sage/20"
                  >
                    Retry
                  </button>
                </div>
              ) : violationsForBatchPrint.length === 0 ? (
                <p className="py-4 text-center text-gray-700">
                  No violations available to print.
                </p>
              ) : (
                <>
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-tmechs-sage/20">
                          <th className="p-2 text-left">
                            <input
                              type="checkbox"
                              checked={
                                selectedViolations.length ===
                                violationsForBatchPrint.length
                              }
                              onChange={selectAllViolations}
                              className="h-4 w-4 text-tmechs-forest"
                            />
                          </th>
                          <th className="p-2 text-left text-sm font-medium text-gray-700 sm:text-base">
                            Student Name
                          </th>
                          <th className="p-2 text-left text-sm font-medium text-gray-700 sm:text-base">
                            Student ID
                          </th>
                          <th className="p-2 text-left text-sm font-medium text-gray-700 sm:text-base">
                            Violation Type
                          </th>
                          <th className="p-2 text-left text-sm font-medium text-gray-700 sm:text-base">
                            Detention Date
                          </th>
                          <th className="p-2 text-left text-sm font-medium text-gray-700 sm:text-base">
                            Assigned Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {violationsForBatchPrint.map((violation, index) => (
                          <tr
                            key={violation.id}
                            className={`border-b ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                          >
                            <td className="p-2">
                              <input
                                type="checkbox"
                                checked={selectedViolations.includes(
                                  violation.id
                                )}
                                onChange={() =>
                                  toggleViolationSelection(violation.id)
                                }
                                className="h-4 w-4 text-tmechs-forest"
                              />
                            </td>
                            <td className="p-2 text-sm text-gray-700 sm:text-base">
                              {violation.student_name}
                            </td>
                            <td className="p-2 text-sm text-gray-700 sm:text-base">
                              {violation.student_barcode}
                            </td>
                            <td className="p-2 text-sm text-gray-700 sm:text-base">
                              {violation.violation_type}
                            </td>
                            <td className="p-2 text-sm text-gray-700 sm:text-base">
                              {violation.detention_date}
                            </td>
                            <td className="p-2 text-sm text-gray-700 sm:text-base">
                              {new Date(
                                violation.assigned_date
                              ).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {hasMoreViolations && (
                    <div className="mt-4 flex justify-center">
                      <button
                        onClick={handleLoadMoreViolations}
                        disabled={loadingMore}
                        className="flex items-center rounded-full px-4 py-2 text-tmechs-forest transition-all duration-300 hover:scale-105 hover:bg-tmechs-sage/20 disabled:opacity-50"
                      >
                        {loadingMore ? (
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                          <Plus className="mr-2 h-5 w-5" />
                        )}
                        <span className="text-base font-medium">Load More</span>
                      </button>
                    </div>
                  )}
                </>
              )}

              <div className="mt-6 flex flex-col space-y-3 sm:mt-8 sm:flex-row sm:justify-end sm:space-x-4 sm:space-y-0">
                <button
                  onClick={() => {
                    setShowBatchPrintModal(false)
                    setSelectedViolations([])
                    setViolationsForBatchPrint([])
                    setLastViolationId(null)
                    setHasMoreViolations(true)
                  }}
                  className="w-full rounded-full px-4 py-2 text-gray-700 transition-all duration-300 hover:scale-105 hover:bg-gray-100 sm:w-auto sm:px-6 sm:py-3"
                >
                  Cancel
                </button>
                <PrintManager
                  violations={violationsForBatchPrint
                    .filter(v => selectedViolations.includes(v.id))
                    .map(v => ({
                      name: v.student_name,
                      id: v.student_barcode,
                      violation: v.violation_type,
                      date: v.detention_date,
                      issued: new Date(v.assigned_date).toLocaleDateString(),
                    }))}
                  printLabel={printLabel}
                />
              </div>
            </div>
          </div>
        )}

        {/* Add Student Modal */}
        {showAddStudentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
            <div className="animate-fade-in mx-4 w-11/12 rounded-xl bg-white/90 p-4 shadow-2xl backdrop-blur-md sm:max-w-md sm:p-8">
              <h2 className="mb-4 flex items-center text-xl font-semibold text-gray-800 sm:mb-6 sm:text-2xl">
                <UserPlus className="mr-2 h-6 w-6 text-tmechs-forest transition-all duration-300 hover:rotate-12 sm:mr-3 sm:h-7 sm:w-7" />
                Add New Student
              </h2>

              <form
                onSubmit={async e => {
                  e.preventDefault()
                  try {
                    const { data, error } = await supabase
                      .from('students')
                      .insert([newStudent])
                      .select()
                      .single()

                    if (error) throw error

                    toast.success('Student added successfully')
                    setShowAddStudentModal(false)
                    setBarcode(data.barcode)
                    setScannedStudent(data)

                    setNewStudent({
                      name: '',
                      email: '',
                      barcode: '',
                      grade: 9,
                      parent_email: '',
                    })
                  } catch (error) {
                    console.error('Error adding student:', error)
                    toast.error('Failed to add student')
                  }
                }}
              >
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <label className="block text-xs font-medium tracking-wide text-gray-700 sm:text-sm">
                      Student Name
                    </label>
                    <input
                      type="text"
                      value={newStudent.name}
                      onChange={e =>
                        setNewStudent({ ...newStudent, name: e.target.value })
                      }
                      className="mt-1 block w-full rounded-lg border border-gray-300 p-2 shadow-sm transition-all duration-300 focus:border-tmechs-forest focus:ring-2 focus:ring-tmechs-forest/50 sm:mt-2 sm:p-3"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium tracking-wide text-gray-700 sm:text-sm">
                      Student Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400 transition-all duration-300 hover:rotate-12 sm:left-4 sm:h-6 sm:w-6" />
                      <input
                        type="email"
                        value={newStudent.email}
                        onChange={e =>
                          setNewStudent({
                            ...newStudent,
                            email: e.target.value,
                          })
                        }
                        className="mt-1 block w-full rounded-lg border border-gray-300 p-2 pl-10 shadow-sm transition-all duration-300 focus:border-tmechs-forest focus:ring-2 focus:ring-tmechs-forest/50 sm:mt-2 sm:p-3 sm:pl-12"
                        placeholder="student@tmechs.edu"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium tracking-wide text-gray-700 sm:text-sm">
                      Parent Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400 transition-all duration-300 hover:rotate-12 sm:left-4 sm:h-6 sm:w-6" />
                      <input
                        type="email"
                        value={newStudent.parent_email}
                        onChange={e =>
                          setNewStudent({
                            ...newStudent,
                            parent_email: e.target.value,
                          })
                        }
                        className="mt-1 block w-full rounded-lg border border-gray-300 p-2 pl-10 shadow-sm transition-all duration-300 focus:border-tmechs-forest focus:ring-2 focus:ring-tmechs-forest/50 sm:mt-2 sm:p-3 sm:pl-12"
                        placeholder="parent@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium tracking-wide text-gray-700 sm:text-sm">
                      Student ID
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400 transition-all duration-300 hover:rotate-12 sm:left-4 sm:h-6 sm:w-6" />
                      <input
                        type="text"
                        value={newStudent.barcode}
                        onChange={e =>
                          setNewStudent({
                            ...newStudent,
                            barcode: e.target.value,
                          })
                        }
                        className="mt-1 block w-full rounded-lg border border-gray-300 p-2 pl-10 shadow-sm transition-all duration-300 focus:border-tmechs-forest focus:ring-2 focus:ring-tmechs-forest/50 sm:mt-2 sm:p-3 sm:pl-12"
                        placeholder="Enter student ID"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium tracking-wide text-gray-700 sm:text-sm">
                      Grade Level
                    </label>
                    <select
                      value={newStudent.grade}
                      onChange={e =>
                        setNewStudent({
                          ...newStudent,
                          grade: parseInt(e.target.value),
                        })
                      }
                      className="mt-1 block w-full rounded-lg border border-gray-300 p-2 shadow-sm transition-all duration-300 focus:border-tmechs-forest focus:ring-2 focus:ring-tmechs-forest/50 sm:mt-2 sm:p-3"
                    >
                      {[9, 10, 11, 12].map(grade => (
                        <option key={grade} value={grade}>
                          Grade {grade}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex flex-col space-y-3 sm:mt-8 sm:flex-row sm:justify-end sm:space-x-4 sm:space-y-0">
                  <button
                    type="button"
                    onClick={() => setShowAddStudentModal(false)}
                    className="w-full rounded-full px-4 py-2 text-gray-700 transition-all duration-300 hover:scale-105 hover:bg-gray-100 sm:w-auto sm:px-6 sm:py-3"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center rounded-full bg-gradient-to-r from-tmechs-forest to-tmechs-forest/80 px-4 py-2 text-white transition-all duration-300 hover:scale-105 hover:shadow-lg active:bg-tmechs-forest/90 sm:w-auto sm:px-6 sm:py-3"
                  >
                    <UserPlus className="mr-2 h-5 w-5 transition-all duration-300 hover:rotate-12 sm:h-6 sm:w-6" />
                    Add Student
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Camera Scanner Modal */}
        {showScanner && (
          <BarcodeScanner
            onScan={async barcode => {
              const cleanedBarcode = barcode.trim()
              console.log('Camera scanned barcode:', cleanedBarcode)
              setBarcode(cleanedBarcode)
              await fetchStudentByBarcode(cleanedBarcode)
              setShowScanner(false)
            }}
            onClose={() => setShowScanner(false)}
            message="If the camera scanner isn’t working, try refreshing the browser."
          />
        )}
      </div>
    </div>
  )
}
