import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'

interface Student {
  id: string
  name: string
  barcode: string
  sound_url?: string
}

interface SoundOption {
  id: string
  name: string
  filename: string
  url: string
  is_default: boolean
}

interface Props {
  periodId: string
  periodNumber: number
  className: string
}

export default function PeriodRosterTab({
  periodId,
  periodNumber,
  className,
}: Props) {
  const [students, setStudents] = useState<Student[]>([])
  const [soundOptions, setSoundOptions] = useState<SoundOption[]>([])
  const [defaultSoundUrl, setDefaultSoundUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
    new Set()
  )
  const [barcodeInput, setBarcodeInput] = useState<string>('')

  useEffect(() => {
    const fetchRoster = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('student_class_periods')
        .select('students:fk_student_id(id, name, barcode, sound_url)')
        .eq('period_id', periodId)

      if (!error && data) {
        const flattened = data.map(row => row.students)
        flattened.sort((a, b) => {
          const lastA = a.name.trim().split(' ').slice(-1)[0].toLowerCase()
          const lastB = b.name.trim().split(' ').slice(-1)[0].toLowerCase()
          return lastA.localeCompare(lastB)
        })
        setStudents(flattened)
      }
      setLoading(false)
    }

    const fetchSounds = async () => {
      const { data, error } = await supabase
        .from('sound_options')
        .select('id, name, filename, is_default')
        .order('name')

      if (!error && data) {
        const urls = await Promise.all(
          data.map(async sound => {
            const { data: urlData } = supabase.storage
              .from('sounds')
              .getPublicUrl(sound.filename)

            return {
              id: sound.id,
              name: sound.name,
              filename: sound.filename,
              url: urlData?.publicUrl || '',
              is_default: sound.is_default,
            }
          })
        )
        setSoundOptions(urls)
        const def = urls.find(s => s.is_default)
        setDefaultSoundUrl(def?.url || null)
      } else {
        console.error('Error loading sounds:', error)
      }
    }

    if (periodId) {
      fetchRoster()
      fetchSounds()
    }
  }, [periodId])

  const handleSoundChange = async (studentId: string, filename: string) => {
    const { error } = await supabase
      .from('students')
      .update({ sound_url: filename })
      .eq('id', studentId)

    if (!error) {
      setStudents(prev =>
        prev.map(s => (s.id === studentId ? { ...s, sound_url: filename } : s))
      )
      toast.success('Sound updated')
    } else {
      toast.error('Update failed')
    }
  }

  const handleSetDefault = async (filename: string) => {
    const sound = soundOptions.find(s => s.filename === filename)

    if (!sound || !sound.filename || typeof sound.filename !== 'string') {
      console.error('⚠️ Invalid filename:', sound?.filename)
      toast.error('Invalid filename. Cannot set as default.')
      return
    }

    const { error } = await supabase.rpc('set_default_sound', {
      filename: sound.filename,
    })

    if (error) {
      console.error('RPC Error:', error)
      toast.error('Failed to set default sound')
    } else {
      toast.success('Default sound updated')

      const updated = soundOptions.map(s => ({
        ...s,
        is_default: s.filename === sound.filename,
      }))
      setSoundOptions(updated)
      setDefaultSoundUrl(sound.filename)
    }
  }

  const handleAddStudent = async () => {
    if (!barcodeInput.trim()) return
    const { data, error } = await supabase
      .from('students')
      .select('id, name')
      .eq('barcode', barcodeInput.trim())
      .single()

    if (error || !data) {
      toast.error('Student not found')
      return
    }

    const confirm = window.confirm(
      `Are you sure you want to add ${data.name} to your class?`
    )
    if (!confirm) return

    const { error: insertError } = await supabase
      .from('student_class_periods')
      .insert({ student_id: data.id, period_id: periodId })

    if (insertError) {
      toast.error('Failed to add student')
    } else {
      toast.success(`${data.name} added to class`)
      setBarcodeInput('')
      const refreshed = await supabase
        .from('student_class_periods')
        .select('students:fk_student_id(id, name, barcode, sound_url)')
        .eq('period_id', periodId)
      if (refreshed.data) {
        const flattened = refreshed.data.map(row => row.students)
        setStudents(flattened)
      }
    }
  }

  const handleRemoveSelected = async () => {
    if (selectedStudents.size === 0) return
    const confirm = window.confirm(
      'Are you sure you want to remove selected students?'
    )
    if (!confirm) return

    const { error } = await supabase
      .from('student_class_periods')
      .delete()
      .match({ period_id: periodId })
      .in('student_id', Array.from(selectedStudents))

    if (error) {
      toast.error('Failed to remove students')
    } else {
      toast.success('Students removed')
      setSelectedStudents(new Set())
      const refreshed = await supabase
        .from('student_class_periods')
        .select('students:fk_student_id(id, name, barcode, sound_url)')
        .eq('period_id', periodId)
      if (refreshed.data) {
        const flattened = refreshed.data.map(row => row.students)
        setStudents(flattened)
      }
    }
  }

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }

  if (loading) return <p className="text-sm text-gray-500">Loading roster...</p>

  return (
    <div className="space-y-4">
      <div className="rounded bg-white p-4 shadow">
        <h2 className="mb-4 text-lg font-semibold">
          {`Period ${periodNumber}: ${className}`}
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          {students.length} student{students.length !== 1 ? 's' : ''} in this
          class
        </p>

        <table className="min-w-full overflow-hidden rounded border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th></th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Barcode</th>
              <th className="px-4 py-2 text-left">Custom Sound</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                  No students in this class yet. Use the barcode field below to
                  add them.
                </td>
              </tr>
            ) : (
              students.map(student => (
                <tr key={student.id} className="border-t">
                  <td className="px-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedStudents.has(student.id)}
                      onChange={() => toggleStudent(student.id)}
                    />
                  </td>
                  <td className="px-4 py-2">{student.name}</td>
                  <td className="px-4 py-2">{student.barcode}</td>
                  <td className="px-4 py-2">
                    <select
                      value={student.sound_url ?? defaultSoundUrl ?? ''}
                      onChange={e =>
                        handleSoundChange(student.id, e.target.value)
                      }
                      className="w-full rounded border border-gray-300 p-1"
                    >
                      <option value="">-- None --</option>
                      {defaultSoundUrl && (
                        <option value={defaultSoundUrl}>
                          Default:{' '}
                          {soundOptions.find(
                            s => s.filename === defaultSoundUrl
                          )?.name || 'Unnamed'}
                        </option>
                      )}
                      {soundOptions.map(sound => (
                        <option key={sound.filename} value={sound.filename}>
                          {sound.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="mt-4 space-y-4">
          <div>
            <input
              type="text"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              placeholder="Enter barcode to add student"
              className="w-full rounded border border-gray-300 p-2 sm:w-auto"
            />
            <button
              onClick={handleAddStudent}
              className="ml-2 rounded bg-tmechs-forest px-4 py-2 text-white"
            >
              Add Student
            </button>
          </div>

          <button
            onClick={handleRemoveSelected}
            disabled={selectedStudents.size === 0}
            className="rounded bg-red-500 px-4 py-2 text-white disabled:opacity-50"
          >
            Remove Selected Students
          </button>
        </div>

        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold">Set Default Sound</h3>
          <select
            value={defaultSoundUrl ?? ''}
            onChange={e => handleSetDefault(e.target.value)}
            className="w-full rounded border border-gray-300 p-2 sm:w-auto"
          >
            <option value="">-- None --</option>
            {soundOptions.map(sound => (
              <option key={sound.id} value={sound.filename}>
                {sound.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
