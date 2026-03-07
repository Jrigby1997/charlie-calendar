'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/contexts/AuthContext'
import AddRewardModal from './AddRewardModal'
import confetti from 'canvas-confetti'

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

type RedemptionHistory = {
  id: number
  reward_id: number
  family_member_id: number
  points_spent: number
  redeemed_at: string
  rewards: { title: string } | null
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

    return () => {
      supabase.removeChannel(rewardsChannel)
      supabase.removeChannel(assignmentsChannel)
      supabase.removeChannel(redemptionsChannel)
      supabase.removeChannel(pointsChannel)
    }
  }, [user])

  async function loadAllData() {
    setLoading(true)
    await Promise.all([loadRewards(), loadMemberPoints(), loadHistory()])
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

  function getAvailablePoints(memberId: number): number {
    const mp = memberPoints.find((p) => p.family_member_id === memberId)
    return mp ? mp.total_points - mp.redeemed_points : 0
  }

  function getRewardsForMember(memberId: number): Reward[] {
    return rewards
      .filter((r) => r.reward_assignments.some((a) => a.family_member_id === memberId))
      .sort((a, b) => a.cost - b.cost)
  }

  function canAfford(memberId: number, cost: number): boolean {
    return getAvailablePoints(memberId) >= cost
  }

  async function handleRedeemReward(rewardId: number, memberId: number) {
    const reward = rewards.find((r) => r.id === rewardId)
    if (!reward) return

    const available = getAvailablePoints(memberId)
    if (available < reward.cost) {
      const member = familyMembers.find((m) => m.id === memberId)
      onShowToast(`${member?.name || 'Member'} needs ${reward.cost - available} more ⭐ for this reward!`, 'error')
      return
    }

    // Insert redemption record
    const { error: redeemError } = await supabase
      .from('reward_redemptions')
      .insert({
        reward_id: rewardId,
        family_member_id: memberId,
        points_spent: reward.cost,
      })

    if (redeemError) {
      console.error('Error redeeming reward:', redeemError)
      onShowToast('Failed to redeem reward', 'error')
      return
    }

    // Update member points (increment redeemed_points)
    const currentPoints = memberPoints.find((p) => p.family_member_id === memberId)
    if (currentPoints) {
      await supabase
        .from('member_points')
        .update({ redeemed_points: currentPoints.redeemed_points + reward.cost })
        .eq('family_member_id', memberId)
    }

    // One-off reward: deactivate after redemption for this member
    if (reward.reward_type === 'one_off') {
      // Check if all assigned members have now redeemed
      const assignedIds = reward.reward_assignments.map((a) => a.family_member_id)
      // For one-off, deactivate for this member by removing their assignment
      // If only one member was assigned or all have redeemed, deactivate the reward entirely
      if (assignedIds.length === 1) {
        await supabase.from('rewards').update({ is_active: false }).eq('id', rewardId)
      } else {
        // Remove this member's assignment so they can't redeem again
        await supabase
          .from('reward_assignments')
          .delete()
          .eq('reward_id', rewardId)
          .eq('family_member_id', memberId)

        // Check if any assignments remain
        const remaining = assignedIds.filter((id) => id !== memberId)
        if (remaining.length === 0) {
          await supabase.from('rewards').update({ is_active: false }).eq('id', rewardId)
        }
      }
    }

    const member = familyMembers.find((m) => m.id === memberId)
    fireFireworks()
    onShowToast(`🎉 ${member?.name} redeemed "${reward.title}" for ${reward.cost}⭐!`, 'success')
    setConfirmRedeem(null)

    await loadRewards()
    await loadMemberPoints()
  }

  async function handleAddReward(
    title: string,
    description: string,
    cost: number,
    rewardType: 'reusable' | 'one_off',
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
    assignedMemberIds: number[]
  ) {
    const { error } = await supabase
      .from('rewards')
      .update({ title, description: description || null, cost, reward_type: rewardType })
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
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 h-full flex items-center justify-center">
        <div className="text-white/70 text-lg">Loading rewards...</div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 h-full flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.3)]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-2xl font-bold text-white drop-shadow-lg">{sectionTitle || '🏆 Rewards'}</h2>
          <div className="flex items-center gap-3">
            {/* Subview toggle */}
            <div className="flex bg-white/10 border border-white/20 rounded-xl p-1 gap-1">
              <button
                onClick={() => setSubView('rewards')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                  subView === 'rewards' ? 'bg-white/25 text-white shadow-sm' : 'text-white/50 hover:text-white/80 hover:bg-white/10'
                }`}
              >🎁 Rewards</button>
              <button
                onClick={() => setSubView('history')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                  subView === 'history' ? 'bg-white/25 text-white shadow-sm' : 'text-white/50 hover:text-white/80 hover:bg-white/10'
                }`}
              >📜 History</button>
            </div>
            <button
              onClick={() => {
                setEditingReward(null)
                setIsModalOpen(true)
              }}
              className="w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full transition-all duration-200 border border-white/30 hover:scale-110 flex items-center justify-center text-2xl font-light shadow-lg"
              title="Add Reward"
            >
              +
            </button>
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
                                <span className="text-yellow-400/80 text-[11px] font-bold">⭐ {item.points_spent}</span>
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
                <button
                  onClick={() => {
                    setEditingReward(null)
                    setIsModalOpen(true)
                  }}
                  className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all duration-200 border border-white/30 font-medium"
                >
                  + Create First Reward
                </button>
              </div>
            ) : (
              <div className="flex h-full min-w-0">
                {familyMembers.map((member) => {
                  const memberRewards = getRewardsForMember(member.id)
                  const available = getAvailablePoints(member.id)

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
                            <div className="flex items-center gap-2">
                              <span className="text-yellow-400 text-sm font-bold">
                                ⭐ {available}
                              </span>
                              <span className="text-white/40 text-xs">to spend</span>
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
                                    canAfford={canAfford(member.id, reward.cost)}
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
                                    canAfford={canAfford(member.id, reward.cost)}
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
      </div>

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
              ⭐ {reward.cost}
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
