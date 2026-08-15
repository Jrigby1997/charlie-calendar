'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/contexts/AuthContext'
import AddTaskModal from './AddTaskModal'
import confetti from 'canvas-confetti'
import SectionCard from './ui/SectionCard'
import IconButton from './ui/IconButton'
import GlassButton from './ui/GlassButton'
import PillToggle from './ui/PillToggle'
import { useSwipe } from '@/lib/useSwipe'

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
  // New fields
  is_rotating: boolean
  rotation_mode: 'completion' | 'date' | null
  current_rotation_index: number
  group_reset_frequency: 'daily' | 'weekly' | 'monthly' | 'never' | null
  rotation_days_interval: number | null
  // Flexible recurrence
  recurrence_interval: number
  recurrence_unit: 'days' | 'weeks' | 'months'
  // Calendar-linked task
  due_date: string | null
  linked_event_id: number | null
  task_assignments: { family_member_id: number }[]
}

type TaskCurrencyReward = {
  task_id: number
  currency_type: string
  amount: number
}

type MemberCurrencyBalance = {
  id: number
  family_member_id: number
  currency_type: string
  total_earned: number
  redeemed_amount: number
}

type TaskSubItem = {
  id: number
  task_id: number
  title: string
  display_order: number
}

type TaskSubCompletion = {
  id: number
  task_id: number
  family_member_id: number
  sub_item_id: number
  period_key: string
}

type TaskRotationMember = {
  id: number
  task_id: number
  family_member_id: number
  rotation_order: number
}

type TaskCompletion = {
  id: number
  task_id: number
  family_member_id: number
  completed_date: string
  points_earned: number
}

// Keep for backward compat (legacy points query)
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
  showRewards?: boolean
  tasksSubView?: 'tasks' | 'rewards'
  onTasksSubViewChange?: (v: 'tasks' | 'rewards') => void
}

/** Returns YYYY-MM-DD in the user's LOCAL timezone (avoids UTC-date-shift bugs). */
function toLocalISO(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

/** Compute the period key for a given reset frequency and date. */
function getPeriodKey(freq: string | null, date: Date): string {
  if (freq === 'weekly') {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // align to Monday
    d.setDate(diff)
    return toLocalISO(d)
  }
  if (freq === 'monthly') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
  }
  if (freq === 'never') return 'done'
  // default: 'daily' or null
  return toLocalISO(date)
}

/** Returns true if the task should be visible on the given date. */
function isDueOnDate(task: Task, date: Date): boolean {
  if (task.task_type === 'one_off') {
    // No due_date = always visible (backward compat for existing tasks)
    if (!task.due_date) return true
    return task.due_date === toLocalISO(date)
  }

  // Repeating task — enforce recurrence interval
  const anchor = new Date(task.created_at)
  const diffMs = date.getTime() - anchor.getTime()
  if (diffMs < 0) return false

  const interval = task.recurrence_interval || 1
  const unit = task.recurrence_unit || 'days'

  if (unit === 'days') {
    const diffDays = Math.floor(diffMs / 86_400_000)
    return diffDays % interval === 0
  }
  if (unit === 'weeks') {
    const diffDays = Math.floor(diffMs / 86_400_000)
    return diffDays % (7 * interval) === 0
  }
  if (unit === 'months') {
    const monthsDiff =
      (date.getFullYear() - anchor.getFullYear()) * 12 +
      (date.getMonth() - anchor.getMonth())
    return monthsDiff % interval === 0 && date.getDate() === anchor.getDate()
  }
  return true
}

const CURRENCY_META: Record<string, { icon: string; label: string }> = {
  stars:       { icon: '⭐', label: 'Stars'       },
  muscles:     { icon: '💪', label: 'Muscles'     },
  heart:       { icon: '❤️',  label: 'Hearts'      },
  game_points: { icon: '🎮', label: 'Game Points' },
  trophy:      { icon: '🏆', label: 'Trophies'    },
}

export default function TasksView({ familyMembers, onShowToast, sectionTitle, showRewards, tasksSubView, onTasksSubViewChange }: TasksViewProps) {
  const { user } = useAuth()
  const [tasks, setTasks]             = useState<Task[]>([])
  const [completions, setCompletions] = useState<TaskCompletion[]>([])
  const [memberPoints, setMemberPoints] = useState<MemberPoints[]>([])
  // New state
  const [currencyRewards, setCurrencyRewards]       = useState<TaskCurrencyReward[]>([])
  const [memberBalances, setMemberBalances]         = useState<MemberCurrencyBalance[]>([])
  const [subItems, setSubItems]                     = useState<TaskSubItem[]>([])
  const [subCompletions, setSubCompletions]         = useState<TaskSubCompletion[]>([])
  const [rotationMembers, setRotationMembers]       = useState<TaskRotationMember[]>([])

  const [loading, setLoading]         = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [viewDate, setViewDate]       = useState(new Date())
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)
  const viewDateISO = toLocalISO(viewDate)
  const viewDateISORef = useRef(viewDateISO)
  useEffect(() => { viewDateISORef.current = viewDateISO }, [viewDateISO])

  const swipeHandlers = useSwipe({
    onSwipeLeft:  () => setViewDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)),
    onSwipeRight: () => setViewDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)),
  })

  // Load all task data
  useEffect(() => {
    if (!user) return
    loadAllData()

    const tasksChannel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        loadTasks()
        loadCurrencyRewards()
        loadRotationMembers()
      })
      .subscribe()

    const assignmentsChannel = supabase
      .channel('task-assignments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignments' }, () => loadTasks())
      .subscribe()

    const completionsChannel = supabase
      .channel('task-completions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_completions' }, () => {
        loadCompletions(viewDateISORef.current)
        loadMemberBalances()
      })
      .subscribe()

    const subCompletionsChannel = supabase
      .channel('task-sub-completions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_sub_completions' }, () =>
        loadSubCompletions()
      )
      .subscribe()

    const balancesChannel = supabase
      .channel('currency-balances-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'member_currency_balances' }, () =>
        loadMemberBalances()
      )
      .subscribe()

    // Fallback: still listen to legacy member_points
    const pointsChannel = supabase
      .channel('member-points-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'member_points' }, () => loadMemberPoints())
      .subscribe()

    return () => {
      supabase.removeChannel(tasksChannel)
      supabase.removeChannel(assignmentsChannel)
      supabase.removeChannel(completionsChannel)
      supabase.removeChannel(subCompletionsChannel)
      supabase.removeChannel(balancesChannel)
      supabase.removeChannel(pointsChannel)
    }
  }, [user])

  // Reload completions and points when viewDate changes
  useEffect(() => {
    if (!user) return
    loadCompletions(viewDateISO)
    loadMemberBalances()
    loadSubCompletions()
  }, [viewDate, user])

  async function loadAllData() {
    setLoading(true)
    await Promise.all([
      loadTasks(),
      loadCompletions(),
      loadMemberPoints(),
      loadMemberBalances(),
      loadCurrencyRewards(),
      loadSubItems(),
      loadSubCompletions(),
      loadRotationMembers(),
    ])
    setLoading(false)
  }

  async function loadTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select(`*, task_assignments(family_member_id)`)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
    if (error) { console.error('Error loading tasks:', error) }
    else { setTasks(data || []) }
  }

  async function loadCurrencyRewards() {
    const { data, error } = await supabase
      .from('task_currency_rewards')
      .select('task_id, currency_type, amount')
    if (error) { console.error('Error loading currency rewards:', error) }
    else { setCurrencyRewards(data || []) }
  }

  async function loadMemberBalances() {
    const { data, error } = await supabase
      .from('member_currency_balances')
      .select('*')
    if (error) { console.error('Error loading member balances:', error) }
    else { setMemberBalances(data || []) }
  }

  async function loadSubItems() {
    const { data, error } = await supabase
      .from('task_sub_items')
      .select('*')
      .order('display_order', { ascending: true })
    if (error) { console.error('Error loading sub items:', error) }
    else { setSubItems(data || []) }
  }

  async function loadSubCompletions() {
    const { data, error } = await supabase
      .from('task_sub_completions')
      .select('*')
    if (error) { console.error('Error loading sub completions:', error) }
    else { setSubCompletions(data || []) }
  }

  async function loadRotationMembers() {
    const { data, error } = await supabase
      .from('task_rotation_members')
      .select('*')
      .order('rotation_order', { ascending: true })
    if (error) { console.error('Error loading rotation members:', error) }
    else { setRotationMembers(data || []) }
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

  /** Star balance from member_currency_balances (falls back to legacy member_points) */
  function getStarBalance(memberId: number): number {
    const bal = memberBalances.find((b) => b.family_member_id === memberId && b.currency_type === 'stars')
    if (bal) return bal.total_earned - bal.redeemed_amount
    // Legacy fallback
    const mp = memberPoints.find((p) => p.family_member_id === memberId)
    return mp ? mp.total_points - mp.redeemed_points : 0
  }

  function getTaskCurrencyRewards(taskId: number): TaskCurrencyReward[] {
    const rewards = currencyRewards.filter((r) => r.task_id === taskId)
    // Legacy fallback: if no currency rewards, use task.points as stars
    if (rewards.length === 0) {
      const task = tasks.find((t) => t.id === taskId)
      if (task && task.points > 0) {
        return [{ task_id: taskId, currency_type: 'stars', amount: task.points }]
      }
    }
    return rewards
  }

  function getTaskSubItems(taskId: number): TaskSubItem[] {
    return subItems.filter((s) => s.task_id === taskId)
  }

  function isSubItemCompleted(subItemId: number, memberId: number, freq: string | null): boolean {
    const key = getPeriodKey(freq, viewDate)
    return subCompletions.some(
      (sc) => sc.sub_item_id === subItemId && sc.family_member_id === memberId && sc.period_key === key
    )
  }

  function areAllSubItemsCompleted(taskId: number, memberId: number, freq: string | null): boolean {
    const items = getTaskSubItems(taskId)
    if (items.length === 0) return true
    return items.every((si) => isSubItemCompleted(si.id, memberId, freq))
  }

  /** Returns the family_member_id who is currently up for a rotating task */
  function getCurrentRotationMemberId(task: Task): number | null {
    const roster = rotationMembers
      .filter((rm) => rm.task_id === task.id)
      .sort((a, b) => a.rotation_order - b.rotation_order)
    if (roster.length === 0) return null
    const idx = task.current_rotation_index % roster.length
    return roster[idx]?.family_member_id ?? null
  }

  function getTasksForMember(memberId: number): Task[] {
    return tasks.filter((t) => {
      // Recurrence / due-date gate — hide tasks not due on viewDate
      if (!isDueOnDate(t, viewDate)) return false
      if (t.is_rotating) {
        // For rotating tasks, show in all rotation members' columns
        return rotationMembers.some((rm) => rm.task_id === t.id && rm.family_member_id === memberId)
      }
      return t.task_assignments.some((a) => a.family_member_id === memberId)
    })
  }

  function getCompletedCountForMember(memberId: number): number {
    const memberTasks = getTasksForMember(memberId)
    return memberTasks.filter((t) => isTaskCompletedByMember(t.id, memberId)).length
  }

  async function handleToggleSubItem(task: Task, subItemId: number, memberId: number) {
    const key = getPeriodKey(task.group_reset_frequency, viewDate)
    const done = isSubItemCompleted(subItemId, memberId, task.group_reset_frequency)

    if (done) {
      await supabase
        .from('task_sub_completions')
        .delete()
        .eq('sub_item_id', subItemId)
        .eq('family_member_id', memberId)
        .eq('period_key', key)
    } else {
      await supabase.from('task_sub_completions').insert({
        task_id: task.id,
        family_member_id: memberId,
        sub_item_id: subItemId,
        period_key: key,
      })
    }
    await loadSubCompletions()
  }

  async function handleCompleteTask(taskId: number, memberId: number) {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    // Rotation guard: only let the current rotation member complete
    if (task.is_rotating) {
      const currentId = getCurrentRotationMemberId(task)
      if (currentId !== memberId) {
        const current = familyMembers.find((m) => m.id === currentId)
        onShowToast(`It's ${current?.name ?? 'someone else'}'s turn for this task!`, 'error')
        return
      }
    }

    const taskRewards = getTaskCurrencyRewards(taskId)
    const alreadyCompleted = isTaskCompletedByMember(taskId, memberId)

    if (alreadyCompleted) {
      // ── UNDO ────────────────────────────────────────────────────────────────
      // Check that undoing won't create negative balance for any currency
      for (const reward of taskRewards) {
        const bal = memberBalances.find(
          (b) => b.family_member_id === memberId && b.currency_type === reward.currency_type
        )
        if (bal) {
          const afterUndo = bal.total_earned - reward.amount - bal.redeemed_amount
          if (afterUndo < 0) {
            const member = familyMembers.find((m) => m.id === memberId)
            const meta = CURRENCY_META[reward.currency_type]
            onShowToast(
              `Can't uncheck — ${member?.name} already spent those ${meta?.label ?? reward.currency_type}!`,
              'error'
            )
            return
          }
        }
      }

      const { error: deleteError } = await supabase
        .from('task_completions')
        .delete()
        .eq('task_id', taskId)
        .eq('family_member_id', memberId)
        .eq('completed_date', viewDateISO)

      if (deleteError) {
        onShowToast('Failed to undo completion', 'error')
        return
      }

      // Reverse currency balances
      for (const reward of taskRewards) {
        const bal = memberBalances.find(
          (b) => b.family_member_id === memberId && b.currency_type === reward.currency_type
        )
        if (bal) {
          await supabase
            .from('member_currency_balances')
            .update({ total_earned: bal.total_earned - reward.amount, updated_at: new Date().toISOString() })
            .eq('family_member_id', memberId)
            .eq('currency_type', reward.currency_type)
        }
      }
      // Also update legacy member_points for stars
      const starReward = taskRewards.find((r) => r.currency_type === 'stars')
      if (starReward) {
        const mp = memberPoints.find((p) => p.family_member_id === memberId)
        if (mp) {
          await supabase
            .from('member_points')
            .update({ total_points: Math.max(0, mp.total_points - starReward.amount) })
            .eq('family_member_id', memberId)
        }
      }

      const member = familyMembers.find((m) => m.id === memberId)
      const summary = taskRewards.map((r) => `${CURRENCY_META[r.currency_type]?.icon ?? r.currency_type} −${r.amount}`).join(' ')
      onShowToast(`Undone! ${summary} for ${member?.name ?? 'member'}`, 'success')
    } else {
      // ── COMPLETE ─────────────────────────────────────────────────────────────
      const { error: insertError } = await supabase
        .from('task_completions')
        .insert({
          task_id: taskId,
          family_member_id: memberId,
          completed_date: viewDateISO,
          points_earned: taskRewards.find((r) => r.currency_type === 'stars')?.amount ?? task.points,
          period_key: viewDateISO,
        })

      if (insertError) {
        onShowToast('Failed to complete task', 'error')
        return
      }

      // Award currencies
      for (const reward of taskRewards) {
        const bal = memberBalances.find(
          (b) => b.family_member_id === memberId && b.currency_type === reward.currency_type
        )
        if (bal) {
          await supabase
            .from('member_currency_balances')
            .update({ total_earned: bal.total_earned + reward.amount, updated_at: new Date().toISOString() })
            .eq('family_member_id', memberId)
            .eq('currency_type', reward.currency_type)
        } else {
          await supabase.from('member_currency_balances').insert({
            family_member_id: memberId,
            currency_type: reward.currency_type,
            total_earned: reward.amount,
            redeemed_amount: 0,
          })
        }
      }
      // Update legacy member_points for stars
      const starReward = taskRewards.find((r) => r.currency_type === 'stars')
      if (starReward) {
        const mp = memberPoints.find((p) => p.family_member_id === memberId)
        if (mp) {
          await supabase
            .from('member_points')
            .update({ total_points: mp.total_points + starReward.amount })
            .eq('family_member_id', memberId)
        } else {
          await supabase.from('member_points').insert({
            family_member_id: memberId,
            total_points: starReward.amount,
            redeemed_points: 0,
          })
        }
      }

      // Handle rotation on completion
      if (task.is_rotating && task.rotation_mode === 'completion') {
        const roster = rotationMembers
          .filter((rm) => rm.task_id === task.id)
          .sort((a, b) => a.rotation_order - b.rotation_order)
        if (roster.length > 0) {
          const nextIndex = (task.current_rotation_index + 1) % roster.length
          await supabase
            .from('tasks')
            .update({ current_rotation_index: nextIndex, last_rotated_date: toLocalISO(new Date()) })
            .eq('id', taskId)
        }
      }

      // Handle one-off task completion
      if (task.task_type === 'one_off' && !task.is_rotating) {
        const assignedMemberIds = task.task_assignments.map((a) => a.family_member_id)
        const allCompleted = assignedMemberIds.every(
          (mid) => mid === memberId || isTaskCompletedByMember(taskId, mid)
        )
        if (allCompleted) {
          await supabase.from('tasks').update({ is_active: false }).eq('id', taskId)
        }
      }

      const member = familyMembers.find((m) => m.id === memberId)
      const summary = taskRewards.map((r) => `${CURRENCY_META[r.currency_type]?.icon ?? r.currency_type} +${r.amount}`).join(' ')
      fireConfetti()
      onShowToast(`${summary || '✅'} for ${member?.name ?? 'member'}!`, 'success')
    }

    await loadCompletions()
    await loadMemberBalances()
    await loadMemberPoints()
    await loadTasks()
    await loadSubCompletions()
  }

  async function handleAddTask(
    title: string,
    description: string,
    taskType: 'daily' | 'one_off',
    taskCurrencyRewards: { currency_type: string; amount: number }[],
    assignedMemberIds: number[],
    taskSubItems: string[],
    groupResetFrequency: 'daily' | 'weekly' | 'monthly' | 'never',
    isRotating: boolean,
    rotationMode: 'completion' | 'date',
    rotationMemberIds: number[],
    rotationDaysInterval: number,
    recurrenceInterval: number,
    recurrenceUnit: 'days' | 'weeks' | 'months'
  ) {
    if (!user) return

    // Sum star rewards for legacy points field
    const starReward = taskCurrencyRewards.find((r) => r.currency_type === 'stars')

    const { data: newTask, error: taskError } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title,
        description: description || null,
        task_type: taskType,
        points: starReward?.amount ?? 0,
        is_rotating: isRotating,
        rotation_mode: isRotating ? rotationMode : null,
        rotation_days_interval: isRotating && rotationMode === 'date' ? rotationDaysInterval : null,
        group_reset_frequency: groupResetFrequency,
        current_rotation_index: 0,
        recurrence_interval: taskType === 'daily' ? recurrenceInterval : 1,
        recurrence_unit: taskType === 'daily' ? recurrenceUnit : 'days',
      })
      .select()
      .single()

    if (taskError || !newTask) {
      onShowToast('Failed to add task', 'error')
      return
    }

    // Assignments (standard or rotation)
    const memberIdsToAssign = isRotating ? rotationMemberIds : assignedMemberIds
    if (memberIdsToAssign.length > 0) {
      await supabase.from('task_assignments').insert(
        memberIdsToAssign.map((memberId) => ({ task_id: newTask.id, family_member_id: memberId }))
      )
    }

    // Currency rewards
    if (taskCurrencyRewards.length > 0) {
      await supabase.from('task_currency_rewards').insert(
        taskCurrencyRewards.map((r) => ({ task_id: newTask.id, ...r }))
      )
    }

    // Sub-items
    if (taskSubItems.length > 0) {
      await supabase.from('task_sub_items').insert(
        taskSubItems.map((title, i) => ({ task_id: newTask.id, title, display_order: i }))
      )
    }

    // Rotation roster
    if (isRotating && rotationMemberIds.length > 0) {
      await supabase.from('task_rotation_members').insert(
        rotationMemberIds.map((memberId, i) => ({
          task_id: newTask.id,
          family_member_id: memberId,
          rotation_order: i,
        }))
      )
    }

    onShowToast(`Task "${title}" added!`, 'success')
    await loadAllData()
  }

  async function handleUpdateTask(
    id: number,
    title: string,
    description: string,
    taskType: 'daily' | 'one_off',
    taskCurrencyRewards: { currency_type: string; amount: number }[],
    assignedMemberIds: number[],
    taskSubItems: string[],
    groupResetFrequency: 'daily' | 'weekly' | 'monthly' | 'never',
    isRotating: boolean,
    rotationMode: 'completion' | 'date',
    rotationMemberIds: number[],
    rotationDaysInterval: number,
    recurrenceInterval: number,
    recurrenceUnit: 'days' | 'weeks' | 'months'
  ) {
    const starReward = taskCurrencyRewards.find((r) => r.currency_type === 'stars')

    const { error: taskError } = await supabase
      .from('tasks')
      .update({
        title,
        description: description || null,
        task_type: taskType,
        points: starReward?.amount ?? 0,
        is_rotating: isRotating,
        rotation_mode: isRotating ? rotationMode : null,
        rotation_days_interval: isRotating && rotationMode === 'date' ? rotationDaysInterval : null,
        group_reset_frequency: groupResetFrequency,
        recurrence_interval: taskType === 'daily' ? recurrenceInterval : 1,
        recurrence_unit: taskType === 'daily' ? recurrenceUnit : 'days',
      })
      .eq('id', id)

    if (taskError) {
      onShowToast('Failed to update task', 'error')
      return
    }

    // Replace assignments
    await supabase.from('task_assignments').delete().eq('task_id', id)
    const memberIdsToAssign = isRotating ? rotationMemberIds : assignedMemberIds
    if (memberIdsToAssign.length > 0) {
      await supabase.from('task_assignments').insert(
        memberIdsToAssign.map((memberId) => ({ task_id: id, family_member_id: memberId }))
      )
    }

    // Replace currency rewards
    await supabase.from('task_currency_rewards').delete().eq('task_id', id)
    if (taskCurrencyRewards.length > 0) {
      await supabase.from('task_currency_rewards').insert(
        taskCurrencyRewards.map((r) => ({ task_id: id, ...r }))
      )
    }

    // Replace sub-items
    await supabase.from('task_sub_items').delete().eq('task_id', id)
    if (taskSubItems.length > 0) {
      await supabase.from('task_sub_items').insert(
        taskSubItems.map((title, i) => ({ task_id: id, title, display_order: i }))
      )
    }

    // Replace rotation roster
    await supabase.from('task_rotation_members').delete().eq('task_id', id)
    if (isRotating && rotationMemberIds.length > 0) {
      await supabase.from('task_rotation_members').insert(
        rotationMemberIds.map((memberId, i) => ({
          task_id: id,
          family_member_id: memberId,
          rotation_order: i,
        }))
      )
    }

    onShowToast(`Task "${title}" updated!`, 'success')
    await loadAllData()
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
    const taskRewards = currencyRewards.filter((r) => r.task_id === task.id)
    const taskSubItemTitles = subItems
      .filter((s) => s.task_id === task.id)
      .sort((a, b) => a.display_order - b.display_order)
      .map((s) => s.title)
    const taskRotationOrder = rotationMembers
      .filter((rm) => rm.task_id === task.id)
      .sort((a, b) => a.rotation_order - b.rotation_order)
      .map((rm) => rm.family_member_id)

    setEditingTask({
      id: task.id,
      title: task.title,
      description: task.description || '',
      task_type: task.task_type,
      assigned_member_ids: task.task_assignments.map((a) => a.family_member_id),
      currency_rewards: taskRewards,
      sub_items: taskSubItemTitles,
      group_reset_frequency: task.group_reset_frequency ?? 'daily',
      is_rotating: task.is_rotating,
      rotation_mode: task.rotation_mode ?? 'completion',
      rotation_members: taskRotationOrder,
      rotation_days_interval: task.rotation_days_interval ?? 7,
      recurrence_interval: task.recurrence_interval ?? 1,
      recurrence_unit: task.recurrence_unit ?? 'days',
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
      <SectionCard className="p-8 h-full flex items-center justify-center">
        <div className="text-white/70 text-lg">Loading tasks...</div>
      </SectionCard>
    )
  }

  return (
    <>
      <SectionCard className="h-full flex flex-col" {...swipeHandlers}>
        {/* Header */}
        <div className="px-4 md:px-6 pt-4 md:pt-6 pb-3 flex flex-col gap-2 flex-shrink-0">
          {/* Row 1: title (left) + toggle + add button (right) */}
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl md:text-2xl font-bold text-white drop-shadow-lg truncate">{sectionTitle || '✅ Tasks'}</h2>
            <div className="flex items-center gap-1 flex-shrink-0">
              {showRewards && onTasksSubViewChange && (
                <PillToggle
                  items={[{ value: 'tasks', label: '✅ Tasks' }, { value: 'rewards', label: '🏆 Rewards' }]}
                  value={tasksSubView ?? 'tasks'}
                  onChange={v => onTasksSubViewChange(v as 'tasks' | 'rewards')}
                  size="sm"
                />
              )}
              <IconButton
                onClick={() => {
                  setEditingTask(null)
                  setIsModalOpen(true)
                }}
                title="Add Task"
              />
            </div>
          </div>
          {/* Row 2: date heading centered */}
          <h3 className="text-base md:text-lg font-semibold text-white/80 drop-shadow leading-tight text-center">{viewDateFormatted}</h3>
          {/* Row 3: ← Today → centered */}
          <div className="flex justify-center gap-1">
            <GlassButton size="sm" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() - 1))} className="px-3">←</GlassButton>
            <GlassButton size="sm" onClick={() => setViewDate(new Date())}>Today</GlassButton>
            <GlassButton size="sm" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() + 1))} className="px-3">→</GlassButton>
          </div>
          {/* Row 3: member picker (mobile only) */}
          {familyMembers.length > 0 && (
            <div className="md:hidden flex items-center gap-2">
              {familyMembers.map((m) => {
                const isSelected = (selectedMemberId ?? familyMembers[0]?.id) === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMemberId(m.id)}
                    className={`flex-shrink-0 rounded-full transition-all duration-200 ${
                      isSelected ? 'ring-2 ring-white scale-110' : 'opacity-50'
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden shadow-md"
                      style={{ backgroundColor: m.color }}
                    >
                      {m.avatar_url ? (
                        <img src={`/avatars/${m.avatar_url}`} alt={m.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-xs font-bold">{m.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
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
              <GlassButton
                size="xl"
                onClick={() => {
                  setEditingTask(null)
                  setIsModalOpen(true)
                }}
              >
                + Create First Task
              </GlassButton>
            </div>
          ) : (
            <div className="flex h-full min-w-0">
              {familyMembers.map((member) => {
                const memberTasks = getTasksForMember(member.id)
                const completedCount = getCompletedCountForMember(member.id)
                const totalCount = memberTasks.length
                const stars = getStarBalance(member.id)

                const dailyTasks = memberTasks.filter((t) => t.task_type === 'daily')
                const oneOffTasks = memberTasks.filter((t) => t.task_type === 'one_off')

                return (
                  <div
                    key={member.id}
                    className={`flex flex-col border-r border-white/10 last:border-r-0 md:flex-1 md:min-w-[220px] md:max-w-[360px] ${
                      (selectedMemberId ?? familyMembers[0]?.id) === member.id ? 'flex-1' : 'hidden md:flex'
                    }`}
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
                            {stars > 0 && (
                              <span className="text-yellow-400 text-xs font-bold">
                                ⭐ {stars}
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
                                const taskItems = getTaskSubItems(task.id)
                                const completedSubIds = new Set(
                                  taskItems.filter((si) => isSubItemCompleted(si.id, member.id, task.group_reset_frequency)).map((si) => si.id)
                                )
                                const allSubsDone = areAllSubItemsCompleted(task.id, member.id, task.group_reset_frequency)
                                const isCurrentRotation = task.is_rotating ? getCurrentRotationMemberId(task) === member.id : true
                                const rewardSummary = getTaskCurrencyRewards(task.id)
                                  .map((r) => `${CURRENCY_META[r.currency_type]?.icon ?? r.currency_type} ${r.amount}`)
                                  .join(' ')
                                return (
                                  <TaskTile
                                    key={task.id}
                                    task={task}
                                    member={member}
                                    completed={completed}
                                    taskSubItems={taskItems}
                                    completedSubItemIds={completedSubIds}
                                    allSubsDone={allSubsDone}
                                    isCurrentRotation={isCurrentRotation}
                                    rewardSummary={rewardSummary}
                                    onComplete={() => handleCompleteTask(task.id, member.id)}
                                    onToggleSubItem={(subItemId) => handleToggleSubItem(task, subItemId, member.id)}
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
                                const taskItems = getTaskSubItems(task.id)
                                const completedSubIds = new Set(
                                  taskItems.filter((si) => isSubItemCompleted(si.id, member.id, task.group_reset_frequency)).map((si) => si.id)
                                )
                                const allSubsDone = areAllSubItemsCompleted(task.id, member.id, task.group_reset_frequency)
                                const isCurrentRotation = task.is_rotating ? getCurrentRotationMemberId(task) === member.id : true
                                const rewardSummary = getTaskCurrencyRewards(task.id)
                                  .map((r) => `${CURRENCY_META[r.currency_type]?.icon ?? r.currency_type} ${r.amount}`)
                                  .join(' ')
                                return (
                                  <TaskTile
                                    key={task.id}
                                    task={task}
                                    member={member}
                                    completed={completed}
                                    taskSubItems={taskItems}
                                    completedSubItemIds={completedSubIds}
                                    allSubsDone={allSubsDone}
                                    isCurrentRotation={isCurrentRotation}
                                    rewardSummary={rewardSummary}
                                    onComplete={() => handleCompleteTask(task.id, member.id)}
                                    onToggleSubItem={(subItemId) => handleToggleSubItem(task, subItemId, member.id)}
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
      </SectionCard>

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
  taskSubItems,
  completedSubItemIds,
  allSubsDone,
  isCurrentRotation,
  rewardSummary,
  onComplete,
  onToggleSubItem,
  onEdit,
}: {
  task: Task
  member: FamilyMember
  completed: boolean
  taskSubItems: TaskSubItem[]
  completedSubItemIds: Set<number>
  allSubsDone: boolean
  isCurrentRotation: boolean
  rewardSummary: string
  onComplete: () => void
  onToggleSubItem: (subItemId: number) => void
  onEdit: () => void
}) {
  const hasSubItems = taskSubItems.length > 0
  // Tile is dimmed if: already completed, or rotating and not current member's turn
  const isDimmed = completed || (!isCurrentRotation && task.is_rotating)
  // Main circle only enabled when: not yet completed AND (no sub-items OR all sub-items done) AND it's their turn
  const circleEnabled = !completed && allSubsDone && isCurrentRotation

  return (
    <div
      className={`rounded-2xl px-4 py-3.5 transition-all duration-200 cursor-pointer group ${
        isDimmed ? 'opacity-50' : ''
      }`}
      style={{
        backgroundColor: completed
          ? `${member.color}10`
          : `${member.color}18`,
        border: `1px solid ${member.color}${completed ? '10' : '22'}`,
      }}
      onClick={onEdit}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <p
            className={`font-semibold text-[13px] leading-snug ${
              completed ? 'text-white/35 line-through' : 'text-white/90'
            }`}
          >
            {task.title}
            {task.linked_event_id && !completed && (
              <span className="ml-1.5 text-[10px] text-sky-300/70 font-normal">📅</span>
            )}
            {task.is_rotating && !completed && (
              <span className="ml-1.5 text-[10px] text-indigo-300/70 font-normal">
                {isCurrentRotation ? '🔄 your turn' : '🔄'}
              </span>
            )}
          </p>

          {/* Recurrence label */}
          {task.task_type === 'daily' && !completed && (() => {
            const interval = task.recurrence_interval || 1
            const unit = task.recurrence_unit || 'days'
            if (interval === 1 && unit === 'days') return null // plain daily — no label needed
            const label = interval === 1
              ? unit.slice(0, -1).charAt(0).toUpperCase() + unit.slice(1, -1) + 'ly' // "weekly", "monthly"
              : `Every ${interval} ${unit}`
            return (
              <p className="text-[10px] text-white/35 mt-0.5">{label}</p>
            )
          })()}

          {/* Description */}
          {task.description && (
            <p className={`text-[11px] mt-0.5 ${completed ? 'text-white/20' : 'text-white/45'}`}>
              {task.description}
            </p>
          )}

          {/* Sub-items checklist */}
          {hasSubItems && !completed && (
            <div className="flex flex-col gap-1 mt-2">
              {taskSubItems.map((si) => {
                const done = completedSubItemIds.has(si.id)
                return (
                  <button
                    key={si.id}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggleSubItem(si.id) }}
                    className="flex items-center gap-2 text-left group/sub"
                  >
                    <span
                      className={`w-4 h-4 rounded-md border flex-shrink-0 flex items-center justify-center transition-all ${
                        done
                          ? 'bg-green-500 border-green-400'
                          : 'border-white/30 bg-white/5 group-hover/sub:border-white/50'
                      }`}
                    >
                      {done && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className={`text-[11px] ${done ? 'line-through text-white/30' : 'text-white/60'}`}>
                      {si.title}
                    </span>
                  </button>
                )
              })}
              {hasSubItems && !allSubsDone && (
                <p className="text-[10px] text-white/30 mt-0.5">
                  {completedSubItemIds.size}/{taskSubItems.length} steps done
                </p>
              )}
            </div>
          )}

          {/* Reward summary */}
          {!completed && rewardSummary && (
            <span className="text-yellow-400/70 text-[11px] font-semibold block mt-1">
              {rewardSummary}
            </span>
          )}
        </div>

        {/* Completion Circle */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (circleEnabled || completed) onComplete()
          }}
          disabled={!circleEnabled && !completed}
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 mt-0.5 ${
            completed
              ? 'border-green-400 bg-green-500 shadow-[0_0_8px_rgba(74,222,128,0.3)] hover:scale-110'
              : circleEnabled
              ? 'border-white/50 bg-white/10 hover:border-white/70 hover:bg-white/20 hover:scale-110'
              : 'border-white/10 bg-white/3 cursor-not-allowed opacity-30'
          }`}
          title={
            completed
              ? 'Undo completion'
              : !isCurrentRotation
              ? 'Not your turn'
              : !allSubsDone
              ? 'Complete all steps first'
              : 'Mark complete'
          }
        >
          {completed && (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
