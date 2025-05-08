import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  AlertTriangle,
  Filter,
  Download,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react'
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  subMonths,
} from 'date-fns'
import { supabase } from '../lib/supabase'

interface AnalyticsData {
  totalViolations: number
  totalStudents: number
  attendanceRate: number
  violationsByType: { type: string; count: number }[]
  violationsByGrade: { grade: number; count: number }[]
  monthlyTrends: { date: string; violations: number; warnings: number }[]
  topOffenders: { name: string; count: number }[]
}

export default function Analytics() {
  const navigate = useNavigate()
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('month')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData>({
    totalViolations: 0,
    totalStudents: 0,
    attendanceRate: 0,
    violationsByType: [],
    violationsByGrade: [],
    monthlyTrends: [],
    topOffenders: [],
  })

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
  setLoading(true)
  try {
    let startDate
    const endDate = new Date()
endDate.setHours(23, 59, 59, 999)

    switch (dateRange) {
      case 'week':
        startDate = subDays(endDate, 7)
        break
      case 'month':
        startDate = startOfMonth(endDate)
        break
      case 'year':
        startDate = subMonths(endDate, 12)
        break
    }

    // === Violations ===
    const { count: totalViolations } = await supabase
      .from('violations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const { count: totalStudents } = await supabase
      .from('violations')
      .select('student_id', {
        count: 'exact',
        head: true,
        distinct: true,
      })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const { data: attendanceData } = await supabase
      .from('violations')
      .select('status')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const attendedCount =
      attendanceData?.filter(v => v.status === 'attended').length || 0

    const attendanceRate = attendanceData?.length
      ? (attendedCount / attendanceData.length) * 100
      : 0

    const { data: violationsByType } = await supabase
      .from('violations')
      .select('violation_type')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const typeCount = violationsByType?.reduce((acc: any, curr) => {
      acc[curr.violation_type] = (acc[curr.violation_type] || 0) + 1
      return acc
    }, {})

    const { data: violationsByGrade } = await supabase
      .from('violations')
      .select('student_id, student_grade')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const gradeCount = violationsByGrade?.reduce((acc: any, curr) => {
      const grade = curr.student_grade || 'Unknown'
      acc[grade] = (acc[grade] || 0) + 1
      return acc
    }, {})

    // === Daily Trends ===
    const days = eachDayOfInterval({ start: startDate, end: endDate })

    const dailyCounts: {
      [date: string]: { violations: number; warnings: number }
    } = {}

    days.forEach(day => {
      const key = format(day, 'yyyy-MM-dd')
      dailyCounts[key] = { violations: 0, warnings: 0 }
    })

    const { data: violationTrend } = await supabase
      .from('violations')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    violationTrend?.forEach(v => {
      const date = format(new Date(v.created_at), 'yyyy-MM-dd')
      if (dailyCounts[date]) dailyCounts[date].violations++
    })

    const { data: warningTrend } = await supabase
      .from('warnings')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    warningTrend?.forEach(w => {
      const date = format(new Date(w.created_at), 'yyyy-MM-dd')
      if (dailyCounts[date]) dailyCounts[date].warnings++
    })

    // === Top Offenders ===
    const { data: topOffendersData } = await supabase
      .from('violations')
      .select('student_name')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const offenderCounts = topOffendersData?.reduce(
      (acc: { [name: string]: number }, curr) => {
        const name = curr.student_name || 'Unknown'
        acc[name] = (acc[name] || 0) + 1
        return acc
      },
      {}
    )

    const topOffenders = Object.entries(offenderCounts || {})
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // === Final setData ===
    setData({
      totalViolations: totalViolations || 0,
      totalStudents: totalStudents || 0,
      attendanceRate,
      violationsByType: Object.entries(typeCount || {}).map(([type, count]) => ({
        type,
        count: count as number,
      })),
      violationsByGrade: Object.entries(gradeCount || {}).map(
        ([grade, count]) => ({
          grade: parseInt(grade),
          count: count as number,
        })
      ),
      monthlyTrends: Object.entries(dailyCounts).map(([date, counts]) => ({
        date,
        ...counts,
      })),
      topOffenders: topOffenders || [],
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    toast.error('Failed to load analytics data')
  } finally {
    setLoading(false)
  }
}

  const exportData = () => {
    const csvContent = `
Total Violations: ${data.totalViolations}
Total Students: ${data.totalStudents}
Attendance Rate: ${data.attendanceRate.toFixed(2)}%

Violations by Type:
${data.violationsByType.map(v => `${v.type},${v.count}`).join('\n')}

Violations by Grade:
${data.violationsByGrade.map(v => `Grade ${v.grade},${v.count}`).join('\n')}

Top Offenders:
${data.topOffenders.map(s => `${s.name},${s.count}`).join('\n')}

Daily Trends:
${data.monthlyTrends.map(t => `${t.date},${t.count}`).join('\n')}
    `.trim()

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `behavior-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Format date based on date range
  const formatChartDate = (dateStr: string) => {
    const date = new Date(dateStr)
    switch (dateRange) {
      case 'week':
        return format(date, 'EEE') // Mon, Tue, etc.
      case 'month':
        return format(date, 'MMM d') // Jan 1, etc.
      case 'year':
        return format(date, 'MMM') // Jan, Feb, etc.
      default:
        return format(date, 'MMM d')
    }
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
            Behavior Analytics
          </h1>
        </div>
        <div className="flex space-x-4">
          <div className="flex items-center space-x-2 rounded-md bg-white px-3 py-2 shadow">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={dateRange}
              onChange={e =>
                setDateRange(e.target.value as 'week' | 'month' | 'year')
              }
              className="border-none text-sm text-gray-600 focus:ring-0"
            >
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
          <button
            onClick={exportData}
            className="btn-primary flex items-center"
          >
            <Download className="mr-2 h-5 w-5" />
            Export Report
          </button>
          <button
            onClick={fetchAnalytics}
            className="btn-sage flex items-center"
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-tmechs-forest" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Violations
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {data.totalViolations}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Students Involved
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {data.totalStudents}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Attendance Rate
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {data.attendanceRate.toFixed(1)}%
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Trend</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {data.totalViolations > 0 ? '+' : '-'}
                    {((data.totalViolations / 100) * 100).toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Violations by Type */}
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">
                Violations by Type
              </h2>
              <div className="space-y-4">
                {data.violationsByType.map((violation, index) => (
                  <div key={index}>
                    <div className="mb-1 flex justify-between text-sm text-gray-600">
                      <span>{violation.type}</span>
                      <span>{violation.count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-tmechs-forest"
                        style={{
                          width: `${(violation.count / data.totalViolations) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Violations by Grade */}
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">
                Violations by Grade
              </h2>
              <div className="space-y-4">
                {data.violationsByGrade.map((grade, index) => (
                  <div key={index}>
                    <div className="mb-1 flex justify-between text-sm text-gray-600">
                      <span>Grade {grade.grade}</span>
                      <span>{grade.count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-tmechs-forest"
                        style={{
                          width: `${(grade.count / data.totalViolations) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Offenders */}
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">
                Top Offenders
              </h2>
              <div className="space-y-4">
                {data.topOffenders.map((student, index) => (
                  <div key={index}>
                    <div className="mb-1 flex justify-between text-sm text-gray-600">
                      <span>{student.name}</span>
                      <span>{student.count} violations</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-tmechs-forest"
                        style={{
                          width: `${(student.count / Math.max(...data.topOffenders.map(s => s.count))) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Trends */}
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">
                Daily Violation Trends
              </h2>
              <div className="h-64">
                <div className="flex h-full items-end space-x-2">
  {data.monthlyTrends.map((trend, index) => {
    const maxCount = Math.max(
      ...data.monthlyTrends.map(t => t.violations + t.warnings)
    )
    const violationHeight = trend.violations
      ? (trend.violations / maxCount) * 100
      : 0
    const warningHeight = trend.warnings
      ? (trend.warnings / maxCount) * 100
      : 0

                    return (
                      <div key={index} className="flex flex-col items-center group w-10">
        <div className="flex w-full items-end gap-[2px] h-full">
          <div
            className="flex-1 bg-tmechs-forest rounded-t transition-all hover:opacity-80"
            style={{ height: `${violationHeight}%` }}
            title={`${trend.violations} violations on ${format(new Date(trend.date), 'MMM d, yyyy')}`}
          />
          <div
            className="flex-1 bg-yellow-500 rounded-t transition-all hover:opacity-80"
            style={{ height: `${warningHeight}%` }}
            title={`${trend.warnings} warnings on ${format(new Date(trend.date), 'MMM d, yyyy')}`}
          />
        </div>
        <span className="mt-1 text-xs text-gray-500">
          {formatChartDate(trend.date)}
        </span>
      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
