import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Clock, ArrowLeft, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'

interface DetentionSlot {
  detention_date: string
  location: string
}

interface Student {
  id: string
  name: string
}

export default function StudentSchedule() {
  const navigate = useNavigate()
  const [schedule, setSchedule] = useState<DetentionSlot[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Student[]>([])
  const [searchedSchedule, setSearchedSchedule] = useState<DetentionSlot[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  const isAdmin = true // Replace with real auth check if needed

  useEffect(() => {
    fetchScheduleForCurrentUser()
  }, [])

  const fetchScheduleForCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      const { data, error } = await supabase
        .from('violations')
        .select('detention_date, location')
        .eq('student_id', user.id)
        .eq('status', 'pending')
        .order('detention_date')

      if (error) throw error

      setSchedule(data || [])
    } catch (error) {
      console.error('Error fetching user schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, name')
        .ilike('name', `%${searchQuery}%`)
        .limit(5)

      if (error) throw error

      setSearchResults(data || [])
    } catch (error) {
      console.error('Error searching students:', error)
      toast.error('Search failed')
    }
  }

  const fetchStudentSchedule = async (studentId: string) => {
    try {
      console.log('Fetching schedule for student ID:', studentId)

      const { data, error } = await supabase
        .from('violations')
        .select('detention_date') // ✅ Removed "location"
        .eq('student_id', studentId)
        .eq('status', 'pending')
        .order('detention_date')

      if (error) {
        console.error('Supabase error:', error.message)
        throw error
      }

      console.log('Fetched schedule:', data)
      setSearchedSchedule(data || [])
    } catch (err) {
      console.error('❌ Error fetching student schedule:', err)
      toast.error('Could not load schedule')
      setSearchedSchedule([])
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center space-x-4 rounded-md bg-tmechs-forest px-4 py-2 text-tmechs-light">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-tmechs-light hover:text-white"
        >
          <ArrowLeft className="h-6 w-6" />
          <span className="ml-1">Back</span>
        </button>
        <h1 className="text-2xl font-bold">My Detention Schedule</h1>
      </div>

      {isAdmin && (
        <div className="mb-6 rounded-md bg-tmechs-sage/10 p-4">
          <h2 className="mb-2 text-lg font-semibold text-tmechs-forest">
            Search Student Schedule
          </h2>
          <div className="mb-4 flex space-x-2">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  searchStudents()
                }
              }}
              className="w-full rounded border border-gray-300 bg-tmechs-forest px-3 py-2 text-tmechs-light"
              placeholder="Enter student name"
            />
            <button
              onClick={searchStudents}
              className="btn-primary flex items-center"
            >
              <Search className="mr-1 h-4 w-4" />
              Search
            </button>
          </div>
          <div>
            {searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map(student => (
                  <button
                    key={student.id}
                    onClick={() => {
                      console.log(
                        'Fetching schedule for student ID:',
                        student.id
                      )
                      setSelectedStudent(student)
                      fetchStudentSchedule(student.id)
                    }}
                    className="block w-full rounded border bg-tmechs-sage px-4 py-2 text-left text-tmechs-forest hover:bg-tmechs-forest/20"
                  >
                    {student.name}
                  </button>
                ))}
              </div>
            ) : searchQuery.trim() !== '' ? (
              <p className="text-gray-500">No results found.</p>
            ) : null}
          </div>
        </div>
      )}

      {selectedStudent && (
        <div className="mb-6">
          <h2 className="mb-2 text-lg font-semibold text-tmechs-forest">
            Schedule for {selectedStudent.name}
          </h2>
          {searchedSchedule.length === 0 ? (
            <p className="text-gray-500">No upcoming detentions found.</p>
          ) : (
            <div className="space-y-4">
              {searchedSchedule.map((slot, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-5 w-5 text-tmechs-forest" />
                        <span className="text-tmechs-forest">
                          {format(
                            new Date(slot.detention_date),
                            'MMMM d, yyyy'
                          )}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="mr-2 h-5 w-5 text-tmechs-forest" />
                        <span className="text-tmechs-forest">4:10 PM</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="mr-2 h-5 w-5 text-tmechs-forest" />
                        <span className="text-tmechs-forest">
                          {slot.location}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg bg-white p-6 shadow-md">
        {loading ? (
          <div className="py-4 text-center">Loading...</div>
        ) : schedule.length === 0 ? (
          <div className="py-4 text-center text-tmechs-forest">
            No upcoming detentions scheduled
          </div>
        ) : (
          <div className="space-y-4">
            {schedule.map((slot, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-5 w-5 text-tmechs-forest" />
                      <span className="text-tmechs-forest">
                        {format(new Date(slot.detention_date), 'MMMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="mr-2 h-5 w-5 text-tmechs-forest" />
                      <span className="text-tmechs-forest">3:45 PM</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="mr-2 h-5 w-5 text-tmechs-forest" />
                      <span className="text-tmechs-forest">
                        {slot.location}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
