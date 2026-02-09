'use client'

import { supabase } from '@/lib/supabase'

export async function uploadAvatar(file: File, userId: string, memberId: number): Promise<string | null> {
  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image')
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB')
    }

    // Create a unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/member_${memberId}_${Date.now()}.${fileExt}`

    console.log('Uploading file:', { fileName, fileSize: file.size, fileType: file.type })

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        upsert: false,
        contentType: file.type,
      })

    if (error) {
      console.error('Upload error:', error)
      throw new Error(`Upload failed: ${error.message}`)
    }

    console.log('Upload successful:', data)

    // Get public URL
    const { data: publicData } = supabase.storage
      .from('avatars')
      .getPublicUrl(data.path)

    console.log('Public URL:', publicData.publicUrl)
    return publicData.publicUrl
  } catch (error) {
    console.error('Error uploading avatar:', error)
    throw error
  }
}

export async function deleteAvatar(avatarUrl: string): Promise<void> {
  try {
    // Extract the file path from the public URL
    const urlParts = avatarUrl.split('/storage/v1/object/public/avatars/')
    if (urlParts.length !== 2) {
      throw new Error('Invalid avatar URL')
    }

    const filePath = decodeURIComponent(urlParts[1])

    // Delete the file
    const { error } = await supabase.storage
      .from('avatars')
      .remove([filePath])

    if (error) {
      throw error
    }
  } catch (error) {
    console.error('Error deleting avatar:', error)
    throw error
  }
}

export async function replaceAvatar(
  file: File,
  userId: string,
  memberId: number,
  oldAvatarUrl: string | null
): Promise<string | null> {
  try {
    // Delete old avatar if it exists and is a custom upload
    if (oldAvatarUrl && !oldAvatarUrl.includes('dicebear')) {
      await deleteAvatar(oldAvatarUrl)
    }

    // Upload new avatar
    return await uploadAvatar(file, userId, memberId)
  } catch (error) {
    console.error('Error replacing avatar:', error)
    throw error
  }
}
