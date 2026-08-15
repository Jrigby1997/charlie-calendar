'use client'

import { useState } from 'react'
import GlassButton from './ui/GlassButton'

export interface SpecialDay {
  id: number
  user_id: string
  title: string
  date: string // ISO date: YYYY-MM-DD
  emoji: string
  color: string | null
  is_recurring: boolean
  /** Optional direct image URL (a hotlinkable link — we store the URL, not the image bytes). */
  image_url?: string | null
  created_at?: string
}

interface AddSpecialDayModalProps {
  onClose: () => void
  onSave: (data: Omit<SpecialDay, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  editingDay?: SpecialDay | null
}

const EMOJI_OPTIONS = [
  '⭐','🎂','🎉','🎊','❤️','💕','🥂','🎁','🌸','🌺',
  '🍰','🎈','🦋','🌟','✨','🎶','🏆','🥇','🌈','⚡',
  '🦄','🐣','🍀','🌙','☀️','🎠','🎡','🎪','🎭','🎗️',
]

const COLOR_OPTIONS = [
  { label: 'Rose',    value: 'rose',    cls: 'bg-rose-400' },
  { label: 'Pink',    value: 'pink',    cls: 'bg-pink-400' },
  { label: 'Purple',  value: 'purple',  cls: 'bg-purple-400' },
  { label: 'Blue',    value: 'blue',    cls: 'bg-blue-400' },
  { label: 'Cyan',    value: 'cyan',    cls: 'bg-cyan-400' },
  { label: 'Green',   value: 'green',   cls: 'bg-green-400' },
  { label: 'Yellow',  value: 'yellow',  cls: 'bg-yellow-400' },
  { label: 'Orange',  value: 'orange',  cls: 'bg-orange-400' },
  { label: 'Red',     value: 'red',     cls: 'bg-red-400' },
  { label: 'None',    value: '',        cls: 'bg-white/20' },
]

export default function AddSpecialDayModal({ onClose, onSave, editingDay }: AddSpecialDayModalProps) {
  const [title, setTitle] = useState(editingDay?.title ?? '')
  const [date, setDate] = useState(editingDay?.date ?? '')
  const [emoji, setEmoji] = useState(editingDay?.emoji ?? '⭐')
  const [color, setColor] = useState(editingDay?.color ?? '')
  const [isRecurring, setIsRecurring] = useState(editingDay?.is_recurring ?? false)
  const [imageUrl, setImageUrl] = useState(editingDay?.image_url ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return }
    if (!date) { setError('Date is required'); return }
    setSaving(true)
    setError('')
    try {
      await onSave({ title: title.trim(), date, emoji, color: color || null, is_recurring: isRecurring, image_url: imageUrl.trim() || null })
      onClose()
    } catch (e) {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-5">
          {editingDay ? 'Edit Special Day' : '⭐ Add Special Day'}
        </h2>

        {/* Title */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-white/70 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Mom's Birthday, Anniversary…"
            className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/40"
          />
        </div>

        {/* Date */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-white/70 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40 [color-scheme:dark]"
          />
        </div>

        {/* Emoji Picker */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-white/70 mb-2">Emoji</label>
          <div className="grid grid-cols-10 gap-1">
            {EMOJI_OPTIONS.map(e => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`text-xl p-1 rounded-lg transition-all ${emoji === e ? 'bg-white/30 ring-2 ring-white/60 scale-110' : 'hover:bg-white/15'}`}
              >
                {e}
              </button>
            ))}
          </div>
          <p className="text-white/50 text-xs mt-1">Selected: {emoji}</p>
        </div>

        {/* Color */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-white/70 mb-2">Color</label>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map(c => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                title={c.label}
                className={`w-7 h-7 rounded-full ${c.cls} transition-all ${color === c.value ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
              />
            ))}
          </div>
        </div>

        {/* Recurring */}
        <div className="mb-5 flex items-center gap-3">
          <button
            onClick={() => setIsRecurring(!isRecurring)}
            className={`relative inline-flex items-center w-10 h-6 rounded-full transition-colors ${isRecurring ? 'bg-blue-500' : 'bg-white/20'}`}
          >
            <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform ${isRecurring ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
          <span className="text-white/80 text-sm">Repeat yearly</span>
        </div>

        {/* Optional photo (direct image URL) */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-white/70 mb-1">Photo URL <span className="text-white/40 font-normal">(optional)</span></label>
          <input
            type="url"
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            placeholder="https://…/photo.jpg"
            className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/40"
          />
          <p className="text-white/40 text-xs mt-1">Paste a direct image link. Shown instead of the emoji on the countdown. (Google Photos share links won&apos;t work — use a direct .jpg/.png URL.)</p>
          {imageUrl.trim() && (
            <img src={imageUrl} alt="" className="mt-2 w-14 h-14 rounded-full object-cover border border-white/20" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
          )}
        </div>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <div className="flex gap-3 justify-end">
          <GlassButton variant="default" size="md" onClick={onClose}>Cancel</GlassButton>
          <GlassButton variant="blue" size="md" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </GlassButton>
        </div>
      </div>
    </div>
  )
}
