import React, { useState, useEffect } from 'react'
import { Calendar, Users, AlertTriangle, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  subMonths,
} from 'date-fns'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [violationStats, setViolationStats] = useState([])
  const [monthlyTrends, setMonthlyTrends] = useState([])
  const [totalViolations, setTotalViolations] = useState(0)
  const [totalStudents, setTotalStudents] = useState(0)
  const [detentionSessions, setDetentionSessions] = useState(0)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      const { data: violationTypes } = await supabase
        .from('violations')
        .select('violation_type')
        .gte('created_at', subMonths(new Date(), 1).toISOString())

      const typeCounts = {}
      violationTypes?.forEach(v => {
        typeCounts[v.violation_type] = (typeCounts[v.violation_type] || 0) + 1
      })

      setViolationStats(
        Object.entries(typeCounts).map(([type, count]) => ({ type, count }))
      )

      const startDate = startOfMonth(subMonths(new Date(), 2))
      const endDate = endOfMonth(new Date())

      const { data: trendData } = await supabase
        .from('violations')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      const dailyCounts = {}
      const days = eachDayOfInterval({ start: startDate, end: endDate })

      days.forEach(day => {
        dailyCounts[format(day, 'yyyy-MM-dd')] = 0
      })

      trendData?.forEach(v => {
        const date = format(new Date(v.created_at), 'yyyy-MM-dd')
        dailyCounts[date] = (dailyCounts[date] || 0) + 1
      })

      setMonthlyTrends(
        Object.entries(dailyCounts).map(([date, count]) => ({ date, count }))
      )

      setTotalViolations(trendData?.length || 0)

      const { count: studentCount } = await supabase
        .from('violations')
        .select('student_id', { count: 'exact', head: true, distinct: true })
        .gte('created_at', startDate.toISOString())

      setTotalStudents(studentCount || 0)

      const { count: sessionCount } = await supabase
        .from('detention_slots')
        .select('*', { count: 'exact', head: true })
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())

      setDetentionSessions(sessionCount || 0)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-tmechs-forest" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">
        Behavior Monitoring Dashboard
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Violations
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {totalViolations}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <p className="mt-2 text-sm text-gray-500">Last 30 days</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Detention Sessions
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {detentionSessions}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
          <p className="mt-2 text-sm text-gray-500">This month</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Students Involved
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {totalStudents}
              </p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
          <p className="mt-2 text-sm text-gray-500">Active cases</p>
        </div>
      </div>

      {/* Violation Types Chart */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Violation Types Distribution
        </h2>
        <div className="space-y-4">
          {violationStats.map(stat => (
            <div key={stat.type}>
              <div className="mb-1 flex justify-between text-sm text-gray-600">
                <span>{stat.type}</span>
                <span>{stat.count}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-tmechs-forest"
                  style={{
                    width: `${
                      (stat.count /
                        Math.max(...violationStats.map(s => s.count))) *
                      100
                    }%`,
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
          <div className="flex h-full items-end space-x-1">
            {monthlyTrends.map((trend, index) => {
              const maxCount = Math.max(...monthlyTrends.map(t => t.count))
              const height = trend.count ? (trend.count / maxCount) * 100 : 0

              return (
                <div
                  key={index}
                  className="group flex flex-1 flex-col items-center"
                  title={`${trend.count} violations on ${format(
                    new Date(trend.date),
                    'MMM d, yyyy'
                  )}`}
                >
                  <div className="relative w-full">
                    <div
                      className="w-full rounded-t bg-tmechs-forest transition-all duration-200 hover:bg-tmechs-forest/80"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="mt-2 origin-top-left -rotate-45 transform text-xs text-gray-500">
                    {format(new Date(trend.date), 'MMM d')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
