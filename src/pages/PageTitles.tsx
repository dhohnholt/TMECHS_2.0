import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Loader2,
  FileText,
  ChevronRight,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react'
import { navLinks } from '../components/Header'
import { supabase } from '../lib/supabase'

interface PageTitle {
  id?: string
  path: string
  label: string
  description: string
  is_visible: boolean
}

export default function PageTitlesContent() {
  const navigate = useNavigate()
  const [editingTitle, setEditingTitle] = useState<PageTitle | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [customTitles, setCustomTitles] = useState<Record<string, PageTitle>>(
    {}
  )

  useEffect(() => {
    fetchCustomTitles()
  }, [])

  const fetchCustomTitles = async () => {
    try {
      const { data, error } = await supabase.from('page_titles').select('*')

      if (error) throw error

      const titleMap = (data || []).reduce(
        (acc: Record<string, PageTitle>, title) => {
          acc[title.path] = title
          return acc
        },
        {}
      )

      setCustomTitles(titleMap)
    } catch (error) {
      console.error('Error fetching custom titles:', error)
      toast.error('Failed to load custom titles')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTitle) return

    setSaving(true)
    try {
      const { path, label, description, is_visible } = editingTitle

      if (editingTitle.id) {
        const { error } = await supabase
          .from('page_titles')
          .update({ label, description, is_visible })
          .eq('id', editingTitle.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('page_titles')
          .insert({ path, label, description, is_visible })

        if (error) throw error
      }

      toast.success('Page title updated successfully')
      setEditingTitle(null)
      fetchCustomTitles()
    } catch (error) {
      console.error('Error updating page title:', error)
      toast.error('Failed to update page title')
    } finally {
      setSaving(false)
    }
  }

  const toggleVisibility = async (path: string, currentVisibility: boolean) => {
    setSaving(true)
    try {
      const customTitle = customTitles[path]

      if (customTitle) {
        const { error } = await supabase
          .from('page_titles')
          .update({ is_visible: !currentVisibility })
          .eq('id', customTitle.id)

        if (error) throw error
      } else {
        const defaultTitle = navLinks.find(link => link.to === path)
        if (!defaultTitle) throw new Error('Page not found')

        const { error } = await supabase.from('page_titles').insert({
          path,
          label: defaultTitle.label,
          description: defaultTitle.description,
          is_visible: !currentVisibility,
        })

        if (error) throw error
      }

      toast.success(`Page ${currentVisibility ? 'hidden' : 'visible'}`)
      fetchCustomTitles()
    } catch (error) {
      console.error('Error toggling visibility:', error)
      toast.error('Failed to update visibility')
    } finally {
      setSaving(false)
    }
  }

  const resetToDefault = async (path: string) => {
    if (!window.confirm('Reset this page title to default?')) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('page_titles')
        .delete()
        .eq('path', path)

      if (error) throw error

      toast.success('Reset to default title')
      fetchCustomTitles()
    } catch (error) {
      console.error('Error resetting title:', error)
      toast.error('Failed to reset title')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-tmechs-forest" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center space-x-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-tmechs-forest hover:text-tmechs-forest/80"
        >
          <ArrowLeft className="h-6 w-6" />
          <span className="ml-1">Back</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Page Titles</h1>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="space-y-6">
          {navLinks.map(page => {
            const customTitle = customTitles[page.to]
            const currentTitle = customTitle || page
            const isVisible = customTitle ? customTitle.is_visible : true

            return (
              <div
                key={page.to}
                className="border-b border-gray-200 pb-6 last:border-0 last:pb-0"
              >
                {editingTitle?.path === page.to ? (
                  <form onSubmit={handleSave} className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Page Title
                      </label>
                      <input
                        type="text"
                        value={editingTitle.label}
                        onChange={e =>
                          setEditingTitle({
                            ...editingTitle,
                            label: e.target.value,
                          })
                        }
                        className="w-full rounded-md border border-gray-300 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
                        required
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <input
                        type="text"
                        value={editingTitle.description}
                        onChange={e =>
                          setEditingTitle({
                            ...editingTitle,
                            description: e.target.value,
                          })
                        }
                        className="w-full rounded-md border border-gray-300 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
                        required
                        disabled={saving}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`show-home-${page.to}`}
                        checked={editingTitle.is_visible}
                        onChange={e =>
                          setEditingTitle({
                            ...editingTitle,
                            is_visible: e.target.checked,
                          })
                        }
                        className="rounded border-gray-300 text-tmechs-forest focus:ring-tmechs-forest"
                        disabled={saving}
                      />
                      <label
                        htmlFor={`show-home-${page.to}`}
                        className="text-sm text-gray-700"
                      >
                        Show page
                      </label>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center rounded-md bg-tmechs-forest px-4 py-2 text-white hover:bg-tmechs-forest/90 disabled:opacity-50"
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
                        onClick={() => setEditingTitle(null)}
                        disabled={saving}
                        className="flex items-center rounded-md px-4 py-2 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                      >
                        <X className="mr-2 h-5 w-5" />
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="group flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <FileText className="mr-2 h-5 w-5 text-tmechs-forest" />
                        <h3 className="text-lg font-medium text-gray-900">
                          {currentTitle.label}
                          {customTitle && (
                            <span className="ml-2 rounded bg-tmechs-sage/20 px-2 py-0.5 text-xs text-tmechs-forest">
                              Custom
                            </span>
                          )}
                        </h3>
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <span className="font-mono">{page.to}</span>
                        <ChevronRight className="mx-2 h-4 w-4" />
                        <span>{currentTitle.description}</span>
                      </div>
                    </div>
                    <div className="ml-4 flex items-center space-x-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => toggleVisibility(page.to, isVisible)}
                        disabled={saving}
                        className={`rounded-full p-2 hover:bg-gray-100 ${
                          isVisible
                            ? 'text-green-600 hover:text-green-700'
                            : 'text-gray-400 hover:text-gray-500'
                        }`}
                        title={isVisible ? 'Hide page' : 'Show page'}
                      >
                        {isVisible ? (
                          <Eye className="h-5 w-5" />
                        ) : (
                          <EyeOff className="h-5 w-5" />
                        )}
                      </button>
                      {customTitle && (
                        <button
                          onClick={() => resetToDefault(page.to)}
                          disabled={saving}
                          className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-tmechs-forest"
                          title="Reset to default"
                        >
                          <RefreshCw className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() =>
                          setEditingTitle({
                            id: customTitle?.id,
                            path: page.to,
                            label: currentTitle.label,
                            description: currentTitle.description,
                            is_visible: isVisible,
                          })
                        }
                        disabled={saving}
                        className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-tmechs-forest"
                        title="Edit title"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
