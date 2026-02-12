'use client'

import { useState, useEffect } from 'react'

type FamilyMember = {
  id: number
  name: string
  color: string
  role: string | null
  avatar_url?: string | null
}

type Task = {
  id?: number
  title: string
  description: string
  task_type: 'daily' | 'one_off'
  points: number
  assigned_member_ids: number[]
}

type AddTaskModalProps = {
  isOpen: boolean
  onClose: () => void
  onAddTask: (title: string, description: string, taskType: 'daily' | 'one_off', points: number, assignedMemberIds: number[]) => void
  onUpdateTask?: (id: number, title: string, description: string, taskType: 'daily' | 'one_off', points: number, assignedMemberIds: number[]) => void
  onDeleteTask?: (id: number) => void
  editTask?: Task | null
  familyMembers: FamilyMember[]
}

export default function AddTaskModal({
  isOpen,
  onClose,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  editTask,
  familyMembers,
}: AddTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [taskType, setTaskType] = useState<'daily' | 'one_off'>('daily')
  const [points, setPoints] = useState(1)
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const isEditMode = !!editTask?.id

  // Pre-fill form when editing
  useEffect(() => {
    if (isOpen && editTask) {
      setTitle(editTask.title)
      setDescription(editTask.description || '')
      setTaskType(editTask.task_type)
      setPoints(editTask.points)
      setSelectedMemberIds(editTask.assigned_member_ids || [])
    } else if (!isOpen) {
      setTitle('')
      setDescription('')
      setTaskType('daily')
      setPoints(1)
      setSelectedMemberIds([])
    }
  }, [isOpen, editTask])

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

      if (isEditMode && editTask?.id && onUpdateTask) {
        onUpdateTask(editTask.id, title.trim(), description.trim(), taskType, points, selectedMemberIds)
      } else {
        onAddTask(title.trim(), description.trim(), taskType, points, selectedMemberIds)
      }
      onClose()
    } catch (error) {
      console.error('Error saving task:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleDelete() {
    if (editTask?.id && onDeleteTask) {
      if (confirm('Are you sure you want to delete this task?')) {
        onDeleteTask(editTask.id)
        onClose()
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/15 backdrop-blur-2xl border border-white/25 rounded-3xl w-full max-w-lg p-8 shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-6">
          {isEditMode ? 'Edit Task' : 'Add Task'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
              placeholder="e.g. Make bed, Take out trash..."
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

          {/* Task Type */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Task Type *
            </label>
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

          {/* Points */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-1">
              Points ⭐
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={20}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="flex-1 accent-yellow-400"
              />
              <div className="bg-yellow-500/30 border border-yellow-400/50 rounded-xl px-4 py-2 text-white font-bold min-w-[70px] text-center">
                ⭐ {points}
              </div>
            </div>
          </div>

          {/* Assign to Family Members */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Assign To *
            </label>
            {familyMembers.length === 0 ? (
              <p className="text-white/50 text-sm">
                No family members yet. Add members first.
              </p>
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
                          ? {
                              background: `${member.color}40`,
                              borderColor: `${member.color}80`,
                            }
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
                          <img
                            src={`/avatars/${member.avatar_url}`}
                            alt={member.name}
                            className="w-full h-full"
                          />
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
              {isLoading ? 'Saving...' : isEditMode ? 'Update Task' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
