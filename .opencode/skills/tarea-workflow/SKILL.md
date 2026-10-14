---
name: Flujo de tareas del backlog
description: Usar al trabajar una tarea de TASKS.md (P01–P12) en Restaurant Sim. Define el ciclo de implementación, qué validar y cómo registrar el avance en TASKS.md y README.md.
---

# Flujo de tareas — Restaurant Sim

## Fuentes de verdad

1. `SPEC.md` — alcance y reglas vigentes (versión 2, 13/10/2026).
2. `TASKS.md` — backlog de issues P01–P12 con subtareas, dependencias y aceptación.
3. `AGENTS.md` — reglas del repositorio (Yarn, estructura, estilo, validación).

Leer el issue completo antes de tocar código: historia, spec (§ referenciada), archivos previstos, checklist y criterios de aceptación.

## Ciclo por issue

1. **Preparar**: identificar dependencias del issue (tabla de `TASKS.md`) y confirmar que están cerradas. Verificar el estado del repo con `git status`; no arrastrar cambios ajenos.
2. **Implementar**: seguir los archivos previstos del issue. Reglas duras:
   - Reglas de negocio en `src/features/restaurant/domain/`, puras, sin React ni Three.
   - Estado compartido solo en `src/features/restaurant/state/` (Zustand).
   - La escena (`src/features/supervisor/scene/`) solo renderiza y delega.
   - Sin dependencias nuevas sin justificación explícita. No tocar `yarn.lock` salvo que la justificación lo exija.
   - Estilo: indentación de 2 espacios, comillas simples, sin punto y coma, PascalCase para componentes.
3. **Validar** según `validacion`: tests + lint + build, siempre los tres.
4. **Registrar** el avance (ver más abajo).
5. **Avisar el pendiente real**: si algo no se pudo comprobar, decirlo; nunca dar por hecho un recorrido visual no ejecutado.

## Formato de registro en TASKS.md

Cada issue implementado cierra con tres bloques, luego del checklist:

```md
**Registro PXX — <fecha>:** <resumen>. Archivos: nuevos `ruta/a.ts`; integrados `<otro>`, `<otro>`. Sin dependencias nuevas.

**Comprobado:** `yarn test` (N/N), `yarn lint` y `yarn build` aprobados. <casos efectivamente verificados>. <hallazgos del primer build/test y su corrección>.

**Pendiente:** <lo que no se pudo verificar> y por qué. Próxima implementación: PXX.
```

Reglas del registro:
- Marcar `[x]` solo las subtareas efectivamente hechas.
- Contar los tests reales que corrieron (`N/N`), no los previstos.
- Si no hubo navegador, escribir «validación visual pendiente» y no cerrar criterios de UI.
- Actualizar la línea de estado al inicio de `TASKS.md` (`P01–P05 implementados…`).

## Al cambiar comportamiento visible

- Actualizar `README.md`: sección nueva o ajuste de la existente, comandos de validación y estructura si se agregaron archivos.
- Mantener coherentes README / SPEC / TASKS (ver skill `spec-consistencia`).
- Adjuntar capturas cuando el cambio sea visual.

## Salida esperada al terminar

Reportar: archivos modificados/creados, comandos ejecutados con su resultado, criterios verificados y pendientes explícitos.
