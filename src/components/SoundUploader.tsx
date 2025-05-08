import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'

export default function SoundUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    const isValidType = ['audio/mpeg', 'audio/wav'].includes(selected.type)
    if (!isValidType) {
      toast.error('Only .mp3 or .wav files are allowed.')
      return
    }

    if (selected.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5MB.')
      return
    }

    setFile(selected)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)

    const ext = file.name.split('.').pop()
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${Date.now()}-${cleanName}`

    // Step 1: Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('sounds')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      toast.error('Upload failed: ' + uploadError.message)
      console.error('Storage upload error:', uploadError)
      setUploading(false)
      return
    }

    // Step 2: Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('sounds')
      .getPublicUrl(fileName)

    const publicUrl = publicUrlData?.publicUrl
    setUploadedUrl(publicUrl || null)

    // Step 3: Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      toast.error('Could not get user info')
      setUploading(false)
      return
    }

    // Step 4: Insert into sound_options table
    const { error: insertError } = await supabase.from('sound_options').insert({
      name: cleanName,
      filename: fileName,
      uploaded_by: user.id,
    })

    if (insertError) {
      toast.error('Insert failed: ' + insertError.message)
      console.error('Insert error:', insertError)
    } else {
      toast.success('Sound uploaded and saved!')
    }

    setUploading(false)
  }

  return (
    <div className="space-y-4 rounded bg-white p-4 shadow">
      <h2 className="text-lg font-semibold">Upload Custom Sound</h2>
      <input
        type="file"
        accept=".mp3,.wav"
        onChange={handleFileChange}
        className="mb-2 block"
      />
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="rounded bg-tmechs-forest px-4 py-2 text-white disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>

      {uploadedUrl && (
        <div className="mt-2 text-sm text-green-700">
          Uploaded:{' '}
          <a
            href={uploadedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {uploadedUrl}
          </a>
        </div>
      )}
    </div>
  )
}
