import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Home,
  BookOpen,
  Users,
  ArrowUpFromLine,
  Settings,
  Shield,
  LogOut,
  UserPlus,
  LogIn,
  FileText,
  FilePenLine,
  Mail,
  UserCog,
  Image,
  Calendar,
  Flame,
  BarChart3,
  Shovel,
  TrendingUp,
  School2,
  ClipboardList,
  UserCheck,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react'

export const navGroups = {
  monitoring: [
    { to: '/violations', icon: ClipboardList, label: 'Record Violation' },
    { to: '/attendance', icon: UserCheck, label: 'Detention Attendance' },
    { to: '/update-record', icon: Calendar, label: 'Update Records' },
    { to: '/monitor-signup', icon: School2, label: 'Monitor Signup' },
    { to: '/detention', icon: Calendar, label: ' Detention Schedule' },
  ],
  management: [
    { to: '/daily-attendance', icon: UserCheck, label: 'Daily Attendance' },
    { to: '/class-manager', icon: ArrowUpFromLine, label: 'Class Manager' },
    { to: '/analytics', icon: TrendingUp, label: 'Analytics' },
    {
      to: '/teacher-report',
      icon: FilePenLine,
      label: 'Teacher Attendance Report',
    },
    { to: '/dashboard', icon: BarChart3, label: 'Dashboard' },
    { to: '/student-schedule', icon: Shovel, label: 'Student Schedule' },
  ],
  account: [
    { to: '/profile', icon: Settings, label: 'Profile' },
    { to: '/login', icon: LogIn, label: 'Login' },
    { to: '/logout', icon: LogOut, label: 'Logout' },
    { to: '/user-guide', icon: Settings, label: 'Users Guide' },
  ],
  admin: [
    { to: '/teacher-approval', icon: Shield, label: 'Approvals' },
    { to: '/page-titles', icon: FileText, label: 'Page Titles' },
    { to: '/parent-portal', icon: Shield, label: 'Parent Portal' },
    { to: '/parent-accounts', icon: UserCog, label: 'Parent Accounts' },
    { to: '/sandbox1', icon: UserCog, label: 'Sandbox 1' },
    { to: '/sandbox2', icon: Mail, label: 'Sandbox2' },
    { to: '/students', icon: Users, label: 'Students' },
    { to: '/register', icon: UserPlus, label: 'Register' },
    { to: '/media-library', icon: Image, label: 'Media Library' },
  ],
}
export const navLinks = [
  ...navGroups.monitoring,
  ...navGroups.management,
  ...navGroups.account,
  ...navGroups.admin,
]

export default function Header({ isAdmin = false }: { isAdmin: boolean }) {
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const handleDropdownClick = (group: string) => {
    setOpenDropdown(openDropdown === group ? null : group)
  }

  const handleNavigate = (to: string) => {
    navigate(to)
    setIsMenuOpen(false)
    setOpenDropdown(null)
  }

  // Only include the admin tab if the user is an admin
  const visibleGroups = Object.entries(navGroups).filter(
    ([group]) => group !== 'admin' || isAdmin
  )

  return (
    <nav className="rounded-md bg-tmechs-forest text-white shadow-xl">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <img
              src="https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets//TMECHS_Logo_Gradient.png"
              alt="Logo"
              className="mr-2 h-8 w-8"
            />
            <span className="text-xl font-bold">TMECHS Monitor</span>
          </div>
          <div className="hidden space-x-4 md:flex">
            <Link
              to="/homepage"
              className="flex items-center rounded-md px-3 py-2 hover:bg-tmechs-sage/20"
            >
              <Home className="mr-1 h-5 w-5" /> Home
            </Link>
            {visibleGroups.map(([group, links]) => (
              <div className="relative" key={group}>
                <button
                  onClick={() => handleDropdownClick(group)}
                  className="flex items-center rounded-md px-3 py-2 hover:bg-tmechs-sage/20"
                >
                  <span className="mr-1 capitalize">{group}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                {openDropdown === group && (
                  <div className="absolute z-50 mt-2 w-64 rounded-md bg-white text-black shadow-lg">
                    {links.map(({ to, icon: Icon, label }) => (
                      <button
                        key={to}
                        onClick={() => handleNavigate(to)}
                        className="flex w-full items-center px-4 py-2 text-left hover:bg-tmechs-sage/10"
                      >
                        <Icon className="mr-2 h-4 w-4" /> {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="rounded-md p-2 hover:bg-tmechs-sage/20"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="px-4 pb-4 md:hidden">
          {visibleGroups.map(([group, links]) => (
            <div key={group} className="mb-2">
              <h3 className="mb-1 text-sm font-medium uppercase text-tmechs-sage/70">
                {group}
              </h3>
              {links.map(({ to, icon: Icon, label }) => (
                <button
                  key={to}
                  onClick={() => handleNavigate(to)}
                  className="flex w-full items-center rounded-md px-3 py-2 text-left hover:bg-tmechs-sage/10"
                >
                  <Icon className="mr-2 h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </nav>
  )
}
