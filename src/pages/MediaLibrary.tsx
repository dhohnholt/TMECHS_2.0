import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  ArrowLeft,
  Upload,
  Trash2,
  Image,
  Copy,
  Check,
  Loader2,
  Search,
  FolderOpen,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

interface MediaFile {
  name: string
  url: string
  size: number
  type: string
  created_at: string
}

export default function MediaLibrary() {
  const navigate = useNavigate()
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    checkAdminStatus()
    fetchFiles()
  }, [])

  const checkAdminStatus = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      const { data: teacherData, error } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (error || !teacherData?.is_admin) {
        toast.error('Unauthorized access')
        navigate('/')
        return
      }

      setIsAdmin(true)
    } catch (error) {
      console.error('Error checking admin status:', error)
      navigate('/')
    }
  }

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('site-assets')
        .list('', {
          sortBy: { column: 'created_at', order: 'desc' },
        })

      if (error) throw error

      const fileUrls = await Promise.all(
        data.map(async file => {
          const {
            data: { publicUrl },
          } = supabase.storage.from('site-assets').getPublicUrl(file.name)

          return {
            name: file.name,
            url: publicUrl,
            size: file.metadata.size,
            type: file.metadata.mimetype,
            created_at: file.created_at,
          }
        })
      )

      setFiles(fileUrls)
    } catch (error) {
      console.error('Error fetching files:', error)
      toast.error('Failed to load media files')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed')
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    setUploading(true)
    try {
      const fileName = `${Date.now()}-${file.name}`
      const { error } = await supabase.storage
        .from('site-assets')
        .upload(fileName, file)

      if (error) throw error

      toast.success('File uploaded successfully')
      fetchFiles()
    } catch (error) {
      console.error('Error uploading file:', error)
      toast.error('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (fileName: string) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return

    try {
      const { error } = await supabase.storage
        .from('site-assets')
        .remove([fileName])

      if (error) throw error

      toast.success('File deleted successfully')
      setFiles(files.filter(file => file.name !== fileName))
    } catch (error) {
      console.error('Error deleting file:', error)
      toast.error('Failed to delete file')
    }
  }

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isAdmin) {
    return null
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center space-x-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-tmechs-forest hover:text-tmechs-forest/80"
        >
          <ArrowLeft className="h-6 w-6" />
          <span className="ml-1">Back</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Media Library</h1>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="rounded-md border border-gray-300 pl-10 focus:border-tmechs-forest focus:ring-tmechs-forest"
              />
            </div>
          </div>
          <label className="btn-primary flex cursor-pointer items-center">
            <Upload className="mr-2 h-5 w-5" />
            Upload Image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-tmechs-forest" />
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="py-12 text-center">
            <FolderOpen className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="text-gray-500">No media files found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredFiles.map(file => (
              <div
                key={file.name}
                className="group overflow-hidden rounded-lg border border-gray-200"
              >
                <div className="relative aspect-video bg-gray-100">
                  <img
                    src={file.url}
                    alt={file.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center space-x-2 bg-black bg-opacity-50 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => copyUrl(file.url)}
                      className="rounded-full bg-white p-2 hover:bg-gray-100"
                      title="Copy URL"
                    >
                      {copiedUrl === file.url ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <Copy className="h-5 w-5 text-gray-600" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(file.name)}
                      className="rounded-full bg-white p-2 hover:bg-gray-100"
                      title="Delete file"
                    >
                      <Trash2 className="h-5 w-5 text-red-600" />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {file.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
