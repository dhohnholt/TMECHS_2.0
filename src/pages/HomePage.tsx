import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  School2,
  ClipboardList,
  UserCheck,
  UserPlus,
  LogIn,
  Loader2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { navLinks } from '../components/Header'

export default function HomePage() {
  const [visibleLinks, setVisibleLinks] = useState<typeof navLinks>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Attempt to capture session from magic link
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        supabase.auth.getSessionFromUrl().then(({ data, error }) => {
          if (error) console.error('Session from URL error:', error)
          else console.log('Magic link session set:', data)
        })
      }
    })

    const fetchVisibleLinks = async () => {
      try {
        const { data: pageTitles, error } = await supabase
          .from('page_titles')
          .select('path, is_visible')

        if (error) throw error

        const visibilityMap = (pageTitles || []).reduce(
          (acc: Record<string, boolean>, title) => {
            acc[title.path] = title.is_visible
            return acc
          },
          {}
        )

        const filteredLinks = navLinks.filter(link => {
          return visibilityMap[link.to] === undefined || visibilityMap[link.to]
        })

        setVisibleLinks(filteredLinks)
      } catch (error) {
        console.error('Error fetching page visibility:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchVisibleLinks()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-tmechs-forest" />
      </div>
    )
  }

  return (
    <div className="min-h-[80vh]">
      {/* Hero Section */}
      <div className="relative mb-12 text-center shadow-md">
        <div className="relative h-[400px] overflow-hidden rounded-lg">
          <img
            src="https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets//tmechs_banner.png"
            alt="TMECHS Building"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/40 to-black/40">
            <div className="p-6 text-white">
              <div className="mb-8 flex justify-center">
                <img
                  src="https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets/TMECHS%20Logo%20Gradient.png"
                  alt="TMECHS Logo"
                  className="h-32 w-32 object-contain"
                />
              </div>
              <h1
                className="mb-4 text-4xl font-bold"
                style={{ textShadow: '2px 4px 3px rgba(0, 0, 0, 0.7)' }}
              >
                Welcome to TMECHS Behavior Monitor
              </h1>
              <p
                className="mx-auto max-w-2xl text-xl"
                style={{ textShadow: '2px 4px 5px rgba(0, 0, 0, 0.7)' }}
              >
                Your comprehensive platform for managing student behavior,
                detention scheduling, and attendance tracking.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visibleLinks.map(link => {
          if (link.to === '/login' || link.to === '/register') return null

          const Icon = link.icon

          return (
            <Link
              key={link.to}
              to={link.to}
              className="group transform rounded-lg bg-white p-6 shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-4 flex items-center">
                <div className="rounded-lg bg-tmechs-sage/20 p-2 transition-colors group-hover:bg-tmechs-sage/30">
                  <Icon className="h-6 w-6 text-tmechs-forest" />
                </div>
                <h2 className="ml-3 text-xl font-semibold text-tmechs-dark">
                  {link.label}
                </h2>
              </div>
              <p className="text-tmechs-gray">{link.description}</p>
              <div className="mt-4 font-medium text-tmechs-forest group-hover:text-tmechs-forest/80">
                Access {link.label} →
              </div>
            </Link>
          )
        })}
      </div>

      {/* Quick Actions Placeholder */}
      <div className="pt-6">
        <div className="relative mb-6 h-40 max-h-40 overflow-hidden rounded-lg">
          <img
            src="https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets//tmechs-07.jpg"
            alt="TMECHS Building"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            <h2
              className="relative px-4 text-center text-4xl font-bold text-white drop-shadow-2xl"
              style={{ textShadow: '2px 4px 5px rgba(0, 0, 0, 0.9)' }}
            >
              TMECHS Behavior Monitor
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Add your quick action buttons/links here */}
        </div>
      </div>
    </div>
  )
}
