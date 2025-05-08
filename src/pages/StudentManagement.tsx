import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  Users,
  Upload,
  Download,
  Plus,
  Pencil,
  Trash2,
  Search,
  History,
  RefreshCw,
  ArrowLeft,
  X,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabase'
import type { Student } from '../types'

interface StudentWithViolations extends Student {
  violation_count: number
  unexcused_count: number
}

const handleError = (error: unknown, message: string) => {
  console.error(message, error)
  toast.error(
    `${message}: ${error instanceof Error ? error.message : 'Unknown error'}`
  )
}

export default function StudentManagement() {
  const navigate = useNavigate()
  const [students, setStudents] = useState<StudentWithViolations[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [violations, setViolations] = useState<any[]>([])
  const [sortColumn, setSortColumn] = useState<
    keyof StudentWithViolations | null
  >(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    barcode: '',
    grade: 9,
    parent_email: '',
    parent_access_code: '',
    unexcused_count: 0,
  })

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('students')
        .select(
          '*, violations!violations_student_id_fkey (id), unexcused_count'
        )

      if (error) throw error
      if (!data || data.length === 0) {
        setStudents([])
        toast('No students found in the database.')
        return
      }

      const studentsWithCounts = data.map(student => ({
        ...student,
        violation_count: student.violations?.length || 0,
        unexcused_count: student.unexcused_count || 0,
      }))

      setStudents(studentsWithCounts)
    } catch (error) {
      handleError(error, 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!newStudent.name || !newStudent.email || !newStudent.barcode) {
        toast.error('Name, email, and barcode are required.')
        return
      }
      if (newStudent.parent_email && !newStudent.parent_access_code) {
        toast.error(
          'Parent access code is required if parent email is provided.'
        )
        return
      }

      const { error } = await supabase.from('students').insert([
        {
          ...newStudent,
          parent_email: newStudent.parent_email || null,
          parent_access_code: newStudent.parent_access_code || null,
        },
      ])

      if (error) throw error

      toast.success('Student added successfully')
      setShowAddModal(false)
      setNewStudent({
        name: '',
        email: '',
        barcode: '',
        grade: 9,
        parent_email: '',
        parent_access_code: '',
        unexcused_count: 0,
      })
      fetchStudents()
    } catch (error) {
      handleError(error, 'Failed to add student')
    }
  }

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStudent) return

    try {
      // Destructure to remove nested violations field
      const { violations, ...studentUpdate } = editingStudent

      // Ensure nullable fields are converted to null if empty
      if (studentUpdate.parent_email === '') studentUpdate.parent_email = null
      if (studentUpdate.parent_access_code === '')
        studentUpdate.parent_access_code = null

      const { error } = await supabase
        .from('students')
        .update(studentUpdate)
        .eq('id', editingStudent.id)

      if (error) throw error

      toast.success('Student updated successfully')
      setEditingStudent(null)
      fetchStudents()
    } catch (error) {
      handleError(error, 'Failed to update student')
    }
  }

  const handleDeleteStudent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return

    try {
      const { error } = await supabase.from('students').delete().eq('id', id)
      if (error) throw error

      toast.success('Student deleted successfully')
      fetchStudents()
    } catch (error) {
      handleError(error, 'Failed to delete student')
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      complete: async results => {
        const expectedHeaders = ['name', 'email', 'barcode', 'grade']
        const headers = results.meta.fields || []
        if (!expectedHeaders.every(h => headers.includes(h))) {
          toast.error(
            'Invalid CSV format. Required headers: name, email, barcode, grade'
          )
          return
        }

        try {
          const studentsToInsert = results.data
            .map((row: any) => ({
              name: row.name,
              email: row.email,
              barcode: row.barcode,
              grade: parseInt(row.grade),
            }))
            .filter(s => s.name && s.email && s.barcode && !isNaN(s.grade))

          if (studentsToInsert.length === 0) {
            toast.error('No valid student data found in CSV')
            return
          }

          const { error } = await supabase
            .from('students')
            .insert(studentsToInsert)
          if (error) throw error

          toast.success(
            `${studentsToInsert.length} students imported successfully`
          )
          fetchStudents()
        } catch (error) {
          handleError(error, 'Failed to import students')
        }
      },
      header: true,
      skipEmptyLines: true,
    })
  }

  const downloadTemplate = () => {
    const templateData = [
      ['name,email,barcode,grade', '', '', ''],
      ['# Required fields: name, email, barcode, grade (9-12)', '', '', ''],
      ['John Doe,john.doe@example.com,123456,9', '', '', ''],
    ]
    const csv = Papa.unparse(templateData, { header: false })
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'student_upload_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exportStudents = () => {
    const csv = Papa.unparse(
      students.map(s => ({
        name: s.name,
        email: s.email,
        barcode: s.barcode,
        grade: s.grade,
        violation_count: s.violation_count,
        unexcused_count: s.unexcused_count,
      }))
    )
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'students_export.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const fetchStudentHistory = async (student: Student) => {
    try {
      const { data, error } = await supabase
        .from('violations')
        .select('*, teachers (name)')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setViolations(data || [])
      setSelectedStudent(student)
      setShowHistoryModal(true)
    } catch (error) {
      handleError(error, 'Failed to load student history')
    }
  }

  const handleSort = (column: keyof StudentWithViolations) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const filteredAndSortedStudents = React.useMemo(() => {
    let result = students.filter(
      student =>
        (student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.barcode.includes(searchTerm)) &&
        (selectedGrade === 'all' || student.grade === selectedGrade)
    )

    if (sortColumn) {
      result.sort((a, b) => {
        const aValue = a[sortColumn]
        const bValue = b[sortColumn]
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue)
        }
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
        }
        return 0
      })
    }

    return result
  }, [students, searchTerm, selectedGrade, sortColumn, sortDirection])

  const SortIcon = ({ column }: { column: keyof StudentWithViolations }) => {
    if (sortColumn !== column) return null
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 inline h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 inline h-4 w-4" />
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-tmechs-forest hover:text-tmechs-forest/80"
            aria-label="Go back"
          >
            <ArrowLeft className="h-6 w-6" />
            <span className="ml-1">Back</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Student Management
          </h1>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-sage flex items-center"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Student
          </button>
          <label className="btn-primary flex cursor-pointer items-center">
            <Upload className="mr-2 h-5 w-5" />
            Import CSV
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
          <button
            onClick={downloadTemplate}
            className="btn-primary flex items-center"
          >
            <Download className="mr-2 h-5 w-5" />
            Get Template
          </button>
          <button
            onClick={exportStudents}
            className="btn-dark flex items-center"
          >
            <Download className="mr-2 h-5 w-5" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or barcode..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-64 rounded-md border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <select
              value={selectedGrade}
              onChange={e =>
                setSelectedGrade(
                  e.target.value === 'all' ? 'all' : parseInt(e.target.value)
                )
              }
              className="rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All Grades</option>
              {[9, 10, 11, 12].map(grade => (
                <option key={grade} value={grade}>
                  Grade {grade}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchStudents}
            className="flex items-center px-3 py-2 text-tmechs-sage hover:text-tmechs-sage/80"
          >
            <RefreshCw className="mr-1 h-5 w-5" />
            Refresh
          </button>
        </div>

        <div className="mb-4 text-sm text-gray-600">
          Total Students: {filteredAndSortedStudents.length}
        </div>

        {loading ? (
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
        ) : filteredAndSortedStudents.length === 0 ? (
          <p className="py-4 text-center text-gray-500">
            No students found matching your criteria.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    onClick={() => handleSort('name')}
                  >
                    Name <SortIcon column="name" />
                  </th>
                  <th
                    className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    onClick={() => handleSort('email')}
                  >
                    Email <SortIcon column="email" />
                  </th>
                  <th
                    className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    onClick={() => handleSort('barcode')}
                  >
                    Barcode id <SortIcon column="barcode" />
                  </th>
                  <th
                    className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    onClick={() => handleSort('grade')}
                  >
                    Grade <SortIcon column="grade" />
                  </th>
                  <th
                    className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    onClick={() => handleSort('violation_count')}
                  >
                    Violations <SortIcon column="violation_count" />
                  </th>
                  <th
                    className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    onClick={() => handleSort('unexcused_count')}
                  >
                    Unexcused Absences <SortIcon column="unexcused_count" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredAndSortedStudents.map(student => (
                  <tr key={student.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {student.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {student.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {student.barcode}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {student.grade}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {student.violation_count}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {student.unexcused_count}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingStudent(student)}
                          className="text-indigo-600 hover:text-indigo-900"
                          aria-label={`Edit ${student.name}`}
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => fetchStudentHistory(student)}
                          className="text-blue-600 hover:text-blue-900"
                          aria-label={`View history for ${student.name}`}
                        >
                          <History className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
                          className="text-red-600 hover:text-red-900"
                          aria-label={`Delete ${student.name}`}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-600 bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-4 text-xl font-bold">Add New Student</h2>
            <form onSubmit={handleAddStudent}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newStudent.name}
                    onChange={e =>
                      setNewStudent({ ...newStudent, name: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 focus:border-tmechs-forest focus:ring-tmechs-forest"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newStudent.email}
                    onChange={e =>
                      setNewStudent({ ...newStudent, email: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 focus:border-tmechs-forest focus:ring-tmechs-forest"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Barcode *
                  </label>
                  <input
                    type="text"
                    value={newStudent.barcode}
                    onChange={e =>
                      setNewStudent({ ...newStudent, barcode: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 focus:border-tmechs-forest focus:ring-tmechs-forest"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Grade *
                  </label>
                  <select
                    value={newStudent.grade}
                    onChange={e =>
                      setNewStudent({
                        ...newStudent,
                        grade: parseInt(e.target.value),
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 focus:border-tmechs-forest focus:ring-tmechs-forest"
                  >
                    {[9, 10, 11, 12].map(grade => (
                      <option key={grade} value={grade}>
                        Grade {grade}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Parent Email (optional)
                  </label>
                  <input
                    type="email"
                    value={newStudent.parent_email}
                    onChange={e =>
                      setNewStudent({
                        ...newStudent,
                        parent_email: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 focus:border-tmechs-forest focus:ring-tmechs-forest"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Parent Access Code (will be created)
                  </label>
                  <input
                    type="text"
                    value={newStudent.parent_access_code}
                    onChange={e =>
                      setNewStudent({
                        ...newStudent,
                        parent_access_code: e.target.value,
                      })
                    }
                    placeholder="Leave blank to auto-generate"
                    className="mt-1 block w-full rounded-md border border-gray-300 focus:border-tmechs-forest focus:ring-tmechs-forest"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-light"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-sage">
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingStudent && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-600 bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-4 text-xl font-bold">Edit Student</h2>
            <form onSubmit={handleEditStudent}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editingStudent.name}
                    onChange={e =>
                      setEditingStudent({
                        ...editingStudent,
                        name: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 focus:border-tmechs-forest focus:ring-tmechs-forest"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingStudent.email}
                    onChange={e =>
                      setEditingStudent({
                        ...editingStudent,
                        email: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 focus:border-tmechs-forest focus:ring-tmechs-forest"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={editingStudent.barcode}
                    onChange={e =>
                      setEditingStudent({
                        ...editingStudent,
                        barcode: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 focus:border-tmechs-forest focus:ring-tmechs-forest"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Grade
                  </label>
                  <select
                    value={editingStudent.grade}
                    onChange={e =>
                      setEditingStudent({
                        ...editingStudent,
                        grade: parseInt(e.target.value),
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 focus:border-tmechs-forest focus:ring-tmechs-forest"
                  >
                    {[9, 10, 11, 12].map(grade => (
                      <option key={grade} value={grade}>
                        Grade {grade}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Parent Email
                  </label>
                  <input
                    type="email"
                    value={editingStudent.parent_email || ''}
                    onChange={e =>
                      setEditingStudent({
                        ...editingStudent,
                        parent_email: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 focus:border-tmechs-forest focus:ring-tmechs-forest"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="btn-light"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-sage">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showHistoryModal && selectedStudent && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-600 bg-opacity-50">
          <div className="max-h-[80vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Violation History - {selectedStudent.name}
              </h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close history modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            {violations.length === 0 ? (
              <p className="py-4 text-center text-gray-500">
                No violation history found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Violation Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Teacher
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {violations.map(violation => (
                      <tr key={violation.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {new Date(violation.created_at).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {violation.violation_type || 'Unknown'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {violation.teachers?.name || 'N/A'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                              violation.status === 'attended'
                                ? 'bg-green-100 text-green-800'
                                : violation.status === 'absent'
                                  ? 'bg-red-100 text-red-800'
                                  : violation.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {violation.status?.charAt(0).toUpperCase() +
                              violation.status?.slice(1) || 'Unknown'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
