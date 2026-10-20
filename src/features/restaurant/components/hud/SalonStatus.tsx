export default function SalonStatus({ occupied, total, now }: { occupied: number; total: number; now: number }) {
  return <div className="salon-status" aria-label="Estado del salón">
    <span><img src="/figma/occupied.svg" alt="" /><strong>{occupied}</strong> Ocupadas</span>
    <span><img src="/figma/free.svg" alt="" /><strong>{total - occupied}</strong> Libres</span>
    <span><img src="/figma/clock.svg" alt="" /><time>{new Date(now).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</time></span>
  </div>
}
