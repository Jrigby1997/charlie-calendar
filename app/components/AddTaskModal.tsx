'use client'

import { useState, useEffect } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type FamilyMember = {
  id: number
  name: string
  color: string
  role: string | null
  avatar_url?: string | null
}

type CurrencyReward = {
  currency_type: 'stars' | 'muscles' | 'heart' | 'game_points' | 'trophy'
  amount: number
  enabled: boolean
}

type Task = {
  id?: number
  title: string
  description: string
  task_type: 'daily' | 'one_off'
  assigned_member_ids: number[]
  // Multi-currency
  currency_rewards?: { currency_type: string; amount: number }[]
  // Grouped sub-items
  sub_items?: string[]
  group_reset_frequency?: 'daily' | 'weekly' | 'monthly' | 'never'
  // Rotation
  is_rotating?: boolean
  rotation_mode?: 'completion' | 'date'
  rotation_members?: number[]
  rotation_days_interval?: number
}

type AddTaskModalProps = {
  isOpen: boolean
  onClose: () => void
  onAddTask: (
    title: string,
    description: string,
    taskType: 'daily' | 'one_off',
    currencyRewards: { currency_type: string; amount: number }[],
    assignedMemberIds: number[],
    subItems: string[],
    groupResetFrequency: 'daily' | 'weekly' | 'monthly' | 'never',
    isRotating: boolean,
    rotationMode: 'completion' | 'date',
    rotationMembers: number[],
    rotationDaysInterval: number
  ) => void
  onUpdateTask?: (
    id: number,
    title: string,
    description: string,
    taskType: 'daily' | 'one_off',
    currencyRewards: { currency_type: string; amount: number }[],
    assignedMemberIds: number[],
    subItems: string[],
    groupResetFrequency: 'daily' | 'weekly' | 'monthly' | 'never',
    isRotating: boolean,
    rotationMode: 'completion' | 'date',
    rotationMembers: number[],
    rotationDaysInterval: number
  ) => void
  onDeleteTask?: (id: number) => void
  editTask?: Task | null
  familyMembers: FamilyMember[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CURRENCY_META: Record<string, { icon: string; label: string }> = {
  stars:       { icon: '⭐', label: 'Stars'       },
  muscles:     { icon: '💪', label: 'Muscles'     },
  heart:       { icon: '❤️',  label: 'Hearts'      },
  game_points: { icon: '🎮', label: 'Game Points' },
  trophy:      { icon: '🏆', label: 'Trophies'    },
}

const DEFAULT_CURRENCY_REWARDS: CurrencyReward[] = [
  { currency_type: 'stars',       amount: 1, enabled: true  },
  { currency_type: 'muscles',     amount: 1, enabled: false },
  { currency_type: 'heart',       amount: 1, enabled: false },
  { currency_type: 'game_points', amount: 1, enabled: false },
  { currency_type: 'trophy',      amount: 1, enabled: false },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function AddTaskModal({
  isOpen,
  onClose,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  editTask,
  familyMembers,
}: AddTaskModalProps) {
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [taskType, setTaskType]       = useState<'daily' | 'one_off'>('daily')
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([])
  const [isLoading, setIsLoading]     = useState(false)

  // Multi-currency rewards
  const [currencyRewards, setCurrencyRewards] = useState<CurrencyReward[]>(DEFAULT_CURRENCY_REWARDS)

  // Sub-items (grouped checklist tasks)
  const [subItemInputs, setSubItemInputs] = useState<string[]>([])
  const [groupResetFreq, setGroupResetFreq] = useState<'daily' | 'weekly' | 'monthly' | 'never'>('daily')

  // Rotation
  const [isRotating, setIsRotating]               = useState(false)
  const [rotationMode, setRotationMode]           = useState<'completion' | 'date'>('completion')
  const [rotationMemberIds, setRotationMemberIds] = useState<number[]>([])
  const [rotationDays, setRotationDays]           = useState(7)

  const isEditMode = !!editTask?.id

  // ── Pre-fill when editing ──────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen && editTask) {
      setTitle(editTask.title)
      setDescription(editTask.description || '')
      setTaskType(editTask.task_type)
      setSelectedMemberIds(editTask.assigned_member_ids || [])

      // Currency rewards
      if (editTask.currency_rewards && editTask.currency_rewards.length > 0) {
        const filled = DEFAULT_CURRENCY_REWARDS.map((def) => {
          const match = editTask.currency_rewards!.find((r) => r.currency_type === def.currency_type)
          return match ? { ...def, amount: match.amount, enabled: true } : def
        })
        setCurrencyRewards(filled)
      } else {
        setCurrencyRewards(DEFAULT_CURRENCY_REWARDS)
      }

      // Sub-items
      setSubItemInputs(editTask.sub_items || [])
      setGroupResetFreq(editTask.group_reset_frequency || 'daily')

      // Rotation
      setIsRotating(editTask.is_rotating || false)
      setRotationMode(editTask.rotation_mode || 'completion')
      setRotationMemberIds(editTask.rotation_members || [])
      setRotationDays(editTask.rotation_days_interval || 7)
    } else if (!isOpen) {
      setTitle('')
      setDescription('')
      setTaskType('daily')
      setSelectedMemberIds([])
      setCurrencyRewards(DEFAULT_CURRENCY_REWARDS)
      setSubItemInputs([])
      setGroupResetFreq('daily')
      setIsRotating(false)
      setRotationMode('completion')
      setRotationMemberIds([])
      setRotationDays(7)
    }
  }, [isOpen, editTask])

  // ── Member selection ───────────────────────────────────────────────────────

  function toggleMember(memberId: number) {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    )
  }

  // ── Currency rewards ──────────────────────────────────────────────────────

  function toggleCurrency(type: string) {
    setCurrencyRewards((prev) =>
      prev.map((r) =>
        r.currency_type === type ? { ...r, enabled: !r.enabled, amount: r.enabled ? r.amount : 1 } : r
      )
    )
  }

  function setCurrencyAmount(type: string, amount: number) {
    setCurrencyRewards((prev) =>
      prev.map((r) =>
        r.currency_type === type ? { ...r, amount: Math.max(1, Math.min(999, amount)) } : r
      )
    )
  }

  // ── Sub-items ─────────────────────────────────────────────────────────────

  function addSubItem() {
    setSubItemInputs((prev) => [...prev, ''])
  }

  function updateSubItem(idx: number, value: string) {
    setSubItemInputs((prev) => prev.map((v, i) => (i === idx ? value : v)))
  }

  function removeSubItem(idx: number) {
    setSubItemInputs((prev) => prev.filter((_, i) => i !== idx))
  }

  // ── Rotation members ──────────────────────────────────────────────────────

  function toggleRotationMember(memberId: number) {
    setRotationMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    )
  }

  function moveRotationMember(idx: number, dir: -1 | 1) {
    setRotationMemberIds((prev) => {
      const arr = [...prev]
      const target = idx + dir
      if (target < 0 || target >= arr.length) return prev
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return arr
    })
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    const activeCurrencies = currencyRewards
      .filter((r) => r.enabled)
      .map(({ currency_type, amount }) => ({ currency_type, amount }))

    const cleanSubItems = subItemInputs.filter((s) => s.trim() !== '')
    const rotMembers = isRotating ? rotationMemberIds : selectedMemberIds

    try {
      setIsLoading(true)
      if (isEditMode && editTask?.id && onUpdateTask) {
        onUpdateTask(
          editTask.id,
          title.trim(),
          description.trim(),
          taskType,
          activeCurrencies,
          selectedMemberIds,
          cleanSubItems,
          groupResetFreq,
          isRotating,
          rotationMode,
          rotMembers,
          rotationDays
        )
      } else {
        onAddTask(
          title.trim(),
          description.trim(),
          taskType,
          activeCurrencies,
          selectedMemberIds,
          cleanSubItems,
          groupResetFreq,
          isRotating,
          rotationMode,
          rotMembers,
          rotationDays
        )
      }
      onClose()
    } catch (err) {
      console.error('Error saving task:', err)
    } finally {
      setIsLoading(false)
    }
  }

  function handleDelete() {
    if (editTask?.id && onDeleteTask && confirm('Are you sure you want to delete this task?')) {
      onDeleteTask(editTask.id)
      onClose()
    }
  }

  if (!isOpen) return null

  const canSubmit =
    title.trim().length > 0 &&
    (isRotating ? rotationMemberIds.length > 0 : selectedMemberIds.length > 0)

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/15 backdrop-blur-2xl border border-white/25 rounded-3xl w-full max-w-lg p-8 shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-6">
          {isEditMode ? 'Edit Task' : 'Add Task'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* ── Title ─────────────────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
              placeholder="e.g. Make bed, Take out trash..."
              required
              autoFocus
            />
          </div>

          {/* ── Description ───────────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-1">
              Description <span className="text-white/60">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm resize-none"
              placeholder="Any extra details..."
              rows={2}
            />
          </div>

          {/* ── Task Type ─────────────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">Task Type *</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTaskType('daily')}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-200 border ${
                  taskType === 'daily'
                    ? 'bg-blue-500/40 border-blue-400/60 text-white shadow-lg'
                    : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="text-lg mb-0.5">🔄</div>
                <div className="text-sm font-semibold">Daily</div>
                <div className="text-xs text-white/60">Resets every day</div>
              </button>
              <button
                type="button"
                onClick={() => setTaskType('one_off')}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-200 border ${
                  taskType === 'one_off'
                    ? 'bg-amber-500/40 border-amber-400/60 text-white shadow-lg'
                    : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="text-lg mb-0.5">📌</div>
                <div className="text-sm font-semibold">One-Off</div>
                <div className="text-xs text-white/60">Until completed</div>
              </button>
            </div>
          </div>

          {/* ── Currency Rewards ──────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Rewards earned on completion
            </label>
            <div className="flex flex-col gap-2">
              {currencyRewards.map((reward) => {
                const meta = CURRENCY_META[reward.currency_type]
                return (
                  <div
                    key={reward.currency_type}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all duration-200 ${
                      reward.enabled
                        ? 'bg-white/10 border-white/30'
                        : 'bg-white/3 border-white/10 opacity-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleCurrency(reward.currency_type)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        reward.enabled ? 'bg-white/30 border-white/60' : 'bg-transparent border-white/30'
                      }`}
                    >
                      {reward.enabled && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className="text-lg flex-shrink-0">{meta.icon}</span>
                    <span className="text-sm text-white/80 font-medium flex-1">{meta.label}</span>
                    {reward.enabled && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setCurrencyAmount(reward.currency_type, reward.amount - 1)}
                          className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
                        >−</button>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={reward.amount}
                          onChange={(e) => setCurrencyAmount(reward.currency_type, Number(e.target.value))}
                          className="w-12 text-center bg-white/10 border border-white/20 rounded-lg text-white text-sm font-bold py-0.5"
                        />
                        <button
                          type="button"
                          onClick={() => setCurrencyAmount(reward.currency_type, reward.amount + 1)}
                          className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
                        >+</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Sub-items (Grouped checklist) ─────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-white/90">
                Checklist steps <span className="text-white/50">(optional)</span>
              </label>
              <button
                type="button"
                onClick={addSubItem}
                className="text-xs px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-all"
              >
                + Add step
              </button>
            </div>

            {subItemInputs.length > 0 ? (
              <div className="flex flex-col gap-1.5 mb-3">
                {subItemInputs.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-white/40 text-xs w-4 text-right flex-shrink-0">{idx + 1}.</span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateSubItem(idx, e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-white/40 focus:ring-1 focus:ring-white/40"
                      placeholder="Step description..."
                    />
                    <button
                      type="button"
                      onClick={() => removeSubItem(idx)}
                      className="w-6 h-6 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 text-xs flex-shrink-0 flex items-center justify-center"
                    >×</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/35 text-xs mb-2">
                Add checklist steps — all must be checked before the task can be marked complete.
              </p>
            )}

            {subItemInputs.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">Checklist resets</label>
                <div className="flex gap-1.5 flex-wrap">
                  {(['daily', 'weekly', 'monthly', 'never'] as const).map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setGroupResetFreq(freq)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
                        groupResetFreq === freq
                          ? 'bg-blue-500/40 border-blue-400/60 text-white'
                          : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Assign to Members ────────────────────────────────────────── */}
          {!isRotating && (
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Assign To *</label>
              {familyMembers.length === 0 ? (
                <p className="text-white/50 text-sm">No family members yet. Add members first.</p>
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
                          isSelected ? 'shadow-lg scale-105' : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                        }`}
                        style={isSelected ? { background: `${member.color}40`, borderColor: `${member.color}80` } : undefined}
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden border-2"
                          style={{ backgroundColor: member.color, borderColor: isSelected ? 'white' : `${member.color}60` }}
                        >
                          {member.avatar_url ? (
                            <img src={`/avatars/${member.avatar_url}`} alt={member.name} className="w-full h-full" />
                          ) : (
                            <span className="text-white text-xs font-bold">{member.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <span className={`text-sm font-medium ${isSelected ? 'text-white' : ''}`}>{member.name}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Rotation ─────────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-white/90">Rotating Task</label>
              <button
                type="button"
                onClick={() => setIsRotating((r) => !r)}
                className={`relative w-10 h-5 rounded-full transition-colors duration-200 border ${
                  isRotating ? 'bg-indigo-500/60 border-indigo-400/60' : 'bg-white/10 border-white/20'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                    isRotating ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>

            {isRotating && (
              <div className="bg-white/5 border border-white/15 rounded-xl p-3 flex flex-col gap-3">
                <p className="text-white/60 text-xs">
                  Task rotates to the next person in the list when completed (or on a schedule).
                </p>

                <div>
                  <label className="text-xs font-medium text-white/70 mb-1.5 block">Rotation order</label>
                  {familyMembers.length === 0 ? (
                    <p className="text-white/40 text-xs">No family members yet.</p>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {familyMembers.map((member) => {
                          const inRotation = rotationMemberIds.includes(member.id)
                          return (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => toggleRotationMember(member.id)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-all border ${
                                inRotation ? 'shadow-md scale-105' : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10'
                              }`}
                              style={inRotation ? { background: `${member.color}40`, borderColor: `${member.color}80` } : undefined}
                            >
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center overflow-hidden text-[10px] font-bold text-white"
                                style={{ backgroundColor: member.color }}
                              >
                                {member.avatar_url ? (
                                  <img src={`/avatars/${member.avatar_url}`} alt={member.name} className="w-full h-full" />
                                ) : (
                                  member.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <span className={`font-medium ${inRotation ? 'text-white' : ''}`}>{member.name}</span>
                              {inRotation && (
                                <span className="text-white/50 text-[10px]">
                                  #{rotationMemberIds.indexOf(member.id) + 1}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>

                      {rotationMemberIds.length > 1 && (
                        <div className="flex flex-col gap-1">
                          {rotationMemberIds.map((memberId, idx) => {
                            const member = familyMembers.find((m) => m.id === memberId)
                            if (!member) return null
                            return (
                              <div key={memberId} className="flex items-center gap-2 text-xs">
                                <span className="text-white/40 w-4 text-right">{idx + 1}.</span>
                                <span className="text-white/80 flex-1">{member.name}</span>
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => moveRotationMember(idx, -1)}
                                  className="px-1.5 py-0.5 bg-white/10 rounded disabled:opacity-30"
                                >↑</button>
                                <button
                                  type="button"
                                  disabled={idx === rotationMemberIds.length - 1}
                                  onClick={() => moveRotationMember(idx, 1)}
                                  className="px-1.5 py-0.5 bg-white/10 rounded disabled:opacity-30"
                                >↓</button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-white/70 mb-1.5 block">Rotate when</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRotationMode('completion')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                        rotationMode === 'completion'
                          ? 'bg-indigo-500/40 border-indigo-400/60 text-white'
                          : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10'
                      }`}
                    >✅ On completion</button>
                    <button
                      type="button"
                      onClick={() => setRotationMode('date')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                        rotationMode === 'date'
                          ? 'bg-indigo-500/40 border-indigo-400/60 text-white'
                          : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10'
                      }`}
                    >📅 Every N days</button>
                  </div>
                  {rotationMode === 'date' && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-white/60 text-xs">Rotate every</span>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={rotationDays}
                        onChange={(e) => setRotationDays(Math.max(1, Number(e.target.value)))}
                        className="w-14 text-center bg-white/10 border border-white/20 rounded-lg text-white text-sm font-bold py-1"
                      />
                      <span className="text-white/60 text-xs">days</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Action Buttons ─────────────────────────────────────────────── */}
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
                className="px-4 py-2.5 bg-red-500/30 hover:bg-red-500/50 text-white rounded-xl transition-all duration-200 border border-red-400/40"
              >
                Delete
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || !canSubmit}
              className="flex-1 px-4 py-2.5 bg-white/25 hover:bg-white/35 text-white font-semibold rounded-xl transition-all duration-200 border border-white/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : isEditMode ? 'Update Task' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
