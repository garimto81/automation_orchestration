import { clsx } from 'clsx'

interface StatusDotProps {
  active?: boolean
  selected?: boolean
  className?: string
}

export function StatusDot({ active = false, selected = false, className }: StatusDotProps) {
  return (
    <span
      className={clsx(
        'inline-block w-2 h-2 rounded-full border border-primary',
        active && 'bg-primary',
        selected && 'ring-2 ring-white ring-offset-1 ring-offset-primary',
        className
      )}
    />
  )
}
