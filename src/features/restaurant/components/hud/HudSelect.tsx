type HudSelectOption = { value: string; label: string; disabled?: boolean }

type HudSelectProps = {
  id: string
  label: string
  value: string
  options: HudSelectOption[]
  onChange: (value: string) => void
  describedBy?: string
}

export default function HudSelect({ id, label, value, options, onChange, describedBy }: HudSelectProps) {
  return (
    <label className="hud-select" htmlFor={id}>
      <span className="hud-select-label">{label}</span>
      <span className="hud-select-field">
        <select id={id} value={value} aria-describedby={describedBy} onChange={event => onChange(event.target.value)}>
          {options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
        </select>
      </span>
    </label>
  )
}
