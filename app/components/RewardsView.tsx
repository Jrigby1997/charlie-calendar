'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/contexts/AuthContext'
import AddRewardModal from './AddRewardModal'
import confetti from 'canvas-confetti'
import SectionCard from './ui/SectionCard'
import PillToggle from './ui/PillToggle'
import IconButton from './ui/IconButton'
import GlassButton from './ui/GlassButton'

type FamilyMember = {
  id: number
  name: string
  color: string
  role: string | null
  avatar_url?: string | null
}

type Reward = {
  id: number
  title: string
  description: string | null
  cost: number
  reward_type: 'reusable' | 'one_off'
  currency_type: string
  is_active: boolean
  created_at: string
  reward_assignments: {
    family_member_id: number
  }[]
}

type MemberPoints = {
  id: number
  family_member_id: number
  total_points: number
  redeemed_points: number
}

type MemberCurrencyBalance = {
  id: number
  family_member_id: number
  currency_type: string
  total_earned: number
  redeemed_amount: number
}

type RedemptionHistory = {
  id: number
  reward_id: number
  family_member_id: number
  points_spent: number
  redeemed_at: string
  rewards: { title: string; currency_type?: string } | null
}

const CURRENCY_META: Record<string, { icon: string; label: string }> = {
  stars:       { icon: '⭐', label: 'Stars'       },
  muscles:     { icon: '💪', label: 'Muscles'     },
  heart:       { icon: '❤️',  label: 'Hearts'      },
  game_points: { icon: '🎮', label: 'Game Points' },
  trophy:      { icon: '🏆', label: 'Trophies'    },
}

type RewardsViewProps = {
  familyMembers: FamilyMember[]
  onShowToast: (message: string, tone: 'success' | 'error') => void
  sectionTitle?: string
}

export default function RewardsView({ familyMembers, onShowToast, sectionTitle }: RewardsViewProps) {
  const { user } = useAuth()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [memberPoints, setMemberPoints] = useState<MemberPoints[]>([])
  const [memberBalances, setMemberBalances] = useState<MemberCurrencyBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingReward, setEditingReward] = useState<any>(null)
  const [confirmRedeem, setConfirmRedeem] = useState<{ rewardId: number; memberId: number } | null>(null)
  const [redemptionHistory, setRedemptionHistory] = useState<RedemptionHistory[]>([])
  const [subView, setSubView] = useState<'rewards' | 'history'>('rewards')

  // Load data
  useEffect(() => {
    if (!user) return
    loadAllData()

    const rewardsChannel = supabase
      .channel('rewards-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rewards' }, () => loadRewards())
      .subscribe()

    const assignmentsChannel = supabase
      .channel('reward-assignments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reward_assignments' }, () => loadRewards())
      .subscribe()

    const redemptionsChannel = supabase
      .channel('reward-redemptions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reward_redemptions' }, () => {
        loadMemberPoints()
        loadRewards()
        loadHistory()
      })
      .subscribe()

    const pointsChannel = supabase
      .channel('rewards-member-points-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'member_points' }, () => loadMemberPoints())
      .subscribe()

    const balancesChannel = supabase
      .channel('rewards-currency-balances-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'member_currency_balances' }, () => loadMemberBalances())
      .subscribe()

    return () => {
      supabase.removeChannel(rewardsChannel)
      supabase.removeChannel(assignmentsChannel)
      supabase.removeChannel(redemptionsChannel)
      supabase.removeChannel(pointsChannel)
      supabase.removeChannel(balancesChannel)
    }
  }, [user])

  async function loadAllData() {
    setLoading(true)
    await Promise.all([loadRewards(), loadMemberPoints(), loadMemberBalances(), loadHistory()])
    setLoading(false)
  }

  async function loadRewards() {
    const { data, error } = await supabase
      .from('rewards')
      .select(`
        *,
        reward_assignments (
          family_member_id
        )
      `)
      .eq('is_active', true)
      .order('cost', { ascending: true })

    if (error) {
      console.error('Error loading rewards:', error)
    } else {
      setRewards(data || [])
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

  async function loadMemberBalances() {
    const { data, error } = await supabase
      .from('member_currency_balances')
      .select('*')

    if (error) {
      console.error('Error loading member balances:', error)
    } else {
      setMemberBalances(data || [])
    }
  }

  async function loadHistory() {
    const { data, error } = await supabase
      .from('reward_redemptions')
      .select('id, reward_id, family_member_id, points_spent, redeemed_at, rewards(title)')
      .order('redeemed_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('Error loading redemption history:', error)
    } else {
      setRedemptionHistory((data as unknown as RedemptionHistory[]) || [])
    }
  }

  function getAvailableBalance(memberId: number, currencyType: string): number {
    const bal = memberBalances.find(
      (b) => b.family_member_id === memberId && b.currency_type === currencyType
    )
    if (bal) return bal.total_earned - bal.redeemed_amount
    // Legacy fallback for stars
    if (currencyType === 'stars') {
      const mp = memberPoints.find((p) => p.family_member_id === memberId)
      return mp ? mp.total_points - mp.redeemed_points : 0
    }
    return 0
  }

  /** @deprecated use getAvailableBalance(memberId, 'stars') */
  function getAvailablePoints(memberId: number): number {
    return getAvailableBalance(memberId, 'stars')
  }

  function getRewardsForMember(memberId: number): Reward[] {
    return rewards
      .filter((r) => r.reward_assignments.some((a) => a.family_member_id === memberId))
      .sort((a, b) => a.cost - b.cost)
  }

  function canAfford(memberId: number, reward: Reward): boolean {
    return getAvailableBalance(memberId, reward.currency_type || 'stars') >= reward.cost
  }

  async function handleRedeemReward(rewardId: number, memberId: number) {
    const reward = rewards.find((r) => r.id === rewardId)
    if (!reward) return

    const currencyType = reward.currency_type || 'stars'
    const available = getAvailableBalance(memberId, currencyType)

    if (available < reward.cost) {
      const member = familyMembers.find((m) => m.id === memberId)
      const meta = CURRENCY_META[currencyType]
      onShowToast(
        `${member?.name || 'Member'} needs ${reward.cost - available} more ${meta?.icon ?? currencyType} for this reward!`,
        'error'
      )
      return
    }

    // Insert redemption record
    const { error: redeemError } = await supabase
      .from('reward_redemptions')
      .insert({
        reward_id: rewardId,
        family_member_id: memberId,
        points_spent: reward.cost,
        currency_type: currencyType,
      })

    if (redeemError) {
      console.error('Error redeeming reward:', redeemError)
      onShowToast('Failed to redeem reward', 'error')
      return
    }

    // Deduct from member_currency_balances
    const bal = memberBalances.find(
      (b) => b.family_member_id === memberId && b.currency_type === currencyType
    )
    if (bal) {
      await supabase
        .from('member_currency_balances')
        .update({ redeemed_amount: bal.redeemed_amount + reward.cost, updated_at: new Date().toISOString() })
        .eq('family_member_id', memberId)
        .eq('currency_type', currencyType)
    }

    // Update legacy member_points for stars compatibility
    if (currencyType === 'stars') {
      const currentPoints = memberPoints.find((p) => p.family_member_id === memberId)
      if (currentPoints) {
        await supabase
          .from('member_points')
          .update({ redeemed_points: currentPoints.redeemed_points + reward.cost })
          .eq('family_member_id', memberId)
      }
    }

    // One-off reward handling
    if (reward.reward_type === 'one_off') {
      const assignedIds = reward.reward_assignments.map((a) => a.family_member_id)
      if (assignedIds.length === 1) {
        await supabase.from('rewards').update({ is_active: false }).eq('id', rewardId)
      } else {
        await supabase
          .from('reward_assignments')
          .delete()
          .eq('reward_id', rewardId)
          .eq('family_member_id', memberId)

        const remaining = assignedIds.filter((id) => id !== memberId)
        if (remaining.length === 0) {
          await supabase.from('rewards').update({ is_active: false }).eq('id', rewardId)
        }
      }
    }

    const member = familyMembers.find((m) => m.id === memberId)
    const meta = CURRENCY_META[currencyType]
    fireFireworks()
    onShowToast(
      `🎉 ${member?.name} redeemed "${reward.title}" for ${reward.cost}${meta?.icon ?? currencyType}!`,
      'success'
    )
    setConfirmRedeem(null)

    await loadRewards()
    await loadMemberBalances()
    await loadMemberPoints()
    await loadHistory()
  }

  async function handleAddReward(
    title: string,
    description: string,
    cost: number,
    rewardType: 'reusable' | 'one_off',
    currencyType: string,
    assignedMemberIds: number[]
  ) {
    if (!user) return

    const { data: newReward, error } = await supabase
      .from('rewards')
      .insert({
        user_id: user.id,
        title,
        description: description || null,
        cost,
        reward_type: rewardType,
        currency_type: currencyType || 'stars',
      })
      .select()
      .single()

    if (error || !newReward) {
      console.error('Error adding reward:', error)
      onShowToast('Failed to add reward', 'error')
      return
    }

    if (assignedMemberIds.length > 0) {
      const assignments = assignedMemberIds.map((memberId) => ({
        reward_id: newReward.id,
        family_member_id: memberId,
      }))
      await supabase.from('reward_assignments').insert(assignments)
    }

    onShowToast(`Reward "${title}" added!`, 'success')
    await loadRewards()
  }

  async function handleUpdateReward(
    id: number,
    title: string,
    description: string,
    cost: number,
    rewardType: 'reusable' | 'one_off',
    currencyType: string,
    assignedMemberIds: number[]
  ) {
    const { error } = await supabase
      .from('rewards')
      .update({ title, description: description || null, cost, reward_type: rewardType, currency_type: currencyType || 'stars' })
      .eq('id', id)

    if (error) {
      console.error('Error updating reward:', error)
      onShowToast('Failed to update reward', 'error')
      return
    }

    await supabase.from('reward_assignments').delete().eq('reward_id', id)

    if (assignedMemberIds.length > 0) {
      const assignments = assignedMemberIds.map((memberId) => ({
        reward_id: id,
        family_member_id: memberId,
      }))
      await supabase.from('reward_assignments').insert(assignments)
    }

    onShowToast(`Reward "${title}" updated!`, 'success')
    await loadRewards()
  }

  async function handleDeleteReward(id: number) {
    await supabase.from('reward_assignments').delete().eq('reward_id', id)
    await supabase.from('reward_redemptions').delete().eq('reward_id', id)
    const { error } = await supabase.from('rewards').delete().eq('id', id)

    if (error) {
      console.error('Error deleting reward:', error)
      onShowToast('Failed to delete reward', 'error')
      return
    }

    onShowToast('Reward deleted', 'success')
    await loadRewards()
  }

  function handleEditReward(reward: Reward) {
    setEditingReward({
      id: reward.id,
      title: reward.title,
      description: reward.description || '',
      cost: reward.cost,
      reward_type: reward.reward_type,
      currency_type: reward.currency_type || 'stars',
      assigned_member_ids: reward.reward_assignments.map((a) => a.family_member_id),
    })
    setIsModalOpen(true)
  }

  function fireFireworks() {
    const end = Date.now() + 1300
    const interval = setInterval(() => {
      if (Date.now() > end) { clearInterval(interval); return }
      confetti({
        particleCount: 50,
        spread: 360,
        startVelocity: 30,
        origin: { x: Math.random(), y: Math.random() * 0.6 },
        ticks: 80,
        gravity: 0.8,
        colors: ['#FFD700', '#FFA500', '#FF69B4', '#00CED1', '#7B68EE'],
      })
    }, 220)
  }

  function handleCloseModal() {
    setIsModalOpen(false)
    setEditingReward(null)
  }

  if (loading) {
    return (
      <SectionCard className="p-8 h-full flex items-center justify-center">
        <div className="text-white/70 text-lg">Loading rewards...</div>
      </SectionCard>
    )
  }

  return (
    <>
      <SectionCard className="h-full flex flex-col">
        {/* Header */}
        <div className="px-4 md:px-6 pt-4 md:pt-6 pb-4 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-white drop-shadow-lg">{sectionTitle || '🏆 Rewards'}</h2>
          <div className="flex items-center gap-2 md:gap-3">
            {/* Subview toggle */}
            <PillToggle
              items={[
                { value: 'rewards', label: '🎁 Rewards' },
                { value: 'history', label: '📜 History' },
              ]}
              value={subView}
              onChange={setSubView}
              size="sm"
            />
            <IconButton
              onClick={() => {
                setEditingReward(null)
                setIsModalOpen(true)
              }}
              title="Add Reward"
            />
          </div>
        </div>

        {/* Columns */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          {subView === 'history' ? (
            // ── History View ──────────────────────────────────────
            familyMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="text-6xl mb-4">📜</div>
                <p className="text-white/50">No family members yet.</p>
              </div>
            ) : (
              <div className="flex h-full min-w-0">
                {familyMembers.map((member) => {
                  const memberHistory = redemptionHistory.filter(
                    (r) => r.family_member_id === member.id
                  )
                  return (
                    <div
                      key={member.id}
                      className="flex-1 min-w-[220px] max-w-[360px] flex flex-col border-r border-white/10 last:border-r-0"
                    >
                      {/* Member header */}
                      <div className="px-4 pt-4 pb-3 flex-shrink-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg"
                            style={{ backgroundColor: member.color, border: `3px solid ${member.color}80` }}
                          >
                            {member.avatar_url ? (
                              <img src={`/avatars/${member.avatar_url}`} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white text-lg font-bold">{member.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-white font-bold text-lg truncate drop-shadow-md">{member.name}</h3>
                            <p className="text-white/40 text-xs">
                              {memberHistory.length} redemption{memberHistory.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                      {/* History list */}
                      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2 view-scroll">
                        {memberHistory.length === 0 ? (
                          <div className="text-center text-white/30 text-sm py-8">No redemptions yet</div>
                        ) : (
                          memberHistory.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-xl px-3 py-2.5 bg-white/5 border border-white/10"
                            >
                              <p className="text-white/90 text-[13px] font-semibold leading-snug">
                                {item.rewards?.title ?? 'Unknown reward'}
                              </p>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-yellow-400/80 text-[11px] font-bold">
                                  {CURRENCY_META[item.rewards?.currency_type || 'stars']?.icon ?? '⭐'} {item.points_spent}
                                </span>
                                <span className="text-white/35 text-[10px]">
                                  {new Date(item.redeemed_at).toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric', year: 'numeric',
                                  })}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            // ── Rewards View ──────────────────────────────────────
            familyMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-xl font-semibold text-white/80 mb-2">No family members yet</h3>
                <p className="text-white/50">Add family members first, then create rewards.</p>
              </div>
            ) : rewards.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="text-6xl mb-4">🎁</div>
                <h3 className="text-xl font-semibold text-white/80 mb-2">No rewards yet!</h3>
                <p className="text-white/50 mb-6 max-w-sm">
                  Create rewards that family members can redeem with their earned stars.
                </p>
                <GlassButton
                  size="xl"
                  onClick={() => {
                    setEditingReward(null)
                    setIsModalOpen(true)
                  }}
                >
                  + Create First Reward
                </GlassButton>
              </div>
            ) : (
              <div className="flex h-full min-w-0">
                {familyMembers.map((member) => {
                  const memberRewards = getRewardsForMember(member.id)

                  const reusableRewards = memberRewards.filter((r) => r.reward_type === 'reusable')
                  const oneOffRewards = memberRewards.filter((r) => r.reward_type === 'one_off')

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
                            <div className="flex items-center gap-2 flex-wrap">
                              {Object.entries(CURRENCY_META).map(([ct, meta]) => {
                                const bal = getAvailableBalance(member.id, ct)
                                if (bal <= 0) return null
                                return (
                                  <span key={ct} className="text-white/80 text-xs font-bold">
                                    {meta.icon} {bal}
                                  </span>
                                )
                              })}
                              {Object.keys(CURRENCY_META).every((ct) => getAvailableBalance(member.id, ct) === 0) && (
                                <span className="text-white/40 text-xs">No balance yet</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Scrollable Reward Tiles */}
                      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2 no-scroll">
                        {memberRewards.length === 0 ? (
                          <div className="text-center text-white/30 text-sm py-8">
                            No rewards available
                          </div>
                        ) : (
                          <>
                            {/* Reusable Rewards */}
                            {reusableRewards.length > 0 && (
                              <>
                                <div className="text-[10px] font-bold text-white/35 uppercase tracking-[0.15em] px-1 pt-1 pb-0.5">
                                  Rewards
                                </div>
                                {reusableRewards.map((reward) => (
                                  <RewardTile
                                    key={reward.id}
                                    reward={reward}
                                    member={member}
                                    canAfford={canAfford(member.id, reward)}
                                    isConfirming={confirmRedeem?.rewardId === reward.id && confirmRedeem?.memberId === member.id}
                                    onRedeem={() => {
                                      if (confirmRedeem?.rewardId === reward.id && confirmRedeem?.memberId === member.id) {
                                        handleRedeemReward(reward.id, member.id)
                                      } else {
                                        setConfirmRedeem({ rewardId: reward.id, memberId: member.id })
                                      }
                                    }}
                                    onCancelConfirm={() => setConfirmRedeem(null)}
                                    onEdit={() => handleEditReward(reward)}
                                  />
                                ))}
                              </>
                            )}

                            {/* One-Off Rewards */}
                            {oneOffRewards.length > 0 && (
                              <>
                                <div className="text-[10px] font-bold text-white/35 uppercase tracking-[0.15em] px-1 pt-2 pb-0.5">
                                  Special
                                </div>
                                {oneOffRewards.map((reward) => (
                                  <RewardTile
                                    key={reward.id}
                                    reward={reward}
                                    member={member}
                                    canAfford={canAfford(member.id, reward)}
                                    isConfirming={confirmRedeem?.rewardId === reward.id && confirmRedeem?.memberId === member.id}
                                    onRedeem={() => {
                                      if (confirmRedeem?.rewardId === reward.id && confirmRedeem?.memberId === member.id) {
                                        handleRedeemReward(reward.id, member.id)
                                      } else {
                                        setConfirmRedeem({ rewardId: reward.id, memberId: member.id })
                                      }
                                    }}
                                    onCancelConfirm={() => setConfirmRedeem(null)}
                                    onEdit={() => handleEditReward(reward)}
                                  />
                                ))}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>
      </SectionCard>

      <AddRewardModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onAddReward={handleAddReward}
        onUpdateReward={handleUpdateReward}
        onDeleteReward={handleDeleteReward}
        editReward={editingReward}
        familyMembers={familyMembers}
      />
    </>
  )
}

/* ── Reward Tile Component ── */

function RewardTile({
  reward,
  member,
  canAfford,
  isConfirming,
  onRedeem,
  onCancelConfirm,
  onEdit,
}: {
  reward: Reward
  member: FamilyMember
  canAfford: boolean
  isConfirming: boolean
  onRedeem: () => void
  onCancelConfirm: () => void
  onEdit: () => void
}) {
  return (
    <div
      className={`rounded-2xl px-4 py-3.5 transition-all duration-200 cursor-pointer group ${
        !canAfford ? 'opacity-40' : ''
      }`}
      style={{
        backgroundColor: canAfford
          ? `${member.color}18`
          : `${member.color}08`,
        border: `1px solid ${member.color}${canAfford ? '22' : '10'}`,
      }}
      onClick={onEdit}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[13px] leading-snug text-white/90">
            {reward.title}
          </p>
          {reward.description && (
            <p className="text-[11px] mt-0.5 text-white/45">
              {reward.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[12px] font-bold ${canAfford ? 'text-yellow-400/80' : 'text-red-400/60'}`}>
              {CURRENCY_META[reward.currency_type || 'stars']?.icon ?? '⭐'} {reward.cost}
            </span>
            {reward.reward_type === 'one_off' && (
              <span className="text-[9px] bg-amber-500/25 text-amber-300/80 px-1.5 py-0.5 rounded-full border border-amber-400/20">
                ONE-TIME
              </span>
            )}
          </div>
        </div>

        {/* Redeem Button */}
        {isConfirming ? (
          <div className="flex flex-col gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onRedeem}
              className="px-3 py-1.5 bg-green-500/40 hover:bg-green-500/60 text-green-200 text-[11px] font-bold rounded-lg border border-green-400/40 transition-all duration-150"
            >
              Confirm
            </button>
            <button
              onClick={onCancelConfirm}
              className="px-3 py-1 text-white/40 text-[10px] hover:text-white/70 transition-all"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (canAfford) onRedeem()
            }}
            disabled={!canAfford}
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
              canAfford
                ? 'border-yellow-400/50 bg-yellow-500/20 hover:bg-yellow-500/40 hover:scale-110 hover:border-yellow-400'
                : 'border-white/15 bg-white/5 cursor-not-allowed'
            }`}
            title={canAfford ? 'Redeem reward' : 'Not enough stars'}
          >
            <span className={`text-sm ${canAfford ? 'text-yellow-300' : 'text-white/20'}`}>🎁</span>
          </button>
        )}
      </div>
    </div>
  )
}
