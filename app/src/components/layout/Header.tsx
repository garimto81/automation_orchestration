interface HeaderProps {
  onRefresh?: () => void
}

export function Header({ onRefresh }: HeaderProps) {
  return (
    <header className="h-12 border-b border-primary px-5 flex items-center justify-between">
      <span className="text-sm font-semibold tracking-wide">
        AUTOMATION PROJECTS OVERVIEW
      </span>
      <div className="flex gap-4 text-[11px]">
        <span className="cursor-pointer">[&#9675; Connected]</span>
        <span className="cursor-pointer hover:underline" onClick={onRefresh}>
          [&#8635; Refresh]
        </span>
      </div>
    </header>
  )
}
