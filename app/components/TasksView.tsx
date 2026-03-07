'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/contexts/AuthContext'
import AddTaskModal from './AddTaskModal'
import confetti from 'canvas-confetti'

type FamilyMember = {
  id: number
  name: string
  color: string
  role: string | null
  avatar_url?: string | null
}

type Task = {
  id: number
  title: string
  description: string | null
  task_type: 'daily' | 'one_off'
  points: number
  is_active: boolean
  created_at: string
  task_assignments: {
    family_member_id: number
  }[]
}

type TaskCompletion = {
  id: number
  task_id: number
  family_member_id: number
  completed_date: string
  points_earned: number
}

type MemberPoints = {
  id: number
  family_member_id: number
  total_points: number
  redeemed_points: number
}

type TasksViewProps = {
  familyMembers: FamilyMember[]
  onShowToast: (message: string, tone: 'success' | 'error') => void
  sectionTitle?: string
}

/** Returns YYYY-MM-DD in the user's LOCAL timezone (avoids UTC-date-shift bugs). */
function toLocalISO(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export default function TasksView({ familyMembers, onShowToast, sectionTitle }: TasksViewProps) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [completions, setCompletions] = useState<TaskCompletion[]>([])
  const [memberPoints, setMemberPoints] = useState<MemberPoints[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [viewDate, setViewDate] = useState(new Date())
  const today = toLocalISO(new Date())
  const viewDateISO = toLocalISO(viewDate)
  // Keep a ref so realtime callbacks always read the current date (not stale closure)
  const viewDateISORef = useRef(viewDateISO)
  useEffect(() => { viewDateISORef.current = viewDateISO }, [viewDateISO])

  // Load all task data
  useEffect(() => {
    if (!user) return
    loadAllData()

    // Realtime subscriptions
    const tasksChannel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadTasks())
      .subscribe()

    const assignmentsChannel = supabase
      .channel('task-assignments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignments' }, () => loadTasks())
      .subscribe()

    const completionsChannel = supabase
      .channel('task-completions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_completions' }, () => {
        // Use ref so we always reload the currently-viewed date, not the date from initial render
        loadCompletions(viewDateISORef.current)
        loadMemberPoints()
      })
      .subscribe()

    const pointsChannel = supabase
      .channel('member-points-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'member_points' }, () => loadMemberPoints())
      .subscribe()

    return () => {
      supabase.removeChannel(tasksChannel)
      supabase.removeChannel(assignmentsChannel)
      supabase.removeChannel(completionsChannel)
      supabase.removeChannel(pointsChannel)
    }
  }, [user])

  // Reload completions and points when viewDate changes
  useEffect(() => {
    if (!user) return
    loadCompletions(viewDateISO)
    loadMemberPoints()
  }, [viewDate, user])

  async function loadAllData() {
    setLoading(true)
    await Promise.all([loadTasks(), loadCompletions(), loadMemberPoints()])
    setLoading(false)
  }

  async function loadTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        task_assignments (
          family_member_id
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading tasks:', error)
    } else {
      setTasks(data || [])
    }
  }

  async function loadCompletions(dateISO?: string) {
    const date = dateISO ?? viewDateISORef.current
    const { data, error } = await supabase
      .from('task_completions')
      .select('*')
      .eq('completed_date', date)

    if (error) {
      console.error('Error loading completions:', error)
    } else {
      setCompletions(data || [])
    }
  }

  async function loadMemberPoints() {
    const { data, error } = await supabase
      .from('member_points')
      .select('*')

    if (error) {
      console.error('Error loading member points:', error)
    } else {
      setMemberPoints(data || [])
    }
  }

  function isTaskCompletedByMember(taskId: number, memberId: number): boolean {
    return completions.some(
      (c) => c.task_id === taskId && c.family_member_id === memberId && c.completed_date === viewDateISO
    )
  }

  function getMemberPointsTotal(memberId: number): number {
    const mp = memberPoints.find((p) => p.family_member_id === memberId)
    return mp ? mp.total_points - mp.redeemed_points : 0
  }

  function getTasksForMember(memberId: number): Task[] {
    return tasks.filter((t) =>
      t.task_assignments.some((a) => a.family_member_id === memberId)
    )
  }

  function getCompletedCountForMember(memberId: number): number {
    const memberTasks = getTasksForMember(memberId)
    return memberTasks.filter((t) => isTaskCompletedByMember(t.id, memberId)).length
  }

  async function handleCompleteTask(taskId: number, memberId: number) {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    const alreadyCompleted = isTaskCompletedByMember(taskId, memberId)

    if (alreadyCompleted) {
      // Check if unchecking would cause negative available points
      const currentPoints = memberPoints.find((p) => p.family_member_id === memberId)
      if (currentPoints) {
        const availableAfterUndo = (currentPoints.total_points - task.points) - currentPoints.redeemed_points
        if (availableAfterUndo < 0) {
          const member = familyMembers.find((m) => m.id === memberId)
          onShowToast(`Can't uncheck — ${member?.name} already spent those stars!`, 'error')
          return
        }
      }

      // Undo completion
      const { error: deleteError } = await supabase
        .from('task_completions')
        .delete()
        .eq('task_id', taskId)
        .eq('family_member_id', memberId)
        .eq('completed_date', viewDateISO)

      if (deleteError) {
        console.error('Error undoing completion:', deleteError)
        onShowToast('Failed to undo completion', 'error')
        return
      }

      if (currentPoints) {
        await supabase
          .from('member_points')
          .update({ total_points: currentPoints.total_points - task.points })
          .eq('family_member_id', memberId)
      }

      const member = familyMembers.find((m) => m.id === memberId)
      onShowToast(`Undone! -${task.points}⭐ for ${member?.name || 'member'}`, 'success')
    } else {
      // Complete the task
      const { error: insertError } = await supabase
        .from('task_completions')
        .insert({
          task_id: taskId,
          family_member_id: memberId,
          completed_date: viewDateISO,
          points_earned: task.points,
        })

      if (insertError) {
        console.error('Error completing task:', insertError)
        onShowToast('Failed to complete task', 'error')
        return
      }

      const currentPoints = memberPoints.find((p) => p.family_member_id === memberId)
      if (currentPoints) {
        await supabase
          .from('member_points')
          .update({ total_points: currentPoints.total_points + task.points })
          .eq('family_member_id', memberId)
      } else {
        await supabase
          .from('member_points')
          .insert({ family_member_id: memberId, total_points: task.points, redeemed_points: 0 })
      }

      // If one-off task, check if all assigned members have completed it
      if (task.task_type === 'one_off') {
        const assignedMemberIds = task.task_assignments.map((a) => a.family_member_id)
        const allCompleted = assignedMemberIds.every(
          (mid) => mid === memberId || isTaskCompletedByMember(taskId, mid)
        )
        if (allCompleted) {
          await supabase.from('tasks').update({ is_active: false }).eq('id', taskId)
        }
      }

      const member = familyMembers.find((m) => m.id === memberId)
      fireConfetti()
      onShowToast(`⭐ +${task.points} for ${member?.name || 'member'}!`, 'success')
    }

    await loadCompletions()
    await loadMemberPoints()
    await loadTasks()
  }

  async function handleAddTask(
    title: string,
    description: string,
    taskType: 'daily' | 'one_off',
    points: number,
    assignedMemberIds: number[]
  ) {
    if (!user) return

    const { data: newTask, error: taskError } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title,
        description: description || null,
        task_type: taskType,
        points,
      })
      .select()
      .single()

    if (taskError || !newTask) {
      console.error('Error adding task:', taskError)
      onShowToast('Failed to add task', 'error')
      return
    }

    if (assignedMemberIds.length > 0) {
      const assignments = assignedMemberIds.map((memberId) => ({
        task_id: newTask.id,
        family_member_id: memberId,
      }))

      const { error: assignError } = await supabase
        .from('task_assignments')
        .insert(assignments)

      if (assignError) {
        console.error('Error assigning task:', assignError)
      }
    }

    onShowToast(`Task "${title}" added!`, 'success')
    await loadTasks()
  }

  async function handleUpdateTask(
    id: number,
    title: string,
    description: string,
    taskType: 'daily' | 'one_off',
    points: number,
    assignedMemberIds: number[]
  ) {
    const { error: taskError } = await supabase
      .from('tasks')
      .update({ title, description: description || null, task_type: taskType, points })
      .eq('id', id)

    if (taskError) {
      console.error('Error updating task:', taskError)
      onShowToast('Failed to update task', 'error')
      return
    }

    await supabase.from('task_assignments').delete().eq('task_id', id)

    if (assignedMemberIds.length > 0) {
      const assignments = assignedMemberIds.map((memberId) => ({
        task_id: id,
        family_member_id: memberId,
      }))
      await supabase.from('task_assignments').insert(assignments)
    }

    onShowToast(`Task "${title}" updated!`, 'success')
    await loadTasks()
  }

  async function handleDeleteTask(id: number) {
    await supabase.from('task_assignments').delete().eq('task_id', id)
    await supabase.from('task_completions').delete().eq('task_id', id)

    const { error } = await supabase.from('tasks').delete().eq('id', id)

    if (error) {
      console.error('Error deleting task:', error)
      onShowToast('Failed to delete task', 'error')
      return
    }

    onShowToast('Task deleted', 'success')
    await loadTasks()
  }

  function handleEditTask(task: Task) {
    setEditingTask({
      id: task.id,
      title: task.title,
      description: task.description || '',
      task_type: task.task_type,
      points: task.points,
      assigned_member_ids: task.task_assignments.map((a) => a.family_member_id),
    })
    setIsModalOpen(true)
  }

  function handleCloseModal() {
    setIsModalOpen(false)
    setEditingTask(null)
  }

  function fireConfetti() {
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.65 },
      colors: ['#FFD700', '#FFA500', '#2DD4BF', '#A78BFA', '#34D399'],
    })
  }

  // Format today's date
  const viewDateFormatted = viewDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })


  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 h-full flex items-center justify-center">
        <div className="text-white/70 text-lg">Loading tasks...</div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 h-full flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.3)]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex flex-col gap-3 flex-shrink-0">
          {/* Top row: title left | date center | + right */}
          <div className="grid grid-cols-3 items-center">
            <div>
              {sectionTitle && <h2 className="text-2xl font-bold text-white drop-shadow-lg">{sectionTitle}</h2>}
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white drop-shadow-lg">{viewDateFormatted}</h2>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setEditingTask(null)
                  setIsModalOpen(true)
                }}
                className="w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full transition-all duration-200 border border-white/30 hover:scale-110 flex items-center justify-center text-2xl font-light shadow-lg"
                title="Add Task"
              >
                +
              </button>
            </div>
          </div>

          {/* Nav buttons row */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() - 1))}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm font-medium transition-all duration-200"
            >← Prev</button>
            <button
              onClick={() => setViewDate(new Date())}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/80 hover:text-white text-sm font-medium transition-all duration-200"
            >Today</button>
            <button
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() + 1))}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm font-medium transition-all duration-200"
            >Next →</button>
          </div>
        </div>

        {/* Columns Container */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          {familyMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="text-6xl mb-4">✨</div>
              <h3 className="text-xl font-semibold text-white/80 mb-2">No family members yet</h3>
              <p className="text-white/50">Add family members first, then create tasks for them.</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-white/80 mb-2">No tasks yet!</h3>
              <p className="text-white/50 mb-6 max-w-sm">
                Create daily chores or one-off tasks and assign them to family members.
              </p>
              <button
                onClick={() => {
                  setEditingTask(null)
                  setIsModalOpen(true)
                }}
                className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all duration-200 border border-white/30 font-medium"
              >
                + Create First Task
              </button>
            </div>
          ) : (
            <div className="flex h-full min-w-0">
              {familyMembers.map((member) => {
                const memberTasks = getTasksForMember(member.id)
                const completedCount = getCompletedCountForMember(member.id)
                const totalCount = memberTasks.length
                const pts = getMemberPointsTotal(member.id)

                const dailyTasks = memberTasks.filter((t) => t.task_type === 'daily')
                const oneOffTasks = memberTasks.filter((t) => t.task_type === 'one_off')

                return (
                  <div
                    key={member.id}
                    className="flex-1 min-w-[220px] max-w-[360px] flex flex-col border-r border-white/10 last:border-r-0"
                  >
                    {/* Member Column Header */}
                    <div className="px-4 pt-4 pb-3 flex-shrink-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg"
                          style={{
                            backgroundColor: member.color,
                            border: `3px solid ${member.color}80`,
                          }}
                        >
                          {member.avatar_url ? (
                            <img
                              src={`/avatars/${member.avatar_url}`}
                              alt={member.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white text-lg font-bold">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-white font-bold text-lg truncate drop-shadow-md">
                            {member.name}
                          </h3>
                          <div className="flex items-center gap-3">
                            <span className="text-white/50 text-xs font-medium">
                              ✓ {completedCount}/{totalCount}
                            </span>
                            {pts > 0 && (
                              <span className="text-yellow-400 text-xs font-bold">
                                ⭐ {pts}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Scrollable Task Tiles */}
                    <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2 no-scroll">
                      {memberTasks.length === 0 ? (
                        <div className="text-center text-white/30 text-sm py-8">
                          No tasks assigned
                        </div>
                      ) : (
                        <>
                          {/* Daily Tasks Section */}
                          {dailyTasks.length > 0 && (
                            <>
                              <div className="text-[10px] font-bold text-white/35 uppercase tracking-[0.15em] px-1 pt-1 pb-0.5">
                                Daily
                              </div>
                              {dailyTasks.map((task) => {
                                const completed = isTaskCompletedByMember(task.id, member.id)
                                return (
                                  <TaskTile
                                    key={task.id}
                                    task={task}
                                    member={member}
                                    completed={completed}
                                    onComplete={() => handleCompleteTask(task.id, member.id)}
                                    onEdit={() => handleEditTask(task)}
                                  />
                                )
                              })}
                            </>
                          )}

                          {/* One-Off Tasks Section */}
                          {oneOffTasks.length > 0 && (
                            <>
                              <div className="text-[10px] font-bold text-white/35 uppercase tracking-[0.15em] px-1 pt-2 pb-0.5">
                                To-Do
                              </div>
                              {oneOffTasks.map((task) => {
                                const completed = isTaskCompletedByMember(task.id, member.id)
                                return (
                                  <TaskTile
                                    key={task.id}
                                    task={task}
                                    member={member}
                                    completed={completed}
                                    onComplete={() => handleCompleteTask(task.id, member.id)}
                                    onEdit={() => handleEditTask(task)}
                                  />
                                )
                              })}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <AddTaskModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onAddTask={handleAddTask}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        editTask={editingTask}
        familyMembers={familyMembers}
      />
    </>
  )
}

/* ── Task Tile Component ── */

function TaskTile({
  task,
  member,
  completed,
  onComplete,
  onEdit,
}: {
  task: Task
  member: FamilyMember
  completed: boolean
  onComplete: () => void
  onEdit: () => void
}) {
  return (
    <div
      className={`rounded-2xl px-4 py-3.5 transition-all duration-200 cursor-pointer group ${
        completed ? 'opacity-50' : ''
      }`}
      style={{
        backgroundColor: completed
          ? `${member.color}10`
          : `${member.color}18`,
        border: `1px solid ${member.color}${completed ? '10' : '22'}`,
      }}
      onClick={onEdit}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p
            className={`font-semibold text-[13px] leading-snug ${
              completed ? 'text-white/35 line-through' : 'text-white/90'
            }`}
          >
            {task.title}
          </p>
          {task.description && (
            <p
              className={`text-[11px] mt-0.5 ${
                completed ? 'text-white/20' : 'text-white/45'
              }`}
            >
              {task.description}
            </p>
          )}
          {!completed && (
            <span className="text-yellow-400/70 text-[11px] font-semibold">
              {task.points > 0 ? `⭐ ${task.points}` : ''}
            </span>
          )}
        </div>

        {/* Completion Circle */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onComplete()
          }}
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:scale-110 ${
            completed
              ? 'border-green-400 bg-green-500 shadow-[0_0_8px_rgba(74,222,128,0.3)]'
              : 'border-white/25 bg-white/5 hover:border-white/50 hover:bg-white/10'
          }`}
        >
          {completed && (
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
