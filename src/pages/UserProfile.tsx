import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  User,
  Mail,
  Bell,
  Lock,
  Save,
  Trash2,
  LogOut,
  CheckSquare,
  AlertCircle,
  ArrowLeft,
  Home,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { applyTheme } from '../lib/theme'

interface UserPreferences {
  emailNotifications: boolean
  detentionReminders: boolean
  violationAlerts: boolean
  weeklyReports: boolean
  theme: 'light' | 'dark' | 'system'
}

interface TeacherProfile {
  id: string
  name: string
  email: string
  classroom_number: string | null
  preferences: UserPreferences
  is_approved: boolean
  is_admin: boolean
}

function UserProfile() {
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<TeacherProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    classroom_number: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [preferences, setPreferences] = useState<UserPreferences>({
    emailNotifications: true,
    detentionReminders: true,
    violationAlerts: true,
    weeklyReports: true,
    theme: 'system',
  })

  const fetchProfile = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        toast.error('Session expired. Please log in again.')
        navigate('/login')
        return
      }

      const { data: teacherData, error: teacherError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (teacherError) {
        throw teacherError
      }

      if (!teacherData) {
        toast.error('Teacher profile not found. Please contact support.')
        navigate('/login')
        return
      }

      setProfile(teacherData)
      setEditForm({
        name: teacherData.name,
        email: teacherData.email,
        classroom_number: teacherData.classroom_number || '',
      })
      if (teacherData.preferences) {
        setPreferences(teacherData.preferences)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('No user logged in')
      const path = `${user.id}/profile.png`
      const { uploadImage } = await import('../lib/storage')
      const url = await uploadImage(file, path, 'user-uploads')
      setProfileImage(url)
      toast.success('Profile image uploaded!')
    } catch (err) {
      console.error('Upload error', err)
      toast.error('Failed to upload image')
    }
  }

  const validateEmail = (email: string) => {
    const re = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
    return re.test(email)
  }

  const validateClassroomNumber = (number: string) => {
    if (!number) return true // Optional field
    return /^[A-Z][0-9]{3}$/.test(number)
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!validateEmail(editForm.email)) {
        toast.error('Please enter a valid email address')
        return
      }

      if (!validateClassroomNumber(editForm.classroom_number)) {
        toast.error('Classroom number must be in format: C101, A203, etc.')
        return
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          name: editForm.name,
          email: editForm.email,
          classroom_number: editForm.classroom_number || null,
        })
        .eq('id', profile?.id)

      if (updateError) throw updateError

      if (editForm.email !== profile?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: editForm.email,
        })

        if (emailError) throw emailError
        toast.success(
          'Email update confirmation sent. Please check your inbox.'
        )
      }

      toast.success('Profile updated successfully')
      setIsEditing(false)
      await fetchProfile() // Ensure async completion
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  // ... handleUpdatePassword, handleUpdatePreferences unchanged ...
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error('New passwords do not match.')
        return
      }

      if (passwordForm.newPassword.length < 8) {
        toast.error('Password must be at least 8 characters.')
        return
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      })

      if (error) throw error

      toast.success('Password updated successfully')
      setShowPasswordForm(false)
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error) {
      console.error('Password update error:', error)
      toast.error('Failed to update password.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        'Are you absolutely sure you want to delete your account? This action cannot be undone.'
      )
    ) {
      return
    }

    setSaving(true)
    try {
      if (!profile?.id) throw new Error('No profile found')
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', profile.id)

      if (deleteError) throw deleteError

      const { error: authError } = await supabase.auth.signOut()
      if (authError) throw authError

      toast.success('Account deleted successfully')
      navigate('/login')
    } catch (error) {
      console.error('Error deleting account:', error)
      toast.error('Failed to delete account')
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error('Failed to sign out')
    }
  }

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          preferences: {
            ...preferences,
            theme: newTheme,
          },
        })
        .eq('id', profile?.id)

      if (error) throw error

      setPreferences(prev => ({
        ...prev,
        theme: newTheme,
      }))

      applyTheme(newTheme)
      toast.success('Theme updated successfully')
    } catch (error) {
      console.error('Error updating theme:', error)
      toast.error('Failed to update theme')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[var(--color-background)]">
        <Loader2 className="h-8 w-8 animate-spin text-tmechs-forest dark:text-tmechs-light" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] py-6 sm:py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-6 flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center rounded-md px-3 py-2 text-[var(--color-text)] transition-all duration-300 hover:bg-tmechs-sage/20 dark:hover:bg-tmechs-forest/20"
          >
            <ArrowLeft className="mr-1 h-6 w-6" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            User Profile
          </h1>
        </div>

        <div className="rounded-lg bg-[var(--color-card)] p-6 shadow-md dark:shadow-tmechs-forest/50">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text)]">
                User Profile
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {profile?.is_admin ? 'Administrator' : 'Teacher'} •{' '}
                {profile?.is_approved ? (
                  <span className="text-green-600 dark:text-green-400">
                    Approved
                  </span>
                ) : (
                  <span className="text-yellow-600 dark:text-yellow-400">
                    Pending Approval
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center rounded-md px-4 py-2 text-red-600 transition-all duration-300 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <LogOut className="mr-2 h-5 w-5" />
              Sign Out
            </button>
          </div>

          <div className="space-y-6">
            {/* Profile Information */}
            <div className="border-b border-gray-200 pb-6 dark:border-tmechs-forest/50">
              <h2 className="mb-4 flex items-center text-lg font-semibold text-[var(--color-text)]">
                <User className="mr-2 h-5 w-5 text-tmechs-forest dark:text-tmechs-light" />
                Profile Information
              </h2>

              {isEditing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={e =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      className="w-full rounded-md border border-gray-300 bg-white text-[var(--color-text)] transition-all duration-300 focus:border-tmechs-forest focus:ring focus:ring-tmechs-forest/20 dark:border-tmechs-forest dark:bg-tmechs-dark dark:focus:border-tmechs-sage dark:focus:ring-tmechs-sage/20"
                      required
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={e =>
                        setEditForm({ ...editForm, email: e.target.value })
                      }
                      className="w-full rounded-md border border-gray-300 bg-white text-[var(--color-text)] transition-all duration-300 focus:border-tmechs-forest focus:ring focus:ring-tmechs-forest/20 dark:border-tmechs-forest dark:bg-tmechs-dark dark:focus:border-tmechs-sage dark:focus:ring-tmechs-sage/20"
                      required
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                      Classroom Number
                    </label>
                    <div className="relative">
                      <Home className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400 dark:text-tmechs-light/60" />
                      <input
                        type="text"
                        value={editForm.classroom_number}
                        onChange={e =>
                          setEditForm({
                            ...editForm,
                            classroom_number: e.target.value.toUpperCase(),
                          })
                        }
                        className="w-full rounded-md border border-gray-300 bg-white pl-10 text-[var(--color-text)] transition-all duration-300 focus:border-tmechs-forest focus:ring focus:ring-tmechs-forest/20 dark:border-tmechs-forest dark:bg-tmechs-dark dark:focus:border-tmechs-sage dark:focus:ring-tmechs-sage/20"
                        placeholder="C101"
                        pattern="[A-Z][0-9]{3}"
                        title="Format: C101, A203, etc."
                        disabled={saving}
                      />
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Format: C101, A203, etc. Leave blank if no assigned
                      classroom.
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center rounded-md bg-tmechs-forest px-4 py-2 text-white transition-all duration-300 hover:bg-tmechs-forest/90 disabled:opacity-50 dark:bg-tmechs-sage dark:hover:bg-tmechs-sage/80"
                    >
                      {saving ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-5 w-5" />
                      )}
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      disabled={saving}
                      className="rounded-md px-4 py-2 text-[var(--color-text)] transition-all duration-300 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-tmechs-forest/20"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                      Full Name
                    </label>
                    <p className="text-[var(--color-text)]">{profile?.name}</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                      Email Address
                    </label>
                    <p className="text-[var(--color-text)]">{profile?.email}</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                      Classroom Number
                    </label>
                    <p className="text-[var(--color-text)]">
                      {profile?.classroom_number || 'No classroom assigned'}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center rounded-md px-4 py-2 text-tmechs-forest transition-all duration-300 hover:bg-tmechs-sage/10 dark:text-tmechs-light dark:hover:bg-tmechs-forest/20"
                  >
                    <Mail className="mr-2 h-5 w-5" />
                    Edit Profile
                  </button>
                </div>
              )}
            </div>

            {/* Password Section */}
            <div className="border-b border-gray-200 pb-6 dark:border-tmechs-forest/50">
              <h2 className="mb-4 flex items-center text-lg font-semibold text-[var(--color-text)]">
                <Lock className="mr-2 h-5 w-5 text-tmechs-forest dark:text-tmechs-light" />
                Password
              </h2>

              {showPasswordForm ? (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordForm.currentPassword}
                        onChange={e =>
                          setPasswordForm({
                            ...passwordForm,
                            currentPassword: e.target.value,
                          })
                        }
                        className="w-full rounded-md border border-gray-300 bg-white pr-10 text-[var(--color-text)] transition-all duration-300 focus:border-tmechs-forest focus:ring focus:ring-tmechs-forest/20 dark:border-tmechs-forest dark:bg-tmechs-dark dark:focus:border-tmechs-sage dark:focus:ring-tmechs-sage/20"
                        required
                        disabled={saving}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-400 hover:text-gray-600 dark:text-tmechs-light/60 dark:hover:text-tmechs-light"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={e =>
                        setPasswordForm({
                          ...passwordForm,
                          newPassword: e.target.value,
                        })
                      }
                      className="w-full rounded-md border border-gray-300 bg-white text-[var(--color-text)] transition-all duration-300 focus:border-tmechs-forest focus:ring focus:ring-tmechs-forest/20 dark:border-tmechs-forest dark:bg-tmechs-dark dark:focus:border-tmechs-sage dark:focus:ring-tmechs-sage/20"
                      required
                      minLength={8}
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={e =>
                        setPasswordForm({
                          ...passwordForm,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="w-full rounded-md border border-gray-300 bg-white text-[var(--color-text)] transition-all duration-300 focus:border-tmechs-forest focus:ring focus:ring-tmechs-forest/20 dark:border-tmechs-forest dark:bg-tmechs-dark dark:focus:border-tmechs-sage dark:focus:ring-tmechs-sage/20"
                      required
                      minLength={8}
                      disabled={saving}
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center rounded-md bg-tmechs-forest px-4 py-2 text-white transition-all duration-300 hover:bg-tmechs-forest/90 disabled:opacity-50 dark:bg-tmechs-sage dark:hover:bg-tmechs-sage/80"
                    >
                      {saving ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-5 w-5" />
                      )}
                      Update Password
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPasswordForm(false)}
                      disabled={saving}
                      className="rounded-md px-4 py-2 text-[var(--color-text)] transition-all duration-300 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-tmechs-forest/20"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="flex items-center rounded-md px-4 py-2 text-tmechs-forest transition-all duration-300 hover:bg-tmechs-sage/10 dark:text-tmechs-light dark:hover:bg-tmechs-forest/20"
                >
                  <Lock className="mr-2 h-5 w-5" />
                  Change Password
                </button>
              )}
            </div>

            {/* Notification Preferences */}
            <div className="border-b border-gray-200 pb-6 dark:border-tmechs-forest/50">
              <h2 className="mb-4 flex items-center text-lg font-semibold text-[var(--color-text)]">
                <Bell className="mr-2 h-5 w-5 text-tmechs-forest dark:text-tmechs-light" />
                Notification Preferences
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[var(--color-text)]">
                      Email Notifications
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receive general email notifications
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setPreferences(prev => ({
                        ...prev,
                        emailNotifications: !prev.emailNotifications,
                      }))
                      handleUpdatePreferences()
                    }}
                    disabled={saving}
                    className={`rounded-md p-2 transition-colors ${
                      preferences.emailNotifications
                        ? 'bg-tmechs-forest text-white dark:bg-tmechs-sage dark:text-gray-900'
                        : 'bg-tmechs-sage/20 text-gray-600 dark:bg-tmechs-forest/20 dark:text-gray-400'
                    } disabled:opacity-50`}
                  >
                    <CheckSquare className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[var(--color-text)]">
                      Detention Reminders
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Get reminded about upcoming detention duty
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setPreferences(prev => ({
                        ...prev,
                        detentionReminders: !prev.detentionReminders,
                      }))
                      handleUpdatePreferences()
                    }}
                    disabled={saving}
                    className={`rounded-md p-2 transition-colors ${
                      preferences.detentionReminders
                        ? 'bg-tmechs-forest text-white dark:bg-tmechs-sage dark:text-gray-900'
                        : 'bg-tmechs-sage/20 text-gray-600 dark:bg-tmechs-forest/20 dark:text-gray-400'
                    } disabled:opacity-50`}
                  >
                    <CheckSquare className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[var(--color-text)]">
                      Violation Alerts
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receive alerts about new violations
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setPreferences(prev => ({
                        ...prev,
                        violationAlerts: !prev.violationAlerts,
                      }))
                      handleUpdatePreferences()
                    }}
                    disabled={saving}
                    className={`rounded-md p-2 transition-colors ${
                      preferences.violationAlerts
                        ? 'bg-tmechs-forest text-white dark:bg-tmechs-sage dark:text-gray-900'
                        : 'bg-tmechs-sage/20 text-gray-600 dark:bg-tmechs-forest/20 dark:text-gray-400'
                    } disabled:opacity-50`}
                  >
                    <CheckSquare className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[var(--color-text)]">
                      Weekly Reports
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receive weekly behavior reports
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setPreferences(prev => ({
                        ...prev,
                        weeklyReports: !prev.weeklyReports,
                      }))
                      handleUpdatePreferences()
                    }}
                    disabled={saving}
                    className={`rounded-md p-2 transition-colors ${
                      preferences.weeklyReports
                        ? 'bg-tmechs-forest text-white dark:bg-tmechs-sage dark:text-gray-900'
                        : 'bg-tmechs-sage/20 text-gray-600 dark:bg-tmechs-forest/20 dark:text-gray-400'
                    } disabled:opacity-50`}
                  >
                    <CheckSquare className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Theme Preferences */}
            <div className="border-b border-gray-200 pb-6 dark:border-tmechs-forest/50">
              <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">
                Theme
              </h2>
              <div className="flex space-x-4">
                {(['light', 'dark', 'system'] as const).map(theme => (
                  <button
                    key={theme}
                    onClick={() => handleThemeChange(theme)}
                    disabled={saving}
                    className={`rounded-md px-4 py-2 transition-colors ${
                      preferences.theme === theme
                        ? 'bg-tmechs-forest text-white dark:bg-tmechs-sage dark:text-gray-900'
                        : 'bg-tmechs-sage/20 text-gray-600 hover:bg-tmechs-sage/30 dark:bg-tmechs-forest/20 dark:text-gray-400 dark:hover:bg-tmechs-forest/30'
                    } disabled:opacity-50`}
                  >
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Account Deletion */}
            <div>
              <h2 className="mb-4 flex items-center text-lg font-semibold text-red-600 dark:text-red-400">
                <AlertCircle className="mr-2 h-5 w-5" />
                Delete Account
              </h2>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Once you delete your account, there is no going back. Please be
                certain.
              </p>
              <button
                onClick={handleDeleteAccount}
                disabled={saving}
                className="flex items-center rounded-md px-4 py-2 text-red-600 transition-all duration-300 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-5 w-5" />
                )}
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserProfile
