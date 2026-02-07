'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3B82F6')
  const [role, setRole] = useState('')
  const [isAdding, setIsAdding] = useState(false)

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

  async function addMember(e: React.FormEvent) {
    e.preventDefault()

    const { error } = await supabase
      .from('family_members')
      .insert([
        {
          name,
          color,
          role: role || null
        }
      ])

    if (error) {
      console.error('Error adding family member:', error)
    } else {
      // Clear form
      setName('')
      setColor('#3B82F6')
      setRole('')
      setIsAdding(false)
    }
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
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.3)]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white drop-shadow-lg">Family Members</h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-white/20 backdrop-blur-lg hover:bg-white/30 text-white font-semibold py-2.5 px-5 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 border border-white/30"
          >
            + Add Member
          </button>
        )}
      </div>

      {/* Add Member Form */}
      {isAdding && (
        <form onSubmit={addMember} className="mb-6 p-5 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/30 shadow-xl">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
                placeholder="Dad, Mom, Emma..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-1">
                Color *
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-16 border border-white/30 rounded-lg cursor-pointer shadow-md hover:shadow-lg transition-all duration-200 bg-white/10"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-1">
                Role
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
                placeholder="Parent, Child, Teen..."
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="bg-white/20 backdrop-blur-lg hover:bg-white/30 text-white font-semibold py-2.5 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 border border-white/30"
            >
              Add Member
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="bg-white/10 backdrop-blur-lg hover:bg-white/20 text-white font-semibold py-2.5 px-6 rounded-xl transition-all duration-200 border border-white/20 hover:scale-105"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Members List */}
      {members.length === 0 ? (
        <p className="text-white/70 text-center py-8">
          No family members yet. Add your first member above!
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="rounded-xl p-4 hover:shadow-xl transition-all duration-200 flex items-center gap-4 backdrop-blur-sm border-2 border-white/30 shadow-lg hover:scale-105 cursor-pointer"
              style={{
                background: `linear-gradient(135deg, ${member.color}dd, ${member.color})`,
                borderColor: `${member.color}40`
              }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-lg border-4 border-white/30"
                style={{ backgroundColor: member.color }}
              >
                {member.name.charAt(0).toUpperCase()}
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
    </div>
  )
}
