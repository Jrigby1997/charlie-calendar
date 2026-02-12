'use client'

import { useState, useEffect } from 'react'

type FamilyMember = {
  id: number
  name: string
  color: string
  role: string | null
  avatar_url?: string | null
}

type Reward = {
  id?: number
  title: string
  description: string
  cost: number
  reward_type: 'reusable' | 'one_off'
  assigned_member_ids: number[]
}

type AddRewardModalProps = {
  isOpen: boolean
  onClose: () => void
  onAddReward: (title: string, description: string, cost: number, rewardType: 'reusable' | 'one_off', assignedMemberIds: number[]) => void
  onUpdateReward?: (id: number, title: string, description: string, cost: number, rewardType: 'reusable' | 'one_off', assignedMemberIds: number[]) => void
  onDeleteReward?: (id: number) => void
  editReward?: Reward | null
  familyMembers: FamilyMember[]
}

export default function AddRewardModal({
  isOpen,
  onClose,
  onAddReward,
  onUpdateReward,
  onDeleteReward,
  editReward,
  familyMembers,
}: AddRewardModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [cost, setCost] = useState(5)
  const [rewardType, setRewardType] = useState<'reusable' | 'one_off'>('reusable')
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const isEditMode = !!editReward?.id

  useEffect(() => {
    if (isOpen && editReward) {
      setTitle(editReward.title)
      setDescription(editReward.description || '')
      setCost(editReward.cost)
      setRewardType(editReward.reward_type)
      setSelectedMemberIds(editReward.assigned_member_ids || [])
    } else if (!isOpen) {
      setTitle('')
      setDescription('')
      setCost(5)
      setRewardType('reusable')
      setSelectedMemberIds([])
    }
  }, [isOpen, editReward])

  function toggleMember(memberId: number) {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    try {
      setIsLoading(true)
      if (isEditMode && editReward?.id && onUpdateReward) {
        onUpdateReward(editReward.id, title.trim(), description.trim(), cost, rewardType, selectedMemberIds)
      } else {
        onAddReward(title.trim(), description.trim(), cost, rewardType, selectedMemberIds)
      }
      onClose()
    } catch (error) {
      console.error('Error saving reward:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleDelete() {
    if (editReward?.id && onDeleteReward) {
      if (confirm('Are you sure you want to delete this reward?')) {
        onDeleteReward(editReward.id)
        onClose()
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/15 backdrop-blur-2xl border border-white/25 rounded-3xl w-full max-w-lg p-8 shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-6">
          {isEditMode ? 'Edit Reward' : 'Add Reward'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-1">
              Reward Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
              placeholder="e.g. Movie night, Extra screen time, Date night with Dad..."
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-1">
              Description <span className="text-white/60">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40 resize-none"
              placeholder="Any extra details..."
              rows={2}
            />
          </div>

          {/* Reward Type */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Reward Type *
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRewardType('reusable')}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-200 border ${
                  rewardType === 'reusable'
                    ? 'bg-purple-500/40 border-purple-400/60 text-white shadow-lg'
                    : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="text-lg mb-0.5">🔄</div>
                <div className="text-sm font-semibold">Reusable</div>
                <div className="text-xs text-white/60">Can redeem again</div>
              </button>
              <button
                type="button"
                onClick={() => setRewardType('one_off')}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-200 border ${
                  rewardType === 'one_off'
                    ? 'bg-amber-500/40 border-amber-400/60 text-white shadow-lg'
                    : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="text-lg mb-0.5">🎁</div>
                <div className="text-sm font-semibold">One-Time</div>
                <div className="text-xs text-white/60">Gone once redeemed</div>
              </button>
            </div>
          </div>

          {/* Cost */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-1">
              Cost ⭐
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={100}
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                className="flex-1 accent-yellow-400"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={9999}
                  value={cost}
                  onChange={(e) => setCost(Math.max(1, Number(e.target.value)))}
                  className="w-20 px-3 py-2 bg-yellow-500/30 border border-yellow-400/50 rounded-xl text-white font-bold text-center"
                />
                <span className="text-yellow-400 text-lg">⭐</span>
              </div>
            </div>
          </div>

          {/* Assign to Family Members */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Available To *
            </label>
            {familyMembers.length === 0 ? (
              <p className="text-white/50 text-sm">No family members yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {familyMembers.map((member) => {
                  const isSelected = selectedMemberIds.includes(member.id)
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleMember(member.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 border ${
                        isSelected
                          ? 'shadow-lg scale-105'
                          : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                      }`}
                      style={
                        isSelected
                          ? { background: `${member.color}40`, borderColor: `${member.color}80` }
                          : undefined
                      }
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden border-2"
                        style={{
                          backgroundColor: member.color,
                          borderColor: isSelected ? 'white' : `${member.color}60`,
                        }}
                      >
                        {member.avatar_url ? (
                          <img src={`/avatars/${member.avatar_url}`} alt={member.name} className="w-full h-full" />
                        ) : (
                          <span className="text-white text-xs font-bold">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className={`text-sm font-medium ${isSelected ? 'text-white' : ''}`}>
                        {member.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-200 border border-white/20"
            >
              Cancel
            </button>
            {isEditMode && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2.5 bg-red-500/20 hover:bg-red-500/40 text-red-200 rounded-xl transition-all duration-200 border border-red-400/30"
              >
                Delete
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || !title.trim() || selectedMemberIds.length === 0}
              className="flex-1 px-4 py-2.5 bg-white/25 hover:bg-white/35 text-white font-semibold rounded-xl transition-all duration-200 border border-white/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : isEditMode ? 'Update Reward' : 'Add Reward'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
