/**
 * Supabase Storage Utilities
 * 
 * Handles file uploads, downloads, and management for storage buckets
 */

import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'

export interface UploadOptions {
  bucket: string
  path: string
  file: File | Blob
  contentType?: string
  metadata?: Record<string, string>
  cacheControl?: string
}

export interface StorageFile {
  name: string
  id: string
  updated_at: string
  created_at: string
  last_accessed_at: string
  metadata: Record<string, any>
}

/**
 * Upload file to Supabase Storage (client-side)
 */
export async function uploadFile(options: UploadOptions): Promise<StorageFile> {
  const supabase = createClient()
  if (!supabase) {
    throw new Error('Supabase client not available')
  }

  const { data, error } = await supabase.storage
    .from(options.bucket)
    .upload(options.path, options.file, {
      contentType: options.contentType || options.file.type,
      cacheControl: options.cacheControl || '3600',
      upsert: true,
    })

  if (error) throw error

  // Update metadata if provided
  if (options.metadata && data) {
    await supabase.storage
      .from(options.bucket)
      .update(data.path, options.file, {
        metadata: options.metadata,
      })
  }

  // Get file info
  const { data: fileData } = await supabase.storage
    .from(options.bucket)
    .list(data.path.split('/').slice(0, -1).join('/'), {
      limit: 1,
      search: data.path.split('/').pop() || '',
    })

  return fileData?.[0] as StorageFile
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(bucket: string, path: string): string {
  const supabase = createClient()
  if (!supabase) {
    throw new Error('Supabase client not available')
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Get signed URL for private file (server-side)
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = await createServerClient()

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error) throw error
  return data.signedUrl
}

/**
 * Delete file from storage
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  const supabase = createClient()
  if (!supabase) {
    throw new Error('Supabase client not available')
  }

  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
}

/**
 * List files in a bucket
 */
export async function listFiles(
  bucket: string,
  folder?: string,
  limit: number = 100
): Promise<StorageFile[]> {
  const supabase = createClient()
  if (!supabase) {
    throw new Error('Supabase client not available')
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder, {
      limit,
      sortBy: { column: 'created_at', order: 'desc' },
    })

  if (error) throw error
  return data as StorageFile[]
}

/**
 * Upload avatar image with automatic resizing
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const path = `${userId}/${Date.now()}-${file.name}`
  
  // Resize image if needed (client-side or use Supabase image transformations)
  const resizedFile = await resizeImage(file, 400, 400)
  
  await uploadFile({
    bucket: 'avatars',
    path,
    file: resizedFile,
    contentType: 'image/jpeg',
    metadata: {
      userId,
      uploadedAt: new Date().toISOString(),
    },
  })

  return getPublicUrl('avatars', path)
}

/**
 * Upload species image
 */
export async function uploadSpeciesImage(speciesId: string, file: File): Promise<string> {
  const path = `${speciesId}/${Date.now()}-${file.name}`
  
  await uploadFile({
    bucket: 'species-images',
    path,
    file,
    contentType: file.type,
    metadata: {
      speciesId,
      uploadedAt: new Date().toISOString(),
    },
  })

  return getPublicUrl('species-images', path)
}

/**
 * Upload firmware file
 */
export async function uploadFirmware(deviceId: string, file: File): Promise<string> {
  const path = `${deviceId}/${Date.now()}-${file.name}`
  
  await uploadFile({
    bucket: 'firmware',
    path,
    file,
    contentType: 'application/octet-stream',
    metadata: {
      deviceId,
      version: extractVersion(file.name),
      uploadedAt: new Date().toISOString(),
    },
  })

  return getPublicUrl('firmware', path)
}

/**
 * Helper: Resize image (client-side)
 */
async function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Canvas context not available'))
      return
    }

    img.onload = () => {
      let width = img.width
      let height = img.height

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
      }

      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to resize image'))
        }
      }, 'image/jpeg', 0.9)
    }

    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Helper: Extract version from filename
 */
function extractVersion(filename: string): string {
  const match = filename.match(/v?(\d+\.\d+\.\d+)/)
  return match ? match[1] : 'unknown'
}
