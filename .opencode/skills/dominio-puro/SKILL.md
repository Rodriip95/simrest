---
name: Arquitectura de dominio
description: Usar al crear o modificar reglas de negocio en src/features/restaurant/domain y el store de sesión de Restaurant Sim. Cubre pureza, inyección de reloj/IDs, atomicidad entidad-evento, idempotencia y permisos.
---

# Dominio y estado — Restaurant Sim

## Pureza

Las reglas viven en `src/features/restaurant/domain/` como funciones puras: sin React, sin Three, sin DOM, sin `Date.now()` ni `Math.random()` directos.

- Reclje/reloj e ID se **inyectan** como parámetros (la fábrica del store ya acepta `clock` e `idGenerator`).
- Un error de dominio **no** muta nada: validar antes de cambiar entidad y evento.
- Comandos tipados en `domain/commands.ts`; errores en el mismo módulo del dominio que los produce.

## Atomicidad e idempotencia

- Entidad y `OperationEvent` cambian juntos, en la misma acción.
- Todo comando acepta `commandId`; reintentar con el mismo `commandId` es no-op (no duplica entidad ni evento).
- Timestamps no decrecientes por sesión (reloj inyectable).

## Entidades y reglas clave (SPEC §9)

| Regla | Detalle |
| --- | --- |
| Table / TablePlacement | Una ubicación válida por mesa; número estable aunque se eliminen otras |
| Assignment | Máximo una activa por mesa; un mozo puede tener varias |
| Visit | Máximo una activa por mesa; requiere mozo activo asignado |
| Order | Inmutable al confirmar: snapshot de nombre y precio; `waiterIdAtConfirmation` separado de `actorId` |
| OrderItem | Precios en centavos (enteros), moneda ARS |
| Operación con visita activa | Bloquea mover, eliminar y editar capacidad |

Movimiento (`domain/movement.ts`): margen 0,5 m al borde y `abs(dx) >= 2 || abs(dz) >= 2` entre mesas; rechazar NaN e infinito.

## Permisos (`domain/permissions.ts`)

La matriz de permisos se valida en la UI **y** en cada comando. Acción rechazada ⇒ error tipado, cero mutación. Separar **actor** (quien ejecuta) de **responsable** (mozo de la mesa): admin/supervisor puede asistir sin volverse responsable.

## Estado compartido (`state/`)

- `sessionStore` (fábrica con reloj/IDs) + `useSessionStore` (instancia única) + `selectors` por ID.
- Estado transitorio separado: `selectedTableId`, `movePreview`, `orderDraft`, `micState`, errores.
- No duplicar entidades en meshes ni mantener contadores desincronizados: derivar (libre/ocupada, contadores) con selectores.
- Reloj de baja frecuencia para esperas en vivo, nunca por frame (P10).

## Tests

Un `*.test.ts` por módulo de dominio, junto al archivo, listado en el script `test` de `package.json`. Cubrir invariantes, errores sin mutación, idempotencia de `commandId`, permisos y casos borde. Ver skill `validacion`.
