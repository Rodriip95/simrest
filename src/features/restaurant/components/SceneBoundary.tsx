import { Component } from 'react'
import type { ReactNode } from 'react'

export default class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed
      ? <p className="canvas-fallback" role="status">La vista 3D no está disponible. Podés seguir usando la lista de mesas y su detalle.</p>
      : this.props.children
  }
}
