import React, { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Check, X, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface BulkAttendanceProps {
  students: any[]
  onUpdate: () => void
}

export default function BulkAttendance({
  students,
  onUpdate,
}: BulkAttendanceProps) {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const toggleStudent = (violationId: string) => {
    setSelectedStudents(prev =>
      prev.includes(violationId)
        ? prev.filter(id => id !== violationId)
        : [...prev, violationId]
    )
  }

  const selectAll = () => {
    setSelectedStudents(students.map(s => s.violation_id))
  }

  const clearSelection = () => {
    setSelectedStudents([])
  }

  const markBulkAttendance = async (status: 'present' | 'absent') => {
    if (selectedStudents.length === 0) {
      toast.error('No students selected')
      return
    }

    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from('violations')
        .update({ status })
        .in('id', selectedStudents)

      if (error) throw error

      if (status === 'absent') {
        // Trigger rescheduling for absent students
        await Promise.all(
          selectedStudents.map(async violationId => {
            try {
              const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-reschedule`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ violationId }),
                }
              )

              if (!response.ok) throw new Error('Failed to reschedule')
            } catch (error) {
              console.error('Error rescheduling:', error)
            }
          })
        )
      }

      toast.success(`Marked ${selectedStudents.length} students as ${status}`)
      setSelectedStudents([])
      onUpdate()
    } catch (error) {
      console.error('Error marking attendance:', error)
      toast.error('Failed to mark attendance')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="mb-6 rounded-lg bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-tmechs-dark">Bulk Actions</h3>
        <div className="flex space-x-2">
          <button
            onClick={selectAll}
            className="text-sm text-tmechs-forest hover:text-tmechs-forest/80"
          >
            Select All
          </button>
          <button
            onClick={clearSelection}
            className="text-tmechs-gray text-sm hover:text-tmechs-dark"
          >
            Clear
          </button>
        </div>
      </div>

      {selectedStudents.length > 0 && (
        <div className="flex items-center justify-between rounded-md bg-tmechs-sage/10 p-4">
          <div className="flex items-center text-tmechs-dark">
            <AlertCircle className="mr-2 h-5 w-5 text-tmechs-forest" />
            {selectedStudents.length} students selected
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => markBulkAttendance('present')}
              disabled={isProcessing}
              className="flex items-center rounded-md bg-green-600 px-3 py-2 text-white hover:bg-green-700"
            >
              <Check className="mr-2 h-4 w-4" />
              Mark Present
            </button>
            <button
              onClick={() => markBulkAttendance('absent')}
              disabled={isProcessing}
              className="flex items-center rounded-md bg-red-600 px-3 py-2 text-white hover:bg-red-700"
            >
              <X className="mr-2 h-4 w-4" />
              Mark Absent
            </button>
          </div>
        </div>
      )}

      <div className="mt-4">
        {students.map(student => (
          <div
            key={student.violation_id}
            className={`flex cursor-pointer items-center rounded-md p-2 hover:bg-gray-50 ${
              selectedStudents.includes(student.violation_id)
                ? 'bg-tmechs-sage/10'
                : ''
            }`}
            onClick={() => toggleStudent(student.violation_id)}
          >
            <input
              type="checkbox"
              checked={selectedStudents.includes(student.violation_id)}
              onChange={() => toggleStudent(student.violation_id)}
              className="h-4 w-4 rounded border-gray-300 text-tmechs-forest focus:ring-tmechs-forest"
            />
            <span className="ml-3 text-sm text-tmechs-dark">
              {student.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
