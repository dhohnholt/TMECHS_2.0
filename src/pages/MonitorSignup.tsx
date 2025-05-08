import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import {
  Calendar,
  Users,
  Clock,
  ArrowLeft,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import 'react-datepicker/dist/react-datepicker.css'

interface BlockedDate {
  date: Date
  teacherName: string
  currentCount: number
  capacity: number
}

interface ModalState {
  isOpen: boolean
  message: string
  onConfirm: () => void
}

const quotes = [
  'Together, we build a stronger Maverick community!',
  'Every step forward is a victory for Maverick Pride!',
  'Inspire, support, succeed—let’s make it happen!',
  'Mavericks stand tall with responsibility and unity!',
]

export default function TeacherSignup() {
  const navigate = useNavigate()
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [capacity, setCapacity] = useState(20)
  const [isLoading, setIsLoading] = useState(false)
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  })
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()
        if (error || !user) {
          toast.error('Please log in first')
          navigate('/login')
          return
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, role')
          .eq('id', user.id)
          .single()

        if (
          userError ||
          !userData ||
          !['teacher', 'admin'].includes(userData.role)
        ) {
          toast.error(
            'Only teachers and admins can sign up for detention slots.'
          )
          navigate('/register')
          return
        }
      } catch (error) {
        console.error('Auth check error:', error)
        toast.error('Failed to verify account')
        navigate('/login')
      }
    }

    checkAuth()
    fetchBlockedDates()
  }, [navigate])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex(prev => (prev + 1) % quotes.length)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchBlockedDates = async () => {
    try {
      const { data, error } = await supabase
        .from('detention_slots')
        .select(
          `
          date,
          current_count,
          capacity,
          users!detention_slots_teacher_id_fkey (
            name
          )
        `
        )
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date')

      if (error) throw error

      setBlockedDates(
        data.map(slot => ({
          date: new Date(slot.date + 'T00:00:00'),
          teacherName: slot.users.name || 'Unknown',
          currentCount: slot.current_count || 0,
          capacity: slot.capacity || 20,
        }))
      )
    } catch (error) {
      console.error('Error fetching blocked dates:', error)
      toast.error('Failed to load schedule')
    }
  }

  const openModal = (message: string, onConfirm: () => void) => {
    setModal({ isOpen: true, message, onConfirm })
  }

  const closeModal = () => {
    setModal({ isOpen: false, message: '', onConfirm: () => {} })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedDates.length === 0) {
      toast.error('Please select at least one date')
      return
    }
    if (capacity < 1 || capacity > 50) {
      toast.error('Capacity must be between 1 and 50')
      return
    }

    openModal(
      `Are you sure you want to sign up for ${selectedDates.length} detention slot${selectedDates.length > 1 ? 's' : ''}?`,
      async () => {
        setIsLoading(true)
        try {
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser()
          if (userError || !user) {
            toast.error('Please log in first')
            navigate('/login')
            return
          }

          const session = await supabase.auth.getSession()
          if (!session.data.session?.access_token) {
            throw new Error('Session expired. Please log in again.')
          }

          const slotsPromises = selectedDates.map(async date => {
            const dateStr = date.toISOString().split('T')[0]
            const { data: existingSlot, error: checkError } = await supabase
              .from('detention_slots')
              .select('id')
              .eq('date', dateStr)
              .single()

            if (checkError && checkError.code !== 'PGRST116') {
              throw checkError
            }
            if (existingSlot) {
              throw new Error(`Date ${dateStr} is already assigned`)
            }

            const { data: insertData, error: insertError } = await supabase
              .from('detention_slots')
              .insert({
                date: dateStr,
                teacher_id: user.id,
                capacity,
                current_count: 0,
              })
              .select()
              .single()

            if (insertError || !insertData) {
              throw insertError ?? new Error('Insert failed')
            }

            try {
              const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/Teacher_Signup`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${session.data.session.access_token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    teacher_email: user.email,
                    teacher_name: user.user_metadata?.name ?? 'Teacher',
                    date: dateStr,
                  }),
                }
              )

              if (!res.ok) {
                console.error('Email edge function failed:', await res.text())
                toast.warn(`Slot for ${dateStr} created, but email failed`)
              }
            } catch (emailError) {
              console.error('Email error:', emailError)
              toast.warn(`Slot for ${dateStr} created, but email failed`)
            }

            return insertData
          })

          const results = await Promise.allSettled(slotsPromises)
          const failures = results.filter(
            r => r.status === 'rejected'
          ) as PromiseRejectedResult[]

          if (failures.length > 0) {
            failures.forEach(f => console.error('Slot failure:', f.reason))
            toast.error(
              `Failed to schedule ${failures.length} date${failures.length > 1 ? 's' : ''}`
            )
            return
          }

          toast.success(
            `Successfully signed up for ${selectedDates.length} detention slot${selectedDates.length > 1 ? 's' : ''}`
          )
          setSelectedDates([])
          setCapacity(20)
          await fetchBlockedDates()
        } catch (error: any) {
          console.error('Signup error:', error)
          toast.error(error.message || 'Failed to sign up. Please try again.')
        } finally {
          setIsLoading(false)
        }
      }
    )
  }

  const handleDateChange = (date: Date | null) => {
    if (!date) return

    const dateStr = date.toDateString()
    const blockedSlot = blockedDates.find(
      d => d.date.toDateString() === dateStr
    )

    if (blockedSlot) {
      setHoveredDate(date)
      return
    }

    const isSelected = selectedDates.some(d => d.toDateString() === dateStr)
    if (isSelected) {
      setSelectedDates(selectedDates.filter(d => d.toDateString() !== dateStr))
    } else {
      setSelectedDates([...selectedDates, date])
    }
  }

  const isDateBlocked = (date: Date): boolean => {
    return blockedDates.some(d => d.date.toDateString() === date.toDateString())
  }

  const getDayClassName = (date: Date) => {
    const dateStr = date.toDateString()
    const blockedSlot = blockedDates.find(
      d => d.date.toDateString() === dateStr
    )
    if (blockedSlot) {
      const usage = blockedSlot.currentCount / blockedSlot.capacity
      return usage > 0.8
        ? 'bg-yellow-100 text-yellow-800 cursor-not-allowed'
        : 'bg-red-100 text-red-800 cursor-not-allowed'
    }
    if (selectedDates.some(d => d.toDateString() === dateStr)) {
      return 'bg-tmechs-forest/20 text-tmechs-forest font-semibold'
    }
    return 'hover:bg-tmechs-sage/10'
  }

  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-tmechs-sage/10 to-white py-6 sm:py-12">
      <div className="mx-auto max-w-5xl space-y-6 px-4 sm:space-y-8 sm:px-6">
        {/* Header */}
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
          <h1 className="relative text-2xl font-bold text-gray-800 sm:text-3xl">
            Detention Monitor Signup
            <span className="absolute -bottom-1 left-0 h-1 w-20 rounded-full bg-gradient-to-r from-tmechs-forest to-tmechs-sage sm:w-24" />
          </h1>
        </div>

        {/* Main Content */}
        <div className="rounded-xl bg-white/80 p-4 shadow-lg backdrop-blur-md transition-all duration-300 hover:shadow-xl sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {/* Date Picker and Quote Section */}
            <div className="flex flex-col sm:flex-row sm:space-x-6">
              <div className="w-full sm:w-1/2">
                <label className="mb-2 block text-sm font-medium tracking-wide text-tmechs-forest sm:mb-3 sm:text-base">
                  Select Available Dates
                </label>
                <div className="relative">
                  <DatePicker
                    selected={null}
                    onChange={handleDateChange}
                    inline
                    minDate={new Date()}
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    onMonthChange={handleMonthChange}
                    monthsShown={1}
                    fixedHeight
                    dayClassName={getDayClassName}
                    filterDate={date =>
                      date.getDay() !== 0 && date.getDay() !== 6
                    }
                    calendarClassName="bg-white rounded-lg shadow-md p-2 sm:p-4"
                  />
                  {hoveredDate &&
                    blockedDates.some(
                      d => d.date.toDateString() === hoveredDate.toDateString()
                    ) && (
                      <div className="animate-fade-in absolute z-10 mt-2 max-w-xs rounded-lg border border-red-200 bg-red-50/90 p-3 shadow-lg backdrop-blur-sm">
                        <p className="flex items-center text-xs text-red-700 sm:text-sm">
                          <AlertCircle className="mr-2 h-4 w-4" />
                          {
                            blockedDates.find(
                              d =>
                                d.date.toDateString() ===
                                hoveredDate.toDateString()
                            )?.teacherName
                          }{' '}
                          is assigned to this date
                          {blockedDates.find(
                            d =>
                              d.date.toDateString() ===
                              hoveredDate.toDateString()
                          )?.currentCount > 0
                            ? ` (${blockedDates.find(d => d.date.toDateString() === hoveredDate.toDateString())?.currentCount}/${
                                blockedDates.find(
                                  d =>
                                    d.date.toDateString() ===
                                    hoveredDate.toDateString()
                                )?.capacity
                              } students)`
                            : ''}
                        </p>
                      </div>
                    )}
                </div>
              </div>
              <div className="mt-4 w-full sm:mt-0 sm:w-1/2">
                <div
                  className="relative flex h-full flex-col justify-center rounded-lg bg-black/50 p-4 transition-all duration-300 hover:scale-[1.01] sm:p-6"
                  style={{
                    backgroundImage: `url('https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets/app_container_image.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {/* Overlay for opacity and contrast */}
                  <div className="absolute inset-0 rounded-lg bg-black/60 opacity-90"></div>
                  <div className="relative z-10">
                    <h2 className="mb-3 text-xl font-bold tracking-wide text-tmechs-light [text-shadow:1px_1px_2px_rgba(0,0,0,0.5)] sm:mb-4 sm:text-2xl">
                      Maverick Pride
                    </h2>
                    <p
                      key={currentQuoteIndex}
                      className="animate-slide-in text-sm italic text-tmechs-light [text-shadow:1px_1px_2px_rgba(0,0,0,0.5)] sm:text-base"
                    >
                      "{quotes[currentQuoteIndex]}"
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Capacity */}
            <div>
              <label className="mb-2 block text-sm font-medium tracking-wide text-tmechs-forest sm:mb-3 sm:text-base">
                Student Capacity
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-tmechs-forest transition-all duration-300 hover:rotate-12" />
                <input
                  type="number"
                  value={capacity}
                  onChange={e =>
                    setCapacity(
                      Math.max(1, Math.min(50, parseInt(e.target.value) || 1))
                    )
                  }
                  min="1"
                  max="50"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-700 shadow-sm transition-all duration-300 focus:border-tmechs-forest focus:ring-2 focus:ring-tmechs-forest/50 sm:py-3 sm:text-base"
                  placeholder="Enter capacity (1–50)"
                />
              </div>
            </div>

            {/* Selected Dates */}
            <div className="rounded-lg border border-tmechs-sage/20 bg-tmechs-sage/10 p-4 shadow-sm sm:p-6">
              <h3 className="mb-3 flex items-center text-base font-semibold text-tmechs-forest sm:mb-4 sm:text-lg">
                <Clock className="mr-2 h-5 w-5 transition-all duration-300 hover:rotate-12 sm:h-6 sm:w-6" />
                Selected Dates ({selectedDates.length})
              </h3>
              {selectedDates.length === 0 ? (
                <p className="text-sm italic text-gray-500">
                  No dates selected yet
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                  {selectedDates.map((date, index) => (
                    <div
                      key={index}
                      className="flex cursor-pointer items-center justify-between rounded-lg bg-white p-2 shadow-sm transition-all duration-300 hover:bg-tmechs-sage/20"
                      onClick={() =>
                        setSelectedDates(
                          selectedDates.filter(
                            d => d.toDateString() !== date.toDateString()
                          )
                        )
                      }
                    >
                      <span className="text-sm text-gray-700 sm:text-base">
                        {date.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-xs text-tmechs-forest hover:text-red-600">
                        Remove
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-tmechs-forest to-tmechs-forest/80 px-4 py-2 text-sm text-white shadow-md transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 sm:py-3 sm:text-base"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing Up...
                </>
              ) : (
                'Confirm Signup'
              )}
            </button>
          </form>

          {/* Note */}
          <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-md sm:mt-8 sm:p-6">
            <div className="flex items-start space-x-2 sm:space-x-3">
              <AlertCircle className="mt-0.5 h-5 w-5 animate-pulse text-yellow-500 sm:mt-1 sm:h-6 sm:w-6" />
              <div>
                <h3 className="text-sm font-semibold text-gray-800 sm:text-base">
                  Important Notes:
                </h3>
                <ul className="mt-1 list-inside list-disc text-xs leading-relaxed text-gray-700 sm:mt-2 sm:text-sm">
                  <li>
                    Select dates you’re available to monitor detention (weekends
                    are excluded).
                  </li>
                  <li>Set a student capacity between 1 and 50 per slot.</li>
                  <li>
                    You’ll receive an email confirmation for each date you sign
                    up for.
                  </li>
                  <li>
                    Yellow dates are near capacity (80%); red dates are already
                    assigned.
                  </li>
                  <li>
                    Teachers and admins can sign up; contact an admin to modify
                    or cancel slots.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
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
    </div>
  )
}
