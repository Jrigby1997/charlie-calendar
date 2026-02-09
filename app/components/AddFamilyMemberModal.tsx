'use client'

import { useState, useEffect } from 'react'
import { uploadAvatar, replaceAvatar } from '@/app/lib/avatarUtils'
import { useAuth } from '@/app/contexts/AuthContext'

type FamilyMember = {
  id: number
  name: string
  color: string
  role: string | null
  avatar_url: string | null
}

type AddFamilyMemberModalProps = {
  isOpen: boolean
  onClose: () => void
  onAddMember: (name: string, color: string, role: string, avatarStyle: string) => void
  onUpdateMember?: (id: number, name: string, color: string, role: string, avatarStyle: string) => void
  editMember?: FamilyMember | null
}

export default function AddFamilyMemberModal({ isOpen, onClose, onAddMember, onUpdateMember, editMember }: AddFamilyMemberModalProps) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3B82F6')
  const [role, setRole] = useState('')
  const [avatarStyle, setAvatarStyle] = useState('adventurer')
  const [customAvatarFile, setCustomAvatarFile] = useState<File | null>(null)
  const [customAvatarPreview, setCustomAvatarPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const isEditMode = !!editMember

  // Pre-fill form when editing, reset when adding
  useEffect(() => {
    if (isOpen && editMember) {
      setName(editMember.name)
      setColor(editMember.color)
      setRole(editMember.role || '')
      setAvatarStyle(editMember.avatar_url || 'adventurer')
      setCustomAvatarFile(null)
      setCustomAvatarPreview(null)
    } else if (!isOpen) {
      setName('')
      setColor('#3B82F6')
      setRole('')
      setAvatarStyle('adventurer')
      setCustomAvatarFile(null)
      setCustomAvatarPreview(null)
    }
  }, [isOpen, editMember])

  function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setCustomAvatarFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setCustomAvatarPreview(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) {
      alert('You must be logged in to add a family member')
      return
    }

    try {
      setIsLoading(true)
      let finalAvatarUrl: string | null = avatarStyle

      // Handle custom avatar upload if file is selected
      if (customAvatarFile) {
        console.log('Uploading custom avatar for user:', user.id)
        if (isEditMode && editMember) {
          // Replace existing avatar
          finalAvatarUrl = await replaceAvatar(
            customAvatarFile,
            user.id,
            editMember.id,
            editMember.avatar_url
          )
        } else {
          // This is a new member, but we can't upload without an ID yet
          // So we'll pass the file data and let the parent handle it
          // For now, we'll use the dicebear with the name as fallback
          finalAvatarUrl = `dicebear:${avatarStyle}:${name}`
        }
      }

      if (isEditMode && editMember && onUpdateMember) {
        onUpdateMember(editMember.id, name, color, role, finalAvatarUrl || avatarStyle)
      } else {
        onAddMember(name, color, role, finalAvatarUrl || avatarStyle)
      }
      onClose()
    } catch (error) {
      console.error('Error uploading avatar:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload avatar'
      alert(`Failed to upload avatar: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl max-w-md w-full border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.3)]">
        <div className="bg-white/10 backdrop-blur-2xl border-b border-white/20 px-6 py-4 flex justify-between items-center rounded-t-3xl">
          <h2 className="text-2xl font-bold text-white drop-shadow-lg">{isEditMode ? 'Edit Family Member' : 'Add Family Member'}</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl font-bold transition-colors hover:scale-110 transition-transform duration-200"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/90 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
              placeholder="Dad, Mom, Emma..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/90 mb-1">
              Color *
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-12 w-20 border-2 border-white/30 rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-all duration-200 bg-white/10"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
                placeholder="#3B82F6"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/90 mb-1">
              Role <span className="text-white/60">(optional)</span>
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
              placeholder="Dad, Mom, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Avatar *
            </label>
            <div className="space-y-3">
              {/* Custom Avatar Upload - Only for existing members */}
              {isEditMode && (
                <div className="border-2 border-dashed border-white/30 rounded-xl p-4 hover:border-white/50 transition-colors">
                  <label className="flex flex-col items-center cursor-pointer">
                    <svg className="w-6 h-6 text-white/70 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-sm text-white/80">Upload custom image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Preview of custom avatar */}
              {customAvatarPreview && (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/30 shadow-md flex-shrink-0">
                    <img src={customAvatarPreview} alt="Custom" className="w-full h-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomAvatarFile(null)
                      setCustomAvatarPreview(null)
                    }}
                    className="text-sm text-red-300 hover:text-red-200 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Or use generated avatar */}
              {!customAvatarPreview && (
                <div className="space-y-2">
                  {!isEditMode && (
                    <div className="text-xs text-yellow-300/80 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2">
                      💡 Tip: Add the member first, then edit to upload a custom avatar
                    </div>
                  )}
                  <div className="text-xs text-white/60">Choose a style:</div>
                  <select
                    value={avatarStyle}
                    onChange={(e) => setAvatarStyle(e.target.value)}
                    className="w-full px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
                  >
                    <option value="adventurer" className="bg-gray-800">Adventurer (People)</option>
                    <option value="bottts" className="bg-gray-800">Bottts (Robots)</option>
                    <option value="big-ears" className="bg-gray-800">Big Ears (Cute)</option>
                    <option value="pixel-art" className="bg-gray-800">Pixel Art (8-bit)</option>
                    <option value="lorelei" className="bg-gray-800">Lorelei (Illustrated)</option>
                    <option value="fun-emoji" className="bg-gray-800">Fun Emoji</option>
                  </select>
                  {name && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/30 shadow-md flex-shrink-0">
                        <img
                          src={`https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(name)}`}
                          alt="Preview"
                          className="w-full h-full"
                        />
                      </div>
                      <span className="text-xs text-white/60">Preview</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl border border-white/30 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-white/30 backdrop-blur-sm hover:bg-white/40 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl border border-white/30 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Uploading...' : (isEditMode ? 'Update Member' : 'Add Member')}
            </button>
          </div>        </form>
      </div>
    </div>
  )
}
