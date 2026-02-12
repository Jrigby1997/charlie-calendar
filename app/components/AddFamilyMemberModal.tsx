'use client'

import { useState, useEffect } from 'react'
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
  const [selectedAvatar, setSelectedAvatar] = useState('avatar_1.svg')
  const [isLoading, setIsLoading] = useState(false)
  const [availableAvatars, setAvailableAvatars] = useState<string[]>([])

  const isEditMode = !!editMember

  // Load available avatars from the avatars directory
  useEffect(() => {
    function loadAvatars() {
      const avatars: string[] = []
      const promises: Promise<void>[] = []

      // Check for avatars 1-20 (reasonable limit to avoid too many requests)
      for (let i = 1; i <= 20; i++) {
        for (const ext of ['svg', 'png', 'jpg', 'jpeg', 'gif', 'webp']) {
          const filename = `avatar_${i}.${ext}`

          const promise = new Promise<void>((resolve) => {
            const img = new Image()
            img.onload = () => {
              // Check if we already have an avatar for this number
              const base = `avatar_${i}`
              if (!avatars.find(a => a.startsWith(base))) {
                avatars.push(filename)
              }
              resolve()
            }
            img.onerror = () => {
              resolve() // Resolve anyway, just don't add the avatar
            }
            img.src = `/avatars/${filename}`
          })

          promises.push(promise)
        }
      }

      // Wait for all image loading attempts to complete
      Promise.all(promises).then(() => {
        // Sort avatars by number
        avatars.sort((a, b) => {
          const aNum = parseInt(a.match(/avatar_(\d+)/)?.[1] || '0')
          const bNum = parseInt(b.match(/avatar_(\d+)/)?.[1] || '0')
          return aNum - bNum
        })
        setAvailableAvatars(avatars)
      })
    }

    loadAvatars()
  }, [])

  // Pre-fill form when editing, reset when adding
  useEffect(() => {
    if (isOpen && editMember) {
      setName(editMember.name)
      setColor(editMember.color)
      setRole(editMember.role || '')
      // Set selected avatar from stored URL
      setSelectedAvatar(editMember.avatar_url || 'avatar_1.svg')
    } else if (!isOpen) {
      setName('')
      setColor('#3B82F6')
      setRole('')
      setSelectedAvatar('avatar_1.svg')
    }
  }, [isOpen, editMember])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) {
      alert('You must be logged in to add a family member')
      return
    }

    try {
      setIsLoading(true)

      if (isEditMode && editMember && onUpdateMember) {
        onUpdateMember(editMember.id, name, color, role, selectedAvatar)
      } else {
        onAddMember(name, color, role, selectedAvatar)
      }
      onClose()
    } catch (error) {
      console.error('Error saving family member:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save family member'
      alert(`Error: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl max-w-2xl w-full border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.3)] my-8">
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
            <label className="block text-sm font-medium text-white/90 mb-3">
              Avatar *
            </label>
            <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto p-2 bg-white/5 rounded-xl border border-white/20">
              {availableAvatars.map((avatarFile, i) => {
                const isSelected = selectedAvatar === avatarFile
                return (
                  <button
                    key={avatarFile}
                    type="button"
                    onClick={() => setSelectedAvatar(avatarFile)}
                    className={`w-12 h-12 rounded-lg overflow-hidden transition-all duration-200 flex-shrink-0 ${
                      isSelected
                        ? 'ring-2 ring-white scale-110 shadow-lg'
                        : 'hover:shadow-md opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={`/avatars/${avatarFile}`}
                      alt={avatarFile}
                      className="w-full h-full object-cover"
                      style={{
                        // Remove white/light backgrounds from JPEG avatars
                        filter: avatarFile.endsWith('.jpg') || avatarFile.endsWith('.jpeg')
                          ? 'contrast(1.1) brightness(1.1)'
                          : 'none',
                        mixBlendMode: avatarFile.endsWith('.jpg') || avatarFile.endsWith('.jpeg')
                          ? 'multiply'
                          : 'normal'
                      }}
                      onError={(e) => {
                        // Hide broken images
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </button>
                )
              })}
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
