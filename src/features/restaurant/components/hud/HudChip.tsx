import type { LucideIcon } from 'lucide-react'

type HudChipProps = {
  icon: LucideIcon
  label: string
  value: string | number
}

export default function HudChip({ icon: Icon, label, value }: HudChipProps) {
  return (
    <div className="hud-chip">
      <Icon size={14} strokeWidth={2} aria-hidden="true" />
      <span><small>{label}</small><strong>{value}</strong></span>
    </div>
  )
}
