import { LayoutGrid, Users, ChefHat, Package, ChartNoAxesCombined, Settings, Image, Box } from 'lucide-react'
import HudButton from './HudButton'

type Props = {
  active: string | null
  admin: boolean
  reference: boolean
  onNavigate: (panel: 'tables' | 'waiters' | 'metrics' | 'build' | null) => void
  onToggleReference: () => void
}

export default function SalonSidebar({ active, admin, reference, onNavigate, onToggleReference }: Props) {
  return <aside className="salon-sidebar" aria-label="Navegación principal">
    <a className="simrest-brand" href="#salon" onClick={() => onNavigate(null)}>SIMREST</a>
    <nav>
      <HudButton icon={LayoutGrid} label="Salón" active={!active || active === 'tables'} onClick={() => onNavigate('tables')} />
      <HudButton icon={Users} label="Personal" active={active === 'waiters'} onClick={() => onNavigate('waiters')} />
      <HudButton icon={ChefHat} label="Cocina · pronto" disabled />
      <HudButton icon={Package} label="Stock · pronto" disabled />
      <HudButton icon={ChartNoAxesCombined} label="Métricas" active={active === 'metrics'} onClick={() => onNavigate('metrics')} />
      {admin && <HudButton icon={Settings} label="Configuración" active={active === 'build'} onClick={() => onNavigate('build')} />}
    </nav>
    <div className="sidebar-foot">
      <HudButton icon={reference ? Box : Image} label={reference ? 'Volver al salón 3D' : 'Referencia visual'} active={reference} onClick={onToggleReference} />
      <p>Sesión local de demostración</p>
    </div>
  </aside>
}
