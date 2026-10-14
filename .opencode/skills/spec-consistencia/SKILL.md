---
name: Consistencia de documentación
description: Usar al cerrar una tarea de Restaurant Sim para mantener README.md, SPEC.md y TASKS.md coherentes entre sí y con el estado real del código.
---

# Consistencia de documentación

Tres documentos deben reflejar el mismo estado: `README.md` (usuario), `SPEC.md` (alcance/reglas), `TASKS.md` (backlog).

## Checklist al cerrar un issue

- [ ] `TASKS.md`: subtareas marcadas `[x]` solo si se hicieron; bloques `Registro` / `Comprobado` / `Pendiente` completos; línea de estado inicial actualizada (`P0X–P0Y implementados…`).
- [ ] `TASKS.md`: la fila de la tabla de dependencias refleja el estado real.
- [ ] `README.md`: sección de la funcionalidad nueva (cómo usarla), comandos de validación con el conteo real de pruebas, estructura de archivos si se agregaron módulos, y «Próxima etapa» actualizada.
- [ ] `SPEC.md`: solo si cambió una regla o decisión; si no, no tocarlo.
- [ ] Nada queda marcado como validado sin haberse ejecutado.

## Errores frecuentes a vigilar

- **Conteos de tests viejos**: el README históricamente mencionó 15/19/23/27 pruebas en secciones distintas. Usar el conteo actual (`yarn test`) al actualizar.
- **«Próxima etapa» repetida y desactualizada** en varias secciones del README.
- **Duplicar funcionalidad en dos secciones** del README (una por issue): preferir una sección estable por tema y mencionar la versión del issue ahí.
- Mencionar features que aún no existen (P06 dictado, P07 pedidos, P08 avatares, P10 métricas) como si estuvieran implementadas.
- Referencias a planes archivados: `docs/planning/archive/*` es histórico, no vigente.

## Fuente de verdad ante conflicto

1. El código y los tests ejecutados.
2. `SPEC.md` (reglas).
3. `TASKS.md` (estado).
4. `README.md` (explicación al usuario).

Ante contradicción entre docs, corregir el documento de menor jerarquía y dejarlo explícito en el registro del issue.
