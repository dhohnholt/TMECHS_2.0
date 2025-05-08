import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import { toast } from 'react-hot-toast'
import {
  Calendar,
  Users,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Ban,
  ArrowLeft,
  MapPin,
  Edit,
  Loader2,
} from 'lucide-react'
import {
  format,
  addWeeks,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
} from 'date-fns'
import { supabase } from '../lib/supabase'
import type { DetentionSlot } from '../types'
import 'react-datepicker/dist/react-datepicker.css'

interface TeacherSchedule {
  id: string
  name: string
  slots: DetentionSlot[]
}

const LOCATIONS = ['Cafeteria', 'Library', 'Room 204', 'Gym'] as const
type Location = (typeof LOCATIONS)[number] | `Room ${string}`

export default function DetentionManagement() {
  const navigate = useNavigate()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [schedules, setSchedules] = useState<TeacherSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [capacity, setCapacity] = useState(20)
  const [location, setLocation] = useState<Location>('Cafeteria')
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([])
  const [teacherClassrooms, setTeacherClassrooms] = useState<
    { id: string; name: string; classroom_number: string | null }[]
  >([])
  const [editingSlot, setEditingSlot] = useState<DetentionSlot | null>(null)

  const [userRole, setUserRole] = useState<'teacher' | 'admin' | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setCurrentUserId(user.id)
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (!error && data?.role) {
          setUserRole(data.role)
          if (data.role === 'teacher') {
            setSelectedTeacher(user.id) // Auto-assign their own ID
          }
        }
      }
    }

    fetchUserRole()
  }, [])

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  useEffect(() => {
    fetchTeachers()
    fetchSchedules()
  }, [currentWeek])

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, classroom_number')
        .order('name')

      if (error) throw error
      setTeachers(data)
      setTeacherClassrooms(data)
    } catch (error) {
      console.error('Error fetching teachers:', error)
      toast.error('Failed to load teachers')
    }
  }

  const fetchSchedules = async () => {
    try {
      setLoading(true)
      const { data: slots, error } = await supabase
        .from('detention_slots')
        .select(
          `
          *,
          users (
            id,
            name
          )
        `
        )
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'))
        .order('date')

      if (error) throw error

      // Group slots by teacher
      const teacherSchedules: { [key: string]: TeacherSchedule } = {}
      slots.forEach((slot: any) => {
        const teacherName = slot.users?.name ?? 'Unknown'

        if (!teacherSchedules[slot.teacher_id]) {
          teacherSchedules[slot.teacher_id] = {
            id: slot.teacher_id,
            name: teacherName,
            slots: [],
          }
        }

        teacherSchedules[slot.teacher_id].slots.push(slot)
      })

      setSchedules(Object.values(teacherSchedules))
    } catch (error) {
      console.error('Error fetching schedules:', error)
      toast.error('Failed to load schedules')
    } finally {
      setLoading(false)
    }
  }

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeacher || !selectedDate) {
      toast.error('Please select both teacher and date')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.from('detention_slots').insert({
        teacher_id: selectedTeacher,
        date: format(selectedDate, 'yyyy-MM-dd'),
        capacity,
        location,
      })

      if (error) throw error

      toast.success('Detention slot added successfully')
      setShowAddModal(false)
      setSelectedTeacher('')
      setSelectedDate(null)
      setCapacity(20)
      setLocation('Cafeteria')
      fetchSchedules()
    } catch (error) {
      console.error('Error adding slot:', error)
      toast.error('Failed to add detention slot')
    } finally {
      setSaving(false)
    }
  }

  const handleEditSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSlot) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('detention_slots')
        .update({
          capacity: editingSlot.capacity,
          location: editingSlot.location,
        })
        .eq('id', editingSlot.id)

      if (error) throw error

      toast.success('Detention slot updated successfully')
      setShowEditModal(false)
      setEditingSlot(null)
      fetchSchedules()
    } catch (error) {
      console.error('Error updating slot:', error)
      toast.error('Failed to update detention slot')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSlot = async (slotId: string) => {
    if (!window.confirm('Are you sure you want to delete this detention slot?'))
      return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('detention_slots')
        .delete()
        .eq('id', slotId)

      if (error) {
        if (error.message.includes('assigned students')) {
          toast.error('Cannot delete slot with assigned students')
        } else {
          throw error
        }
      } else {
        toast.success('Detention slot deleted successfully')
        fetchSchedules()
      }
    } catch (error) {
      console.error('Error deleting slot:', error)
      toast.error('Failed to delete detention slot')
    } finally {
      setSaving(false)
    }
  }

  const getSlotForDay = (teacherId: string, date: Date) => {
    const schedule = schedules.find(s => s.id === teacherId)
    if (!schedule) return null

    return schedule.slots.find(
      slot =>
        format(new Date(slot.date + 'T00:00:00'), 'yyyy-MM-dd') ===
        format(date, 'yyyy-MM-dd')
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-tmechs-forest hover:text-tmechs-forest/80"
          >
            <ArrowLeft className="h-6 w-6" />
            <span className="ml-1">Back</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Detention Schedule
          </h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center rounded-md bg-tmechs-forest px-4 py-2 text-white hover:bg-tmechs-forest/90"
        >
          <Clock className="mr-2 h-5 w-5" />
          Add Detention Slot
        </button>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))}
            className="rounded-full p-2 hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold">
            Week of {format(weekStart, 'MMMM d, yyyy')}
          </h2>
          <button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="rounded-full p-2 hover:bg-gray-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-48 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Teacher
                </th>
                {weekDays.map((day, index) => (
                  <th
                    key={index}
                    className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    {format(day, 'EEE')}
                    <br />
                    {format(day, 'MMM d')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {schedules.map(schedule => (
                <tr key={schedule.id}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {schedule.name}
                    </div>
                  </td>
                  {weekDays.map((day, index) => {
                    const slot = getSlotForDay(schedule.id, day)
                    return (
                      <td key={index} className="px-6 py-4">
                        {slot ? (
                          <div className="flex flex-col items-center">
                            <div className="mb-1 text-sm text-gray-900">
                              {slot.current_count}/{slot.capacity}
                            </div>
                            <div className="mb-2 text-xs text-gray-500">
                              {slot.location}
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setEditingSlot(slot)
                                  setShowEditModal(true)
                                }}
                                className="text-blue-600 hover:text-blue-900"
                                disabled={saving}
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="text-red-600 hover:text-red-900"
                                disabled={saving}
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-gray-400">-</div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-600 bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Add Detention Slot</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleAddSlot}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Teacher
                  </label>
                  {userRole === 'admin' ? (
                    <select
                      value={selectedTeacher}
                      onChange={e => {
                        setSelectedTeacher(e.target.value)
                        const teacher = teacherClassrooms.find(
                          t => t.id === e.target.value
                        )
                        if (teacher?.classroom_number) {
                          setLocation(`Room ${teacher.classroom_number}`)
                        }
                      }}
                      className="mt-1 block w-full rounded-md border border-gray-300"
                      required
                      disabled={saving}
                    >
                      <option value="">Select a teacher</option>
                      {teachers.map(teacher => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name}{' '}
                          {teacher.classroom_number
                            ? `(${teacher.classroom_number})`
                            : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="mt-1 text-gray-800">
                      {teachers.find(t => t.id === selectedTeacher)?.name ??
                        'Your name'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400" />
                    <DatePicker
                      selected={selectedDate}
                      onChange={date => setSelectedDate(date)}
                      className="w-full rounded-md border border-gray-300 pl-10 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
                      dateFormat="MMMM d, yyyy"
                      minDate={new Date()}
                      placeholderText="Select a date"
                      required
                      disabled={saving}
                      filterDate={date => {
                        const day = date.getDay()
                        return day !== 0 && day !== 6 // 0 = Sunday, 6 = Saturday
                      }}
                      showMonthDropdown
                      showYearDropdown
                      dropdownMode="select"
                      isClearable
                      popperPlacement="bottom-start"
                      popperModifiers={[
                        {
                          name: 'offset',
                          options: {
                            offset: [0, 8],
                          },
                        },
                      ]}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400" />
                    <select
                      value={location}
                      onChange={e => setLocation(e.target.value as Location)}
                      className="w-full rounded-md border border-gray-300 pl-10"
                      required
                      disabled={saving}
                    >
                      {LOCATIONS.map(loc => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                      {selectedTeacher &&
                        teacherClassrooms.find(t => t.id === selectedTeacher)
                          ?.classroom_number && (
                          <option
                            value={`Room ${teacherClassrooms.find(t => t.id === selectedTeacher)!.classroom_number!}`}
                          >
                            Room{' '}
                            {
                              teacherClassrooms.find(
                                t => t.id === selectedTeacher
                              )!.classroom_number!
                            }
                          </option>
                        )}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={e => setCapacity(parseInt(e.target.value))}
                    min="1"
                    max="50"
                    className="mt-1 block w-full rounded-md border border-gray-300"
                    required
                    disabled={saving}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center rounded-md bg-tmechs-forest px-4 py-2 text-white hover:bg-tmechs-forest/90 disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-5 w-5" />
                      Add Slot
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingSlot && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-600 bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Edit Detention Slot</h2>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingSlot(null)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleEditSlot}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Date
                  </label>
                  <div className="text-gray-900">
                    {format(new Date(editingSlot.date), 'MMMM d, yyyy')}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400" />
                    <select
                      value={editingSlot.location}
                      onChange={e =>
                        setEditingSlot({
                          ...editingSlot,
                          location: e.target.value as Location,
                        })
                      }
                      className="w-full rounded-md border border-gray-300 pl-10"
                      required
                      disabled={saving}
                    >
                      {LOCATIONS.map(loc => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                      {teacherClassrooms.find(
                        t => t.id === editingSlot.teacher_id
                      )?.classroom_number && (
                        <option
                          value={`Room ${teacherClassrooms.find(t => t.id === editingSlot.teacher_id)!.classroom_number!}`}
                        >
                          Room{' '}
                          {
                            teacherClassrooms.find(
                              t => t.id === editingSlot.teacher_id
                            )!.classroom_number!
                          }
                        </option>
                      )}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={editingSlot.capacity}
                    onChange={e =>
                      setEditingSlot({
                        ...editingSlot,
                        capacity: parseInt(e.target.value),
                      })
                    }
                    min={editingSlot.current_count}
                    max="50"
                    className="mt-1 block w-full rounded-md border border-gray-300"
                    required
                    disabled={saving}
                  />
                  {editingSlot.current_count > 0 && (
                    <p className="mt-1 text-sm text-gray-500">
                      Minimum capacity is {editingSlot.current_count} due to
                      currently assigned students
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingSlot(null)
                  }}
                  className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center rounded-md bg-tmechs-forest px-4 py-2 text-white hover:bg-tmechs-forest/90 disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-5 w-5" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
