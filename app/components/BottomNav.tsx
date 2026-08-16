'use client'

type View = 'home' | 'calendar' | 'recipes' | 'tasks' | 'maintenance'

interface BottomNavProps {
  currentView: View
  setCurrentView: (view: View) => void
  onSettingsClick: () => void
}

const tabs: { icon: string; label: string; view: View }[] = [
  { icon: '🏠', label: 'Home', view: 'home' },
  { icon: '📅', label: 'Calendar', view: 'calendar' },
  { icon: '📖', label: 'Recipes', view: 'recipes' },
  { icon: '✅', label: 'Tasks', view: 'tasks' },
  { icon: '🔧', label: 'Upkeep', view: 'maintenance' },
]

export default function BottomNav({ currentView, setCurrentView, onSettingsClick }: BottomNavProps) {
  return (
    <nav
      className="
        md:hidden fixed bottom-0 left-0 right-0 z-40
        flex items-stretch
        bg-black/60 backdrop-blur-xl border-t border-white/15
        pb-[env(safe-area-inset-bottom)]
      "
      style={{ minHeight: 56 }}
    >
      {tabs.map(({ icon, label, view }) => (
        <button
          key={view}
          onClick={() => setCurrentView(view)}
          className={`
            relative flex-1 flex flex-col items-center justify-center gap-0.5
            py-2 px-1 min-h-[56px]
            transition-all duration-150
            ${currentView === view
              ? 'text-white'
              : 'text-white/50 active:text-white/80'
            }
          `}
          aria-label={label}
          aria-current={currentView === view ? 'page' : undefined}
        >
          <span className={`text-xl leading-none transition-transform duration-150 ${currentView === view ? 'scale-110' : ''}`}>
            {icon}
          </span>
          <span className={`text-[10px] font-medium transition-all duration-150 ${currentView === view ? 'opacity-100' : 'opacity-60'}`}>
            {label}
          </span>
          {currentView === view && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-white/70" />
          )}
        </button>
      ))}
      {/* Settings tab on far right */}
      <button
        onClick={onSettingsClick}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 min-h-[56px] text-white/50 active:text-white/80 transition-all duration-150"
        aria-label="Settings"
      >
        <span className="text-xl leading-none">⚙️</span>
        <span className="text-[10px] font-medium opacity-60">Settings</span>
      </button>
    </nav>
  )
}
