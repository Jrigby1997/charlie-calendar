'use client'

import { useState } from 'react'

async function sha256(text: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

type AdminPinModalProps = {
  isOpen: boolean
  storedHash: string
  onSuccess: () => void
  onClose: () => void
}

export default function AdminPinModal({ isOpen, storedHash, onSuccess, onClose }: AdminPinModalProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleUnlock() {
    if (pin.length < 1) return
    setLoading(true)
    setError('')
    const hash = await sha256(pin)
    if (hash === storedHash) {
      setPin('')
      setError('')
      onSuccess()
    } else {
      setError('Incorrect PIN')
    }
    setLoading(false)
  }

  function handleClose() {
    setPin('')
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl max-w-xs w-full shadow-2xl p-8">
        <h3 className="text-xl font-bold text-white text-center mb-2">🔒 Admin PIN Required</h3>
        <p className="text-white/60 text-sm text-center mb-6">
          Enter your 4-digit PIN to access Settings
        </p>

        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={pin}
          onChange={e => {
            setPin(e.target.value.replace(/\D/g, '').slice(0, 4))
            setError('')
          }}
          onKeyDown={e => e.key === 'Enter' && handleUnlock()}
          placeholder="••••"
          autoFocus
          className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white text-center text-2xl tracking-[0.5em] placeholder-white/30 focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20 mb-2"
        />

        {error && (
          <p className="text-red-300 text-sm text-center mb-1">{error}</p>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-sm font-medium transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleUnlock}
            disabled={loading || pin.length < 1}
            className="flex-1 px-4 py-2.5 bg-purple-500/30 hover:bg-purple-500/50 border border-purple-500/40 rounded-xl text-white text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Checking…' : 'Unlock'}
          </button>
        </div>
      </div>
    </div>
  )
}
