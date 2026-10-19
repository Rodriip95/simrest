# Restaurant Sim — Issues y tareas

14 de octubre de 2026. Backlog local listo para trasladar a un gestor de issues. No publicado en GitHub. Referencia vigente: [SPEC.md](SPEC.md). Prioridad P0: flujo mínimo; P1: completar experiencia. P01–P10 y P14 implementados; P13 tiene navegación funcional entre pisos, P11 mantiene validaciones pendientes y P12 está diferido.

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
| P13 Salón de varios pisos | P1 | P10 | Niveles con mesas, navegación y métricas |
| P14 Tiempo de atención por mesa | P1 | P05, P09 | Contador activo hasta el cierre |

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

- [x] Detectar soporte al implementar y encapsular API del navegador con interfaz testeable.
- [x] Crear parser para 1–8, dígitos/palabras y frases simples sin ambigüedad.
- [x] Mostrar aviso previo, escucha, Detener/Cancelar y resultado editable.
- [x] Exigir confirmación y validar capacidad actual.
- [x] Invalidar callbacks al cancelar/cambiar mesa/rol y detener captura al desmontar.
- [x] Manejar permiso denegado, silencio, error y falta de soporte con entrada manual.

**Aceptación:** «somos cuatro» propone 4 sin crear visita; «dos o cuatro», 0 y 2,5 no se aceptan; respuesta tardía no llena otra mesa. **Validación:** parser/adaptador fake para errores; dictado real en navegador compatible registrando versión y fallback en uno sin soporte; lint/build. Si el micrófono no está disponible para verificar, declararlo, sin simular prueba real.

**Registro P06 — 14/10/2026:** parser puro y adaptador Web Speech separados en `restaurant/speech`, con control de privacidad/escucha en `SpeechGuestCount`. Preferencia `es-AR`, resultado editable y confirmación manual. Cancelar o desmontar invalida callbacks y aborta captura. Sin dependencias nuevas.

**Comprobado:** parser para dígitos, palabras y frases; rechazo de ambiguos, fuera de rango, negativos y decimales; mensajes de permiso/silencio/audio. Chrome Headless 154 con adaptador simulado propuso 4 para «somos cuatro» sin crear visita, y la confirmación posterior creó cuatro clientes. Con ambas APIs deshabilitadas mostró fallback manual. `yarn test`, lint y build aprobados.

**Pendiente:** dictado con micrófono físico y permisos reales; no se simuló como prueba real de audio.

## P07 — Tomar, confirmar y entregar pedidos

**Historia:** como mozo quiero tomar el pedido al abrir mi mesa ocupada. **Spec:** §6. **Archivos:** domain/orders.ts, data/catalog.mock.ts, components/OrderPanel, state.

- [x] Mostrar catálogo y líneas con cantidad 1–99, observación y quitar producto.
- [x] Mantener borrador por visita y guarda para cambios de mesa/rol.
- [x] Calcular totales en centavos; rechazar vacío/no disponible/cantidad inválida.
- [x] Confirmar con commandId idempotente y snapshots de nombre/precio/moneda.
- [x] Guardar actor y responsable histórico; permitir varios pedidos por visita.
- [x] Marcar entregado manualmente, conservando timestamps y evitando evento duplicado.
- [x] Probar reasignación con pedidos previos y descarte explícito del borrador.

**Aceptación:** doble clic/reintento crea un pedido; error conserva borrador; producto que luego cambia no altera histórico; mesa libre/ajena no admite pedido. **Validación:** transiciones, importes exactos, permisos e idempotencia; recorrido formulario; lint/build. Cocina/cobro fuera de alcance.

## P08 — Mostrar clientes y mozos en el salón

**Historia:** como supervisor quiero ver qué mozo atendió cada mesa y cuántos clientes hay. **Spec:** §§4, 7. **Archivos:** scene/CustomerAvatar, WaiterAvatar, RestaurantScene, domain/presence.ts.

- [x] Renderizar esfera de radio 0,12 m por cliente, con offsets para 1–8 personas.
- [x] Renderizar cubo de lado 0,28 m por mozo con etiqueta y color.
- [x] Ubicar mozo en atención o espera; separar offsets de clientes y mozos.
- [x] Actualizar atención al seleccionar/cambiar/deseleccionar mesa, sin duplicar avatar por asignación.
- [x] Conservar snapshot al cambiar a supervisor y rotular «Última atención simulada».
- [x] Inspeccionar avatar para consultar nombre/asignaciones y filtrar por rol.
- [x] Garantizar selección de mesas y alternativa HTML sin WebGL.

**Aceptación:** cuatro clientes producen cuatro esferas; un mozo con tres mesas sigue siendo un cubo; supervisor ve atención coherente y el snapshot rotulado; cierre/reasignación limpia presencia. **Validación:** selectores y transiciones; inspección de 1/4/8 clientes, cámara y clic; lint/build. Medición máxima en P11.

## P09 — Finalizar visita y proteger reinicios/eliminación

**Historia:** como usuario quiero terminar un servicio sin borrar historial por accidente. **Spec:** §§3, 5. **Archivos:** domain/visits.ts, state, App, TableMenu.

- [x] Confirmar cierre solo sin pedidos pendientes de entrega y con borrador resuelto.
- [x] Fijar closedAt y retirar clientes/presencia, manteniendo asignación.
- [x] Conservar pedidos/eventos de visitas cerradas y permitir una visita nueva.
- [x] Bloquear mover/eliminar ocupada y retirar asignación al eliminar libre.
- [x] Confirmar reconstrucción con pérdida de sesión; limpiar todas las referencias al aceptar.
- [x] Regresar a menú/foco válido después de cierre, eliminación y reset.

**Aceptación:** cierre no representa pago; reset cancelado conserva todo; reset aceptado cambia sessionId; historial de mesa eliminada sigue consultable por métricas. **Validación:** recorrido con dos visitas, pedido pendiente, borrador, última mesa y reset durante efectos; tests, lint/build.

**Registro P09 — 14/10/2026:** `closeVisit` valida permisos, entregas y borrador antes de actualizar visita/evento atómicamente. Retira clientes activos y presencia, conserva asignación, pedidos e historial y admite una nueva visita. UI con confirmación expresa y texto que distingue cierre de cobro.

**Comprobado:** tests de idempotencia, acceso ajeno, pedido pendiente, descarte de borrador, conservación histórica/nueva visita y presencia. En Chrome, finalizar retiró cuatro clientes y devolvió la mesa a libre. Reinicio, eliminación y foco ya recorridos en U01.

## P10 — Calcular métricas operativas de sesión

**Historia:** como admin/supervisor quiero ver ocupación y actividad; como mozo, solo la mía. **Spec:** §8. **Archivos:** domain/metrics.ts, components/MetricsPanel.

- [x] Implementar los siete indicadores de la tabla del spec con selectores puros.
- [x] Separar responsabilidad actual de atribución histórica al confirmar pedidos.
- [x] Mostrar alcance de sesión y filtros según rol.
- [x] Mostrar Sin datos para denominadores/muestras vacías y ARS para consumo.
- [x] Excluir borradores y evitar duplicación tras entregar/reintentar/cambiar rol.
- [x] Actualizar esperas con reloj de baja frecuencia, no por frame.

**Aceptación:** con dos mesas y una ocupada por cuatro clientes: ocupación 50%, clientes 4. Pedido de 2 × 15000 centavos: consumo ARS 300,00 y un pedido. Primer pedido a 120 s: espera 120 s. Tras reasignar Ana a Bruno, clientes actuales pasan a Bruno y ese pedido sigue atribuido a Ana. Sin asignaciones: ocupación Sin datos.

**Validación:** fixtures/reloj deterministas para ejemplos, cero mesas, cierre, eliminación y reset; filtros de rol; lint/build. No usar etiqueta ingresos ni cobros.

**Registro P10 — 14/10/2026:** nuevo selector puro `computeSessionMetrics` y panel Indicadores. Incluye ocupación, clientes, asignaciones, pedidos, consumo registrado, espera al primer pedido y mesas pendientes; filtro global/por mozo y alcance fijo propio para Mi servicio. El reloj de esperas actualiza cada 15 s.

**Comprobado:** fixtures deterministas de ocupación global/por mozo, muestra vacía, espera actual y reasignación con atribución histórica. Chrome móvil mostró 16,7% de ocupación, 4 clientes, una asignación y una mesa pendiente. No se usan etiquetas de ingresos ni cobros.

## P11 — Verificar recorrido y documentar entrega

**Historia:** como usuario quiero una demo consistente y usable de principio a fin. **Spec:** §10. **Archivos:** pruebas colocadas, README, SPEC, TASKS.

- [ ] Ejecutar recorrido admin → mozo → supervisor → reasignación → cierre del spec.
- [ ] Probar todos los casos negativos, teclado, foco, movimiento reducido y WebGL ausente.
- [x] Revisar layouts a 1280×720, 768×1024 y 390×844, sin desbordamiento de formularios.
- [ ] Medir 30 s de pan/zoom con 25 mesas y con 200 mesas/1600 clientes; registrar navegador, GPU, resolución y DPR.
- [ ] Evaluar objetivo provisional de fluidez (cerca de 60 FPS, sin caídas sostenidas bajo 30); optimizar solo con evidencia o documentar límite pendiente.
- [x] Ejecutar tests de espacio y del nuevo dominio, lint y build.
- [x] Actualizar README con roles, controles, dictado y limitaciones reales; adjuntar capturas de cambios visuales.

**Aceptación:** recorrido completo y casos críticos comprobados; resultados y limitaciones documentados; ninguna tarea figura terminada por una prueba no ejecutada. Runner DOM nuevo solo si se justifica un comportamiento concreto y se preserva Yarn.

## P12 — Definir plataforma real (diferido)

**Dependencia adicional:** activar explícitamente etapa backend. Sin código ni despliegue ahora.

- [ ] Definir identidad, membresías, permisos de servidor y aislamiento por local.
- [ ] Diseñar persistencia, transacciones e idempotencia para visitas/pedidos/asignaciones.
- [ ] Resolver conflictos de edición, eventos confirmados y reconexión entre dispositivos.
- [ ] Especificar cocina, caja y pagos como módulos separados con sus propios criterios.
- [ ] Crear issues de implementación de esa nueva etapa sin arrastrar supuestos de seguridad de la demo.

**Aceptación:** contratos y pruebas de dos locales/dos sesiones definidos antes de operar datos reales. No bloquea P01–P11.

## P13 — Salón de varios pisos

**Historia:** como administrador quiero distribuir mesas en varios pisos, y como supervisor o mozo quiero cambiar de nivel sin perder el estado de atención. **Spec:** §13. **Archivos previstos:** restaurant/domain/types y floors.ts, state, SpaceBuilderPanel, RestaurantScene, App, TableDirectory, MetricsPanel.

- [x] Modelar pisos con ID/nombre/orden y superficie propios; crear un piso inicial al iniciar o reconstruir.
- [x] Asociar mesa y ubicación a un piso con IDs globales estables; validar colisiones y límites solo entre mesas del mismo piso.
- [x] Permitir al administrador agregar pisos con nombre, superficie y mesas sin reiniciar la sesión.
- [x] Editar, reordenar y eliminar pisos con confirmación cuando tienen actividad o historial.
- [x] Agregar selector de piso accesible arriba de la escena; filtrar mesas, etiquetas y lista HTML al nivel elegido, y centrar la cámara al cambiar.
- [x] Conservar asignaciones, visitas, pedidos, presencia y tiempos al cambiar de piso; impedir que un cambio visual descarte un borrador sin resolución explícita.
- [x] Mostrar piso en detalle de mesa/mozo y permitir métricas globales y por piso sin duplicar visitas ni pedidos.
- [ ] Probar dos pisos con mesas homónimas, cambio de nivel durante una visita, cámara/zoom, movimientos, reasignación, cierre y fallback sin WebGL.

**Aceptación:** dos pisos pueden tener mesas con el mismo número visible sin confundir IDs; tocar una mesa abre las acciones de su piso; otro piso no muestra esa geometría, pero la visita y su contador siguen activos. Un mozo puede tener mesas en más de un nivel. Las métricas globales suman ambos y el filtro por piso solo su actividad. La demo empieza con un piso para conservar el recorrido actual.

**Estado:** administración de pisos implementada. La sesión arranca en planta baja; administración puede agregar hasta 10 niveles, renombrarlos, reordenarlos y eliminarlos. No se puede borrar el último piso ni uno ocupado; el historial exige confirmación, se conserva y las asignaciones activas se cierran. Los IDs eliminados no se reutilizan. El selector cambia escena y lista sin tocar el historial. Queda el recorrido integral de P13 en dispositivo y fallback. `yarn test` 51/51, `yarn lint` y `yarn build` aprobados; Chrome local confirmó creación, renombrado, reordenamiento y eliminación. [Captura de administración de pisos](docs/ui/administrar-pisos.png).

## P14 — Tiempo de atención por mesa

**Historia:** como mozo o supervisor quiero ver cuánto tiempo lleva atendida cada mesa ocupada. **Spec:** §14. **Archivos:** domain/visitDuration.ts, App, GuestCountForm, TableDirectory, SceneLabels.

- [x] Calcular tiempo desde `openedAt` de la visita activa; nunca crear un cronómetro independiente por mesa.
- [x] Mostrar duración junto al número de mesa en la escena, en su ficha y en la lista accesible.
- [x] Actualizar cada segundo sin escribir tiempo en el store ni animar la escena continuamente.
- [x] Detener en `closedAt`; al iniciar una visita nueva el contador comienza desde cero, conservando el tiempo histórico de la anterior.
- [x] Probar segundos, minutos, horas, reloj anterior a la apertura y cierre.

**Aceptación:** al ingresar clientes comienza 0 s; durante la visita avanza; al cerrar desaparece de la mesa libre y el historial conserva apertura/cierre. La capacidad, pedidos y reasignaciones no reinician el contador. El tiempo de atención no representa tiempo hasta el primer pedido.

**Registro P14 — 14/10/2026:** se añadió `domain/visitDuration.ts` con cálculo puro desde `openedAt`/`closedAt`, pruebas de tiempo activo/cerrado y formato; `VisitTimer` se integró en escena, barra contextual, listado y formulario. Un reloj local de un segundo actualiza la UI sin escribir en el store. No se agregaron dependencias.

**Comprobado:** `yarn test` 45/45, `yarn lint` y `yarn build` aprobados. En Chrome local el contador cambió entre dos lecturas separadas por 2,4 s y desapareció de la mesa al finalizar la visita. La escena siguió seleccionable y la alternativa HTML mostró el mismo tiempo.

**Evidencia visual:** [contador de mesa ocupada](docs/ui/contador-mesa.png), capturado en Chrome a 1280×720.

**Pendiente:** P13 incluye una prueba de dominio del contador al cambiar de nivel; aún requiere el recorrido visual integral. P11 mantiene las pruebas de carga con 200 mesas.

## Definición de terminado por issue

Registrar archivos modificados, criterios efectivamente verificados, comandos/resultados y pendientes. Para código: lint, build y pruebas significativas del comportamiento cambiado. Para UI: recorrido local y evidencia visual. Estas tareas planificadas no acreditan implementación.

## U01 — Salón fullscreen y acciones contextuales (14/10/2026)

Reorientación solicitada sobre la UI iniciada por OpenCode. Se leyeron SPEC, TASKS y las convenciones locales de escena/validación. Esta entrega actualiza el estado observado de UI y partes de P07/P08; no marca completos los issues anteriores por inferencia.

- [x] Sustituir estilos del dashboard anterior por una escena que ocupa toda la ventana, controles arriba/abajo y paneles deslizantes.
- [x] Mostrar acciones de mesa solo con selección, filtradas por rol; abrir formularios al elegir la acción.
- [x] Agregar selección de mozos en escena/directorio, consulta de sus mesas y acceso a asignación/reasignación.
- [x] Renderizar clientes y mozos con geometría prevista; atención por selección propia y snapshot al cambiar de rol.
- [x] Mantener alternativas HTML, foco del panel, cancelación con Escape y controles de cámara.
- [x] Corregir compilación y suscripciones de pedidos preexistentes; incluir sus pruebas en `yarn test`, compatible con Node 24+ sin flag experimental.
- [x] Conservar humo de eliminación y confirmar reconstrucción de sesión.
- [x] Mantener canvas entre roles; proyectar etiquetas en DOM del árbol principal para evitar fallos de desmontaje de raíces HTML independientes.

**Validación ejecutada:** 35 pruebas aprobadas con `yarn test`; `yarn lint` y `yarn build` correctos (aviso de bundle >500 kB). Chrome Headless 154.0.8037.99 en macOS, CDP: selección de mesa mediante coordenadas del canvas; asignación a Ana; Mi servicio; cuatro clientes; pedido confirmado y entregado; supervisor y snapshot de Ana; movimiento inválido rechazado, guardar coordenadas, cancelar/Escape/cerrar; eliminación; pan por teclado y zoom/reset. WebGL deshabilitado mediante intercepción de `getContext`: lista y asignación operativas. Viewports 1280×720, 768×1024 y 390×844. Recorridos finales sin excepciones no capturadas.

**Evidencia:** [salón](docs/ui/salon-desktop.png), [contexto mesa](docs/ui/mesa-desktop.png), [mozo](docs/ui/mozo-desktop.png), [móvil](docs/ui/mesa-mobile.png), [clientes móvil](docs/ui/clientes-mobile.png), [fallback](docs/ui/sin-webgl.png).

**Pendiente:** gestos/arrastre y pointercancel en dispositivo real; fullscreen del navegador; lector de pantalla; carga máxima y FPS; criterios restantes de P07/P08, eventos de atención y métricas. Dictado y cierre de visita siguen fuera de esta entrega. Scripts CDP temporales, sin runner DOM agregado. La demo conserva operaciones solo en memoria.
