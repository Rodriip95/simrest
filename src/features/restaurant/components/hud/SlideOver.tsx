import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { X } from 'lucide-react'
import { useSessionStore } from '../../state/useSessionStore'

type SlideOverProps = {
  open: boolean
  side?: 'left' | 'right'
  title: string
  icon: LucideIcon
  onClose: () => void
  children: ReactNode
}

export default function SlideOver({ open, side = 'right', title, icon: Icon, onClose, children }: SlideOverProps) {
  const heading = useRef<HTMLHeadingElement>(null)
  const moving = useSessionStore(state => !!state.transient.movePreview)

  useEffect(() => {
    if (open) heading.current?.focus({ preventScroll: true })
  }, [open])

  return (
    <aside className={`slide-over is-${side}${open ? ' is-open' : ''}`} role="dialog" aria-label={title}
      aria-hidden={!open} inert={!open}
      onKeyDown={event => {
        if (event.key !== 'Escape') return
        // Con una edición de movimiento en curso, Escape la cancela antes que cerrar el panel.
        if (moving) return
        event.preventDefault()
        onClose()
      }}>
      <header className="slide-head">
        <span className="slide-icon" aria-hidden="true"><Icon size={16} /></span>
        <h2 ref={heading} tabIndex={-1}>{title}</h2>
        <button type="button" className="slide-close" aria-label={`Cerrar ${title}`} onClick={onClose}>
          <X size={16} strokeWidth={2.4} />
        </button>
      </header>
      <div className="slide-body">{children}</div>
    </aside>
  )
}
