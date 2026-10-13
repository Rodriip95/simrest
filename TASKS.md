# Restaurant Sim — Issues y tareas

13 de octubre de 2026. Backlog local listo para trasladar a un gestor de issues. No publicado en GitHub. Referencia vigente: [SPEC.md](SPEC.md). Prioridad P0: flujo mínimo; P1: completar experiencia. P01–P05 implementados con validación visual pendiente; P06–P12 pendientes.

## Base y trazabilidad

- B01: construcción paramétrica implementada; validación visual pendiente.
- B02: selección/eliminación y humo implementados; validación visual pendiente; mover deshabilitado.
- El [plan anterior T01–T11/F01–F05](docs/planning/archive/TASKS-2026-10-09.md) queda archivado. No ejecutar ambos backlogs ni volver a crear seis fixtures como fuente del salón.
- T02/T03 pasan a P01; T04/T07 a P02; T05/T06 se conservan y verifican en P03/P08/P11; T08–T11 se integran en validación por issue y P11. F01–F05 pasan a P12 diferido.

| Issue | Prioridad | Dependencias | Entrega |
| --- | --- | --- | --- |
| P01 Dominio y sesión | P0 | B01/B02 | Modelo compartido |
| P02 Roles y navegación | P0 | P01 | Admin, supervisor, mozo |
| P03 Mover mesas | P0 | P02 | Distribución editable |
| P04 Asignar mesas | P0 | P02 | Responsables |
| P05 Ingresar clientes | P0 | P04 | Visitas y cantidad manual |
| P06 Dictar cantidad | P1 | P05 | Entrada por voz |
| P07 Tomar pedidos | P0 | P05 | Borrador, confirmación, entrega |
| P08 Avatares de atención | P1 | P03, P05, P07 | Clientes y mozos en escena |
| P09 Cerrar y reiniciar | P0 | P07, P08 | Ciclo completo |
| P10 Métricas | P1 | P09 | Indicadores de sesión |
| P11 Validación integral | P0 | P03, P06, P10 | Demo revisada |
| P12 Plataforma futura | Diferido | P11 y nueva etapa | Contratos para backend |

Orden sugerido: P01, P02, P03, P04, P05, P07, P06, P08, P09, P10, P11. P06 y P07 son independientes después de P05. No estimar fechas sin conocer disponibilidad.

## P01 — Modelar dominio y estado compartido

**Historia:** como equipo, necesitamos que todas las vistas operen la misma sesión sin duplicar datos. **Spec:** §§1, 9. **Archivos previstos:** restaurant/domain, restaurant/state, restaurant/data, App.tsx y tsconfig*.json.

- [x] Inspeccionar dependencias y activar strict explícito en ambos tsconfig, resolviendo errores.
- [x] Definir tipos Table/Placement, Waiter, Assignment, Visit, Product, Order, Presence y OperationEvent.
- [x] Adaptar SpaceLayout conservando IDs y reglas de construcción/eliminación existentes.
- [x] Crear tres mozos y catálogo determinista con precios enteros ARS.
- [x] Crear store Zustand de sesión y selectores por ID, con reloj/IDs inyectables.
- [x] Definir errores de dominio y contratos de acciones; implementar cada regla en su issue, sin acciones vacías habilitadas.
- [x] Añadir pruebas de invariantes e independencia de la escena.

**Aceptación:** las vistas consultan una sola colección; no hay datos duplicados en meshes; recargar reinicia; IDs y relaciones son válidos; pruebas B01/B02 conservan comportamiento. **Validación:** tests de dominio Node, lint y build. Registrar comandos reales. Sin nueva dependencia salvo justificación específica.

**Registro P01 — 13/10/2026:** implementación terminada; cierre visual pendiente. Archivos: nuevos `restaurant/domain/{types,commands}.ts`, `restaurant/data/mocks.ts`, `restaurant/state/{sessionStore,useSessionStore,selectors}.ts` y `sessionStore.test.ts`; integración en `App.tsx` y `RestaurantScene.tsx`; configuración en ambos tsconfig, script en `package.json` y documentación en README/TASKS. No se añadieron dependencias ni se cambió `yarn.lock`.

**Comprobado:** `yarn test` (11/11: seis pruebas de sesión y cinco de espacio), `yarn lint` y `yarn build` aprobados. Se verificaron geometría B01/B02, IDs/números estables al eliminar, selección compartida, error sin mutación, evento atómico, reloj no decreciente, guards de eliminación, historial y reinicio mediante store nuevo. El primer build detectó tipos Node fuera de su configuración; se corrigió separando los tests de la configuración del navegador y el build posterior pasó. Vite mantiene aviso de bundle mayor a 500 kB.

**Pendiente:** recorrido real en navegador (construir, seleccionar, cancelar/confirmar eliminación, humo, pan/zoom y recargar). La herramienta de UI no ofreció navegadores (`apps: [], browsers: []`); no se acredita validación visual ni se cierran B01/B02. P02 es la siguiente implementación.

## P02 — Implementar navegación y permisos de demo

**Historia:** como usuario quiero alternar roles para probar el servicio en una misma sesión. **Spec:** §2. **Archivos:** App.tsx, restaurant/components, domain/permissions.ts, state.

- [x] Implementar selector de rol y selector de mozo activo.
- [x] Crear Administración, Supervisión y Mi servicio sobre el mismo estado.
- [x] Centralizar matriz de permisos y aplicarla también a comandos, no solo botones.
- [x] Compartir selectedTableId entre lista HTML, escena y panel.
- [x] Resolver borradores al salir; limpiar preview y captura sin borrar operaciones confirmadas.
- [x] Proveer selección por teclado, foco visible y detalle por permisos sin WebGL.

**Aceptación:** mozo no puede asignar/mover ni editar mesa ajena incluso invocando una acción; admin/supervisor pueden asistir mesas asignadas; cambiar de rol conserva datos y etiqueta demo. **Validación:** pruebas de matriz/acciones rechazadas; recorrido de tres roles, teclado y WebGL ausente; lint/build.

**Registro P02 — 13/10/2026:** implementación disponible; cierre visual pendiente. Se añadieron `domain/permissions.ts`, `permissions.test.ts`, `components/RoleNavigation.tsx`, `TableDirectory.tsx` y `SceneBoundary.tsx`. Se integraron en App, estilos, store y menú/selección de escena. Administración construye; Supervisión consulta y elimina mesas libres; Mi servicio selecciona mozo y restringe detalles a sus mesas. La lista permite consultar y eliminar sin depender de Canvas. Cambiar rol/mozo limpia selección, preview y estado de micrófono; los borradores requieren descarte explícito o cancelación. Captura real de audio y callbacks se implementarán en P06; no hay micrófono activo en esta etapa.

**Comprobado:** `yarn test` 15/15, `yarn lint` y `yarn build` correctos. Matriz probada para los tres roles, mesas propias/ajenas/sin asignación, mozo inactivo, acciones existentes rechazadas sin mutación y conservación de entidades al navegar. Mover/asignar/asistir tienen permisos definidos y probados, pero sus comandos operativos siguen pendientes de P03–P07; no se expusieron acciones vacías. Sin dependencias nuevas. Persiste aviso de Vite por bundle mayor a 500 kB.

**Pendiente:** recorrido real de tres roles, foco/teclado, ausencia de WebGL y capturas. El inventario de UI devolvió `apps: [], browsers: []`. La siguiente implementación es P03 (mover mesas libres).

## P03 — Habilitar movimiento de mesas libres

**Historia:** como admin/supervisor quiero ajustar la distribución sin perder identidad de mesas. **Spec:** §3. **Archivos:** domain/space.ts, RestaurantScene.tsx, TableMenu.tsx, nuevo MoveTablePanel.

- [x] Crear validador puro de coordenadas, límites y separación.
- [x] Habilitar Mover solo con permiso y sin visita activa.
- [x] Agregar preview X/Z con snap de 0,5 m y Guardar/Cancelar.
- [x] Suspender cámara durante gesto y manejar captura/pointercancel/Escape.
- [x] Agregar inputs X/Z accesibles usando el mismo validador.
- [x] Conservar ID, asignación, números, cámara y otras mesas al confirmar.

**Aceptación:** válido se guarda; colisión, borde, NaN e infinito se rechazan; Cancelar/escape/pérdida de captura conservan coordenadas; ocupada bloqueada. **Validación:** tests de bordes y separación exacta; regresión de pan/zoom/clic y resize; lint/build. No confundir soltar preview con confirmar dominio.

**Registro P03 — 13/10/2026:** implementación terminada con validación visual pendiente. Nuevos `domain/movement.ts`, `movement.test.ts`, `components/MoveTablePanel.tsx` y `scene/MovePreview.tsx`; integración en store, lista, menú, escena, estilos y runner. Preview separado del dominio; Guardar revalida posición, permiso y ocupación. Cancelar/Escape/cambio de rol o mesa descarta preview. Arrastre con captura: soltar conserva preview; pointercancel/pérdida de captura lo descarta. La cámara se pausa durante todo el modo mover y recupera controles al terminar sin resetearse al guardar.

**Ajuste de interacción:** botones ✓ (confirmar) y × (cancelar) encima de la vista previa. Confirmar limpia también la selección para quitar el resaltado y volver a operar otras mesas. Posiciones inválidas muestran motivo y deshabilitan ✓. Validación: 19 pruebas, lint y build aprobados; inspección visual pendiente.

**Comprobado:** `yarn test` 19/19, `yarn lint` sin advertencias y `yarn build` correctos. Pruebas de bordes exactos, separación, NaN/infinito, preview sin mutación, cancelación, permisos, ocupación, identidad y evento único. `http://localhost:5173` respondió HTTP 200. Sin dependencias nuevas. Persiste aviso de Vite por tamaño del bundle.

**Pendiente:** recorrido real de arrastre, captura, Escape, foco, pan/zoom/clic y resize. La herramienta de UI devolvió inventario vacío aunque el servidor esté disponible; no se acredita validación visual. Próxima implementación: P04.

## P04 — Asignar y reasignar mesas a mozos

**Historia:** como supervisor quiero distribuir mesas y conocer su responsable. **Spec:** §4. **Archivos:** domain/assignments.ts, state, components/AssignmentPanel.

- [x] Mostrar responsable actual y selector de mozos activos.
- [x] Implementar asignación, cambio y desasignación con reglas de rol.
- [x] Mantener intervalos históricos y no-op al elegir el mismo mozo.
- [x] Confirmar reasignación ocupada y resolver borrador antes del cambio.
- [x] Bloquear mesa ocupada sin reemplazo y liberar presencia anterior.
- [x] Cambiar acceso operativo sin reescribir pedidos históricos.

**Aceptación:** una mesa tiene máximo un responsable; mozo acepta varias; reemplazo conserva visita/pedidos; actor y responsable son distintos. **Validación:** asignar libre, reasignar ocupada, mozo inactivo, sin reemplazo, no-op; regresión después de P07 para borrador/pedidos; lint/build.

**Registro P04 — 13/10/2026:** añadidos `domain/assignments.ts`, `assignments.test.ts` y `components/AssignmentPanel.tsx`. Integrados store, detalle HTML, estilos, texto de Supervisión y runner. Asignación/desasignación por admin/supervisor; intervalos históricos; confirmación de reemplazo ocupado y descarte explícito del borrador. Cambios y evento se publican juntos; se libera presencia del responsable anterior únicamente sobre esa mesa. Las visitas y los pedidos permanecen intactos. Reintentos no duplican eventos ni revierten asignaciones posteriores.

**Comprobado:** `yarn test` 23/23, `yarn lint` sin advertencias y `yarn build` correctos. Tests con reloj/IDs deterministas: varias mesas por mozo, intervalos, no-op, desasignación, mozo inactivo/inexistente, permisos, reemplazo ocupado, borrador, historial, presencia y reintentos. No se añadieron dependencias. Persiste aviso de Vite por tamaño del bundle.

**Pendiente:** prueba visual y teclado del formulario; herramienta de UI sin navegador (`apps: [], browsers: []`). Los casos ocupados usan fixtures: repetir recorrido real al implementar P05/P07. Próxima implementación: P05, clientes y visitas.

## P05 — Registrar clientes y visitas por mesa

**Historia:** como mozo quiero indicar cuántas personas llegaron al seleccionar mi mesa. **Spec:** §5. **Archivos:** domain/visits.ts, components/GuestCountForm, state.

- [x] Iniciar ingreso desde clic/lista de mesa libre propia.
- [x] Añadir capacidad inicial 4, editable 1–8 solo con mesa libre por admin/supervisor.
- [x] Validar cantidad entera entre 1 y capacidad; exigir responsable activo.
- [x] Crear una visita activa y clientes anónimos con IDs estables.
- [x] Corregir cantidad preservando hora, IDs existentes y pedidos.
- [x] Derivar estado libre/ocupada y contador accesible.

**Aceptación:** doble confirmación no abre dos visitas; mesa ajena/sin asignar no permite alta; corregir agrega/retira solo IDs necesarios. **Validación:** cero, negativo, fracción, máximo, exceso y correcciones; clic y teclado; lint/build. Avatares visuales en P08.

**Registro P05 — 13/10/2026:** añadidos `domain/visits.ts`, `visits.test.ts` y `components/GuestCountForm.tsx`. Integrados store, detalle HTML, acceso desde menú de escena, estilos y runner. Capacidad editable entre 1 y 8 por administración/supervisión solo con mesa libre; ingreso/corrección por responsable o asistencia autorizada. Confirmación crea visita y clientes anónimos; correcciones conservan IDs previos y hora de ingreso. Entidad/evento se actualizan juntos, reintentos no duplican y una segunda alta se rechaza. Una visita bloquea mover/eliminar/cambiar capacidad. Contador HTML y estado derivados; avatares pendientes de P08.

**Comprobado:** `yarn test` 27/27, `yarn lint` sin advertencias y `yarn build` correctos. Casos de cantidades inválidas, capacidad máxima, doble alta, reintentos, asignación ausente/inactiva, mesa ajena, correcciones y bloqueos de mesa ocupada. Sin dependencias nuevas. Persiste aviso de Vite por tamaño del bundle.

**Pendiente:** recorrido visual y teclado; la herramienta de UI devolvió `apps: [], browsers: []`. Próxima implementación según orden sugerido: P07, pedidos; después P06, dictado.

## P06 — Dictar cantidad con confirmación

**Historia:** como mozo quiero decir la cantidad y revisarla antes de ingresar clientes. **Spec:** §5. **Archivos:** restaurant/speech, GuestCountForm.

- [ ] Detectar soporte al implementar y encapsular API del navegador con interfaz testeable.
- [ ] Crear parser para 1–8, dígitos/palabras y frases simples sin ambigüedad.
- [ ] Mostrar aviso previo, escucha, Detener/Cancelar y resultado editable.
- [ ] Exigir confirmación y validar capacidad actual.
- [ ] Invalidar callbacks al cancelar/cambiar mesa/rol y detener captura al desmontar.
- [ ] Manejar permiso denegado, silencio, error y falta de soporte con entrada manual.

**Aceptación:** «somos cuatro» propone 4 sin crear visita; «dos o cuatro», 0 y 2,5 no se aceptan; respuesta tardía no llena otra mesa. **Validación:** parser/adaptador fake para errores; dictado real en navegador compatible registrando versión y fallback en uno sin soporte; lint/build. Si el micrófono no está disponible para verificar, declararlo, sin simular prueba real.

## P07 — Tomar, confirmar y entregar pedidos

**Historia:** como mozo quiero tomar el pedido al abrir mi mesa ocupada. **Spec:** §6. **Archivos:** domain/orders.ts, data/catalog.mock.ts, components/OrderPanel, state.

- [ ] Mostrar catálogo y líneas con cantidad 1–99, observación y quitar producto.
- [ ] Mantener borrador por visita y guarda para cambios de mesa/rol.
- [ ] Calcular totales en centavos; rechazar vacío/no disponible/cantidad inválida.
- [ ] Confirmar con commandId idempotente y snapshots de nombre/precio/moneda.
- [ ] Guardar actor y responsable histórico; permitir varios pedidos por visita.
- [ ] Marcar entregado manualmente, conservando timestamps y evitando evento duplicado.
- [ ] Probar reasignación con pedidos previos y descarte explícito del borrador.

**Aceptación:** doble clic/reintento crea un pedido; error conserva borrador; producto que luego cambia no altera histórico; mesa libre/ajena no admite pedido. **Validación:** transiciones, importes exactos, permisos e idempotencia; recorrido formulario; lint/build. Cocina/cobro fuera de alcance.

## P08 — Mostrar clientes y mozos en el salón

**Historia:** como supervisor quiero ver qué mozo atendió cada mesa y cuántos clientes hay. **Spec:** §§4, 7. **Archivos:** scene/CustomerAvatar, WaiterAvatar, RestaurantScene, domain/presence.ts.

- [ ] Renderizar esfera de radio 0,12 m por cliente, con offsets para 1–8 personas.
- [ ] Renderizar cubo de lado 0,28 m por mozo con etiqueta y color.
- [ ] Ubicar mozo en atención o espera; separar offsets de clientes y mozos.
- [ ] Actualizar atención al abrir/cambiar/cerrar panel, sin duplicar avatar por mesa asignada.
- [ ] Conservar snapshot al cambiar a supervisor y rotular «Última atención simulada».
- [ ] Inspeccionar avatar para consultar nombre/asignaciones y filtrar por rol.
- [ ] Garantizar selección de mesas y alternativa HTML sin WebGL.

**Aceptación:** cuatro clientes producen cuatro esferas; un mozo con tres mesas sigue siendo un cubo; supervisor ve atención coherente y el snapshot rotulado; cierre/reasignación limpia presencia. **Validación:** selectores y transiciones; inspección de 1/4/8 clientes, cámara y clic; lint/build. Medición máxima en P11.

## P09 — Finalizar visita y proteger reinicios/eliminación

**Historia:** como usuario quiero terminar un servicio sin borrar historial por accidente. **Spec:** §§3, 5. **Archivos:** domain/visits.ts, state, App, TableMenu.

- [ ] Confirmar cierre solo sin pedidos pendientes de entrega y con borrador resuelto.
- [ ] Fijar closedAt y retirar clientes/presencia, manteniendo asignación.
- [ ] Conservar pedidos/eventos de visitas cerradas y permitir una visita nueva.
- [ ] Bloquear mover/eliminar ocupada y retirar asignación al eliminar libre.
- [ ] Confirmar reconstrucción con pérdida de sesión; limpiar todas las referencias al aceptar.
- [ ] Regresar a menú/foco válido después de cierre, eliminación y reset.

**Aceptación:** cierre no representa pago; reset cancelado conserva todo; reset aceptado cambia sessionId; historial de mesa eliminada sigue consultable por métricas. **Validación:** recorrido con dos visitas, pedido pendiente, borrador, última mesa y reset durante efectos; tests, lint/build.

## P10 — Calcular métricas operativas de sesión

**Historia:** como admin/supervisor quiero ver ocupación y actividad; como mozo, solo la mía. **Spec:** §8. **Archivos:** domain/metrics.ts, components/MetricsPanel.

- [ ] Implementar los siete indicadores de la tabla del spec con selectores puros.
- [ ] Separar responsabilidad actual de atribución histórica al confirmar pedidos.
- [ ] Mostrar alcance de sesión y filtros según rol.
- [ ] Mostrar Sin datos para denominadores/muestras vacías y ARS para consumo.
- [ ] Excluir borradores y evitar duplicación tras entregar/reintentar/cambiar rol.
- [ ] Actualizar esperas con reloj de baja frecuencia, no por frame.

**Aceptación:** con dos mesas y una ocupada por cuatro clientes: ocupación 50%, clientes 4. Pedido de 2 × 15000 centavos: consumo ARS 300,00 y un pedido. Primer pedido a 120 s: espera 120 s. Tras reasignar Ana a Bruno, clientes actuales pasan a Bruno y ese pedido sigue atribuido a Ana. Sin asignaciones: ocupación Sin datos.

**Validación:** fixtures/reloj deterministas para ejemplos, cero mesas, cierre, eliminación y reset; filtros de rol; lint/build. No usar etiqueta ingresos ni cobros.

## P11 — Verificar recorrido y documentar entrega

**Historia:** como usuario quiero una demo consistente y usable de principio a fin. **Spec:** §10. **Archivos:** pruebas colocadas, README, SPEC, TASKS.

- [ ] Ejecutar recorrido admin → mozo → supervisor → reasignación → cierre del spec.
- [ ] Probar todos los casos negativos, teclado, foco, movimiento reducido y WebGL ausente.
- [ ] Revisar layouts a 1280×720, 768×1024 y 390×844, sin desbordamiento de formularios.
- [ ] Medir 30 s de pan/zoom con 25 mesas y con 200 mesas/1600 clientes; registrar navegador, GPU, resolución y DPR.
- [ ] Evaluar objetivo provisional de fluidez (cerca de 60 FPS, sin caídas sostenidas bajo 30); optimizar solo con evidencia o documentar límite pendiente.
- [ ] Ejecutar tests de espacio y del nuevo dominio, lint y build.
- [ ] Actualizar README con roles, controles, dictado y limitaciones reales; adjuntar capturas de cambios visuales.

**Aceptación:** recorrido completo y casos críticos comprobados; resultados y limitaciones documentados; ninguna tarea figura terminada por una prueba no ejecutada. Runner DOM nuevo solo si se justifica un comportamiento concreto y se preserva Yarn.

## P12 — Definir plataforma real (diferido)

**Dependencia adicional:** activar explícitamente etapa backend. Sin código ni despliegue ahora.

- [ ] Definir identidad, membresías, permisos de servidor y aislamiento por local.
- [ ] Diseñar persistencia, transacciones e idempotencia para visitas/pedidos/asignaciones.
- [ ] Resolver conflictos de edición, eventos confirmados y reconexión entre dispositivos.
- [ ] Especificar cocina, caja y pagos como módulos separados con sus propios criterios.
- [ ] Crear issues de implementación de esa nueva etapa sin arrastrar supuestos de seguridad de la demo.

**Aceptación:** contratos y pruebas de dos locales/dos sesiones definidos antes de operar datos reales. No bloquea P01–P11.

## Definición de terminado por issue

Registrar archivos modificados, criterios efectivamente verificados, comandos/resultados y pendientes. Para código: lint, build y pruebas significativas del comportamiento cambiado. Para UI: recorrido local y evidencia visual. Estas tareas planificadas no acreditan implementación.
