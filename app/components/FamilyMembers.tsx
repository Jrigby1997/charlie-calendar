'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/contexts/AuthContext'
import AddFamilyMemberModal from './AddFamilyMemberModal'

type FamilyMember = {
  id: number
  name: string
  color: string
  role: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
}

export default function FamilyMembers() {
  const { user } = useAuth()
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null)

  useEffect(() => {
    loadMembers()

    // Subscribe to realtime changes
    const channel = supabase
      .channel('family-members-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'family_members' },
        () => {
          loadMembers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadMembers() {
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading family members:', error)
    } else {
      setMembers(data || [])
    }
  }

  async function addMember(name: string, color: string, role: string, avatarStyle: string) {
    if (!user) {
      console.error('No user logged in')
      return
    }

    const { error } = await supabase
      .from('family_members')
      .insert([
        {
          name,
          color,
          role: role || null,
          avatar_url: avatarStyle,
          user_id: user.id
        }
      ])

    if (error) {
      console.error('Error adding family member:', error)
    }
  }

  async function updateMember(id: number, name: string, color: string, role: string, avatarStyle: string) {
    const { error } = await supabase
      .from('family_members')
      .update({
        name,
        color,
        role: role || null,
        avatar_url: avatarStyle
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating family member:', error)
    }
  }

  function handleMemberClick(member: FamilyMember) {
    setEditingMember(member)
    setIsModalOpen(true)
  }

  function handleCloseModal() {
    setIsModalOpen(false)
    setEditingMember(null)
  }

  async function toggleActive(id: number, currentState: boolean) {
    const { error } = await supabase
      .from('family_members')
      .update({ is_active: !currentState })
      .eq('id', id)

    if (error) {
      console.error('Error toggling member:', error)
    }
  }

  return (
    <>
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.3)]">
        <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-6">Family Members</h2>

        {/* Members List */}
        {members.length === 0 ? (
          <p className="text-white/70 text-center py-8">
            No family members yet. Click "Add Member" to get started!
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {members.map((member) => (
              <div
                key={member.id}
                onClick={() => handleMemberClick(member)}
                className="rounded-xl p-4 hover:shadow-xl transition-all duration-200 flex items-center gap-4 backdrop-blur-sm border-2 border-white/30 shadow-lg hover:scale-105 cursor-pointer"
                style={{
                  background: `linear-gradient(135deg, ${member.color}dd, ${member.color})`,
                  borderColor: `${member.color}40`
                }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg border-4 border-white/30"
                  style={{ backgroundColor: member.color }}
                >
                  {member.avatar_url ? (
                    <img
                      src={`https://api.dicebear.com/7.x/${member.avatar_url}/svg?seed=${encodeURIComponent(member.name)}`}
                      alt={member.name}
                      className="w-full h-full"
                    />
                  ) : (
                    <span className="text-white text-xl font-bold">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white truncate text-lg drop-shadow-md">{member.name}</h3>
                  {member.role && (
                    <p className="text-sm text-white/90 truncate drop-shadow">{member.role}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Member Button - Subtle, at bottom */}
        <button
          onClick={() => {
            setEditingMember(null)
            setIsModalOpen(true)
          }}
          className="w-full mt-4 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 text-sm py-2 px-4 rounded-xl transition-all duration-200 border border-white/10"
        >
          + Add Member
        </button>
      </div>

      <AddFamilyMemberModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onAddMember={addMember}
        onUpdateMember={updateMember}
        editMember={editingMember}
      />
    </>
  )
}
