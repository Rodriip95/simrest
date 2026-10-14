import type { LucideIcon } from 'lucide-react'

type HudButtonProps = {
  icon: LucideIcon
  label: string
  onClick?: () => void
  active?: boolean
  current?: boolean
  disabled?: boolean
  tone?: 'default' | 'accent' | 'danger'
  badge?: string | number
  iconOnly?: boolean
}

export default function HudButton({ icon: Icon, label, onClick, active, current, disabled, tone = 'default', badge, iconOnly }: HudButtonProps) {
  const classes = ['hud-btn']
  if (iconOnly) classes.push('hud-btn-icon')
  if (active) classes.push('is-active')
  if (tone !== 'default') classes.push(`is-${tone}`)

  return (
    <button type="button" className={classes.join(' ')} onClick={onClick} disabled={disabled}
      title={iconOnly ? label : undefined} aria-label={iconOnly ? label : undefined}
      aria-pressed={active} aria-current={current ? 'page' : undefined}>
      <Icon size={iconOnly ? 18 : 15} strokeWidth={2} aria-hidden="true" />
      {!iconOnly && <span>{label}</span>}
      {badge !== undefined && <em className="hud-badge">{badge}</em>}
    </button>
  )
}
