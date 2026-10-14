---
name: Convenciones de escena R3F
description: Usar al modificar la escena 3D (src/features/supervisor/scene) o cualquier componente React Three Fiber de Restaurant Sim. Cubre render bajo demanda, cámara, selección, accesibilidad y alternativa sin WebGL.
---

# Escena React Three Fiber — Restaurant Sim

Archivos: `src/features/supervisor/scene/` (`RestaurantScene`, `TableMenu`, `MovePreview`, `SmokeEffect`).

## Render bajo demanda

La escena ya renderiza on-demand. Cualquier cambio nuevo que anime algo debe usar `invalidate()` de Fiber, nunca escribir posiciones ni contadores en el store por frame. Si un estado cambia en el store, el render se dispara solo.

- DPR fijo en `[1, 1.5]`.
- No persistir posiciones temporales de meshes en el store: solo las del dominio (`placements`).
- Única excepción: las coordenadas temporales de la animación de humo.

## Cámara

- Pan/zoom/reset con controles HTML y teclado (flechas, `+`/`-`, `0`).
- Durante el modo mover, la cámara queda **pausada** y se recupera al salir sin resetear.
- Guardar posición o eliminar mesa **no** deben resetear el encuadre; solo reconstruir el espacio lo hace.
- Umbral de clic: 5 px. Un arrastre no puede abrir el menú de una mesa.

## Selección

- Selección por `selectedTableId` compartido entre lista HTML, escena y panel. Nunca duplicar estado de selección.
- Los meshes no guardan datos: derivan de las entidades del store por ID.
- El humo es el único estado transitorio con coordenadas propias.

## Accesibilidad y fallback

- Toda acción de la escena tiene alternativa HTML funcional sin WebGL (lista `TableDirectory`, paneles `MoveTablePanel`, `AssignmentPanel`, `GuestCountForm`).
- Soporte de teclado y foco visible en los controles.
- `prefers-reduced-motion`: acortar/deshabilitar el humo.
- Los avatares (P08) no deben interceptar clics destinados a mesas: usar capas o filtrado de raycast.

## Geometría (spec §§1, 7)

- 1 unidad = 1 metro. Mesas: cubos de 1 m. Clientes: esferas de radio 0,12 m. Mozos: cubos de 0,28 m (silueta cuadrada desde arriba, menores que las mesas).
- Offsets deterministas para 1–8 clientes, separados de los offsets de mozo.
- Colores: el estado se comunica con texto/leyenda, no con color decorativo; la selección usa otro indicador.

## Validación

`yarn test && yarn lint && yarn build` + recorrido visual real (ver skill `validacion-visual`). La validación visual está pendiente para P01–P05: no darla por hecha.
