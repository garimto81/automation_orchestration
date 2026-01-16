import { useUIStore, type ViewMode } from '@/stores'
import { clsx } from 'clsx'

interface HeaderProps {
  onRefresh?: () => void
}

export function Header({ onRefresh }: HeaderProps) {
  const { viewMode, setViewMode } = useUIStore()

  const viewModes: { mode: ViewMode; label: string }[] = [
    { mode: 'modules', label: 'Modules' },
    { mode: 'layers', label: 'Layers' },
    { mode: 'combined', label: 'Combined' },
  ]

  return (
    <header className="h-12 border-b border-primary px-5 flex items-center justify-between">
      <span className="text-sm font-semibold tracking-wide">
        AUTOMATION PROJECTS OVERVIEW
      </span>

      {/* View Mode Switcher */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1 border border-gray-300 rounded">
          {viewModes.map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={clsx(
                'px-2 py-1 text-[10px] transition-colors',
                viewMode === mode
                  ? 'bg-primary text-white'
                  : 'hover:bg-gray-100'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-4 text-[11px]">
          <span className="cursor-pointer">[&#9675; Connected]</span>
          <span className="cursor-pointer hover:underline" onClick={onRefresh}>
            [&#8635; Refresh]
          </span>
        </div>
      </div>
    </header>
  )
}
