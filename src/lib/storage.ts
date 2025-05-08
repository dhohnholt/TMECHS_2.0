import { supabase } from './supabase'

/**
 * Uploads a file to the specified bucket and path.
 * Defaults to 'user-uploads' if no bucket is provided.
 */
export async function uploadImage(
  file: File,
  path: string,
  bucket: string = 'user-uploads'
) {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file)
  if (error) {
    console.error(`Error uploading to bucket "${bucket}":`, error)
    throw error
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path)
  return publicUrl
}

/**
 * Gets the public URL for a file in the specified bucket.
 */
export function getPublicImageUrl(
  path: string,
  bucket: string = 'user-uploads'
) {
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path)
  return publicUrl
}
