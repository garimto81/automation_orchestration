import { clsx } from 'clsx'

interface ProgressBarProps {
  value: number
  size?: 'sm' | 'md'
  showLabel?: boolean
  className?: string
}

export function ProgressBar({ value, size = 'md', showLabel = false, className }: ProgressBarProps) {
  return (
    <div className={clsx('w-full', className)}>
      <div
        className={clsx(
          'w-full bg-progress-empty',
          size === 'sm' ? 'h-1.5' : 'h-2'
        )}
      >
        <div
          className="h-full bg-progress-fill transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[10px] text-secondary mt-1">{value}%</span>
      )}
    </div>
  )
}
