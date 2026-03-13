import AvatarBadge from './AvatarBadge'

interface FamilyMember {
  id: number
  name: string
  color: string
  role?: string | null
  avatar_url?: string | null
}

interface AvatarFilterGroupProps {
  members: FamilyMember[]
  visibleMembers: Set<number>
  onToggle: (memberId: number) => void
  showUnassigned: boolean
  onToggleUnassigned: (show: boolean) => void
}

/**
 * Row of clickable avatar circles for filtering events/tasks by family member,
 * plus the "?" unassigned toggle at the end.
 */
export default function AvatarFilterGroup({
  members,
  visibleMembers,
  onToggle,
  showUnassigned,
  onToggleUnassigned,
}: AvatarFilterGroupProps) {
  return (
    <div className="flex items-center gap-2 avatar-background">
      {members.map((member) => {
        const isVisible = visibleMembers.has(member.id)
        return (
          <AvatarBadge
            key={member.id}
            name={member.name}
            color={member.color}
            avatarUrl={member.avatar_url}
            active={isVisible}
            onClick={() => onToggle(member.id)}
            size="md"
          />
        )
      })}

      {/* Unassigned toggle */}
      <button
        onClick={() => onToggleUnassigned(!showUnassigned)}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 border-2 shadow-md ${
          showUnassigned
            ? 'border-white/50 bg-gray-600/80'
            : 'border-white/20 bg-gray-600/40 opacity-50'
        }`}
        title="Unassigned Events"
      >
        <span className="text-white text-xs font-bold">?</span>
      </button>
    </div>
  )
}
