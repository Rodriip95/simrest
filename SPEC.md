# Restaurant Sim — Especificación funcional y técnica

Versión 2 · 13 de octubre de 2026 · Planificación de una demo operativa local.

Este documento reemplaza el plan anterior. Describe trabajo futuro salvo el estado observado. [TASKS.md](TASKS.md) contiene los issues y subtareas. La [especificación anterior](docs/planning/archive/SPEC-2026-10-09.md) queda como referencia histórica, sin prevalecer sobre este alcance.

## 1. Objetivo, estado y alcance

Un administrador configura el salón, un supervisor distribuye mesas y observa la atención, y los mozos registran clientes y pedidos al seleccionar una mesa. Cambiar de rol comparte datos de una misma sesión local. Las métricas derivan de las operaciones de esa sesión.

Requisitos solicitados: roles administrador, supervisor y mozo; mesas móviles; pedidos desde una mesa; cantidad de clientes por dictado; avatares para supervisión; métricas y asignaciones. Clientes: esferas pequeñas. Mozos: cubos pequeños, con silueta cuadrada desde arriba y menores que las mesas.

Decisiones propuestas: interpretar dictado como voz con alternativa manual; admin/supervisor asignan mesas; cada mozo opera las propias; mover solo mesas libres; capacidad inicial de cuatro personas. Son decisiones revisables del plan, no funcionalidades implementadas.

| Área | Existe en el código | Pendiente |
| --- | --- | --- |
| Construcción B01 | Terreno cuadrado 4–2500 m², 0–200 mesas según capacidad; cubos de 1 m, grilla de paso 2 m | Distribución manual |
| Interacción B02 | Selección, menú, eliminación confirmada y humo | Mover está deshabilitado |
| Cámara | Pan, zoom, reset y controles HTML/teclado; render bajo demanda | Regresión con nuevas interacciones |
| Operación | Espacio en App y selección en escena | Roles funcionales, asignaciones, visitas, pedidos y métricas |
| Calidad | ESLint, build y tests de espacio con Node; sin script test | Strict explícito, pruebas nuevas y validación visual |

Los colores actuales alternan por ID y no representan ocupación. La navegación de la maqueta no acredita módulos funcionales. La validación visual B01/B02 sigue pendiente según el registro previo.

Frontend con mocks y memoria local. Recargar reinicia la demo. Fuera de alcance: backend, autenticación real, base de datos, pagos, cocina, sockets, múltiples dispositivos y seguimiento físico de personas. El dictado opcional usa capacidades del navegador encapsuladas en un adaptador, sin servicio pago nuevo ni promesa de reconocimiento offline. No guardar audio.

## 2. Roles y navegación

Selector visible «Modo demo»: Administrador, Supervisor y Mozo. Para Mozo se elige un empleado mock activo. Cambiar de rol conserva operaciones confirmadas, limpia selección/edición y detiene micrófono. Resolver borradores antes de salir. No simular login ni permisos de servidor.

| Acción | Administrador | Supervisor | Mozo |
| --- | --- | --- | --- |
| Consultar salón | Todas las mesas | Todas las mesas | Todas, detalle operativo solo de propias |
| Construir/reiniciar | Sí, con confirmación si hay cambios | No | No |
| Mover/eliminar mesa libre y editar capacidad | Sí | Sí | No |
| Asignar/reasignar | Sí | Sí | No |
| Ingresar clientes y tomar/entregar pedidos | Cualquier mesa asignada | Cualquier mesa asignada | Mesas propias |
| Finalizar visita | Cualquier mesa asignada | Cualquier mesa asignada | Mesas propias |
| Ver avatares | Todo el salón | Todo el salón | Propio y clientes de sus mesas |
| Ver métricas | Globales y por mozo | Globales y por mozo | Propias |

Validar reglas tanto en UI como en acciones del dominio. Son reglas de demo, no seguridad real. Admin/supervisor puede asistir sin convertirse en mozo responsable: separar actor de la acción y responsable de la mesa.

Vistas: Administración (configuración y salón), Supervisión (salón, asignaciones y métricas), Mi servicio (mesas propias y pedidos). Lista HTML y escena comparten selección por ID y panel. Acciones visibles según rol, con navegación por teclado.

## 3. Movimiento y distribución

Seleccionar una mesa libre y «Mover» activa edición explícita en X/Z, sin rotación. Arrastrar muestra preview ajustado a pasos de 0,5 m; suspender pan de cámara durante el gesto. Soltar conserva preview. «Guardar posición» confirma solo si el destino es válido. Escape, Cancelar, pointercancel o pérdida de captura revierten la edición. Cambiar rol también la cancela.

Alternativa accesible: inputs X/Z con paso 0,5 m, mismo validador y Guardar/Cancelar. Fuera del modo mover, conservar cámara y umbral de clic de 5 px. Guardar no resetea cámara.

Reglas: lado de mesa 1 m; margen mínimo de 0,5 m desde el cubo al borde del terreno. Para cada par de mesas exigir `abs(dx) >= 2 || abs(dz) >= 2`, dejando al menos 1 m entre cubos en un eje. Rechazar valores no finitos, ID inexistente y posición inválida sin cambiar el dominio. Guardar conserva ID, número, asignación y resto de mesas. Una visita activa bloquea mover/eliminar y editar capacidad.

Eliminar conserva confirmación y humo B02; retira la asignación y referencias transitorias, pero conserva historial de visitas cerradas/pedidos. Reconstruir implica reinicio de sesión: confirmar pérdida de datos, generar sessionId y limpiar visitas, pedidos, asignaciones, métricas y efectos. Cancelar conserva todo.

## 4. Asignación y atención

Tres mozos mock activos, IDs estables y nombres ficticios, con colores y etiquetas. Una mesa tiene cero o un responsable; un mozo puede tener varias mesas. Se permiten asignaciones sobre mesas libres. Una visita requiere un mozo activo asignado.

Admin/supervisor selecciona mesa, elige mozo y confirma. Reasignar una mesa ocupada requiere confirmación. No retirar su responsable sin reemplazo mientras esté ocupada. Reasignar al mismo es un no-op. Antes de reasignar, advertir si existe borrador: descartarlo expresamente o cancelar la reasignación.

Registrar intervalos históricos de asignación. Los pedidos previos conservan el responsable al confirmar; los próximos usan el nuevo. No alterar clientes, precios, tiempos ni actores pasados. El mozo anterior pierde acceso de edición a esa mesa.

Asignación y atención son distintas. Un avatar por mozo, aunque tenga varias mesas. Abrir el panel de una mesa propia inicia atención; cambiar de mesa desplaza el marcador; cerrar el panel/finalizar libera atención. Al cambiar a Supervisor se conserva la última ubicación como snapshot con etiqueta «Última atención simulada», para demostrar el flujo entre roles sin afirmar presencia en vivo. Admin/supervisor que asiste una mesa no cambia la presencia del mozo. Al reasignar, liberar cualquier presencia del responsable anterior sobre esa mesa.

## 5. Clientes, dictado y visitas

En mesa libre asignada, «Ingresar clientes» abre cantidad y capacidad. Capacidad propuesta: 4, editable entre 1 y 8 por admin/supervisor solo con mesa libre. Confirmar un entero entre 1 y capacidad crea visita con hora e IDs anónimos de clientes. No pedir nombres ni datos personales.

Dictado: botón explícito «Dictar cantidad», preferencia es-AR, indicador de escucha y Detener/Cancelar. Interpretar un único entero en dígitos o palabras de uno a ocho, también frases simples como «somos cuatro». Rechazar cero, negativos, decimales, múltiples cantidades y resultados ambiguos. El resultado es editable y exige confirmación antes de crear clientes. Revalidar capacidad al confirmar.

Cancelar o cambiar mesa/rol detiene captura e invalida callbacks tardíos. Sin soporte, permiso denegado, silencio o error: mensaje concreto y formulario manual disponible. Avisar antes de activar que el proveedor del navegador puede procesar audio remotamente. No almacenar audio ni transcripciones en eventos.

Corregir cantidad preserva visita, hora y clientes existentes. Aumentar agrega IDs; reducir retira últimos IDs. Pedidos pertenecen a visita/mesa, no a individuos. No borrar pedidos por corregir comensales.

Finalizar visita exige confirmación, ausencia de pedidos confirmados sin entregar y resolución explícita del borrador. Fijar closedAt, retirar esferas y liberar atención. Mesa vuelve a libre y conserva asignación. Esto no representa cobro. La siguiente ocupación crea otra visita.

## 6. Pedidos desde la mesa

Clic en mesa propia ocupada abre detalles y pedido. En libre propone ingresar clientes. En ajena muestra identificación/estado y explica acceso, sin detalle de pedidos. Admin/supervisor accede al mismo flujo de asistencia.

Catálogo mock con ID, nombre, precio en centavos, moneda ARS y disponibilidad. Un borrador por visita; líneas con producto, cantidad entera 1–99 y observación de hasta 200 caracteres. Agregar/quitar/modificar recalcula total. Impedir confirmación vacía o con productos no disponibles. Al confirmar, guardar nombre y precio histórico. Cálculos monetarios con enteros.

Estados: borrador de interfaz, `confirmed`, `delivered`. Una visita admite varios pedidos. Confirmar crea pedido inmutable y limpia borrador. «Marcar entregado» es manual y registra hora. Cocina, cancelación de pedidos confirmados y pagos quedan diferidos.

Bloquear doble clic y reutilizar commandId para que reintentar no duplique pedidos/eventos. Error conserva borrador. Salir con cambios ofrece seguir editando o descartar. Entrega repetida es un no-op. Guardar actorId y waiterIdAtConfirmation por separado, con atribución estable tras reasignar.

## 7. Avatares y escena

Una unidad equivale a un metro. Clientes: esfera de radio propuesto 0,12 m. Mozos: cubo de lado propuesto 0,28 m. Placeholders reemplazables, sin assets externos.

Una esfera por cliente activo alrededor de su mesa, offsets deterministas para hasta ocho, color neutro y contador HTML «4/4 clientes». Un cubo por mozo al costado de su mesa de atención, fuera de los offsets de clientes. Sin atención, posición de espera determinista dentro del terreno. Sin rutas físicas, colisiones ni animación de caminata en esta etapa.

Supervisor/admin ve todo el salón. Seleccionar avatar muestra nombre, última mesa atendida y asignaciones. Etiquetas distinguen asignación y atención simulada. Avatares no deben impedir selección de mesas.

Estado de mesa derivado de visita activa: libre/ocupada. «Pendiente de pedido» significa visita sin pedidos confirmados. Reemplazar colores decorativos por estado con texto/leyenda; selección usa otro indicador. Lista y formularios siguen funcionando sin WebGL.

Actualizar marcadores por cambios de dominio, nunca escribir posiciones al store por frame. Conservar render bajo demanda, DPR [1, 1.5] y humo con movimiento reducido. Medir 25 mesas como caso habitual y límite de 200 mesas con hasta 1600 esferas; registrar hardware y limitaciones antes de prometer fluidez.

## 8. Métricas de sesión

Mostrar «Sesión demo desde [hora]». Admin/supervisor filtra global o mozo; mozo solo ve actividad propia. Reiniciar/recargar reinicia métricas. Selectores calculan desde entidades/eventos; reloj de baja frecuencia solo para esperas actuales.

| Indicador | Cálculo | Atribución por mozo |
| --- | --- | --- |
| Ocupación | Mesas con visita activa / mesas existentes × 100 | Ocupadas asignadas / asignadas actuales |
| Clientes presentes | Suma guestCount de visitas activas | Responsable actual |
| Mesas asignadas | Cantidad actual de asignaciones activas | Mozo seleccionado |
| Pedidos confirmados | Pedidos únicos de sesión, incluidos entregados | waiterIdAtConfirmation |
| Consumo registrado | Suma cantidad × precio histórico de pedidos confirmados/entregados, ARS | waiterIdAtConfirmation; no son ingresos/cobros |
| Espera hasta primer pedido | Promedio firstConfirmedAt − openedAt, solo visitas con primer pedido | Responsable del primer pedido |
| Mesas pendientes | Visitas activas sin pedido confirmado, con espera actual | Responsable actual |

Denominador cero/muestra vacía: «Sin datos». Pedidos de visitas cerradas siguen en métricas hasta reset. Borradores no cuentan. No duplicar por renders/reintentos. Reloj inyectable para tests y timestamps no decrecientes por sesión. Sin rankings ni umbrales de demora nuevos.

## 9. Modelo y arquitectura

Conservar stack de package.json y yarn.lock: React, TypeScript, Vite, Three, Fiber y Drei. Zustand ya declarado se justifica ahora por tres vistas compartidas. Sin nuevas dependencias en esta planificación.

| Entidad | Campos principales e invariantes |
| --- | --- |
| DemoSession | id, startedAt, activeRole, activeWaiterId; un local mock |
| Table | id, number, capacity 1–8; número estable |
| TablePlacement | tableId, x, z; una ubicación válida por mesa |
| Waiter | id, name, color, active |
| Assignment | id, tableId, waiterId, startedAt, endedAt; una activa por mesa |
| Visit | id, tableId, guestCount, customerIds, openedAt, closedAt; una activa por mesa |
| Product | id, name, unitPriceCents, currency, available |
| Order | id, commandId, visitId, tableId, actorId, waiterIdAtConfirmation, items, status, confirmedAt, deliveredAt |
| OrderItem | productId, nameSnapshot, unitPriceCents, quantity, note, currency |
| WaiterPresence | waiterId, attendingTableId, lastAttendedAt, snapshotOnly; una mesa por mozo |
| OperationEvent | id, commandId, sessionId, type, actorId, entityId, occurredAt, payload mínimo |

Reglas puras independientes de React/Three. Store con entidades y acciones explícitas: moveTable, deleteTable, setCapacity, assignTable, openVisit, updateGuestCount, startAttention, stopAttention, confirmOrder, deliverOrder, closeVisit, resetSession. Validar permisos, referencias y transición antes de mutar. Entidad y evento cambian juntos. Error conserva estado. Inyectar generador de IDs y reloj para pruebas.

Estado transitorio separado: selectedTableId, movePreview, orderDraft, micState y errores. Derivar selección por ID; no duplicar entidades en meshes ni mantener contadores desincronizados. Historial retiene tableId/number aunque una mesa libre se elimine después.

Crear módulos al implementar: `src/features/restaurant/domain`, `data`, `state`, `components` y `speech`. Reutilizar `src/features/supervisor/scene` y `domain/space.ts`; evitar migraciones masivas sin consumidor real.

## 10. Criterios de aceptación y validación

Recorrido: admin configura 100 m² y seis mesas, mueve una libre, asigna dos a Ana y una a Bruno. Ana abre su mesa, dicta «cuatro», revisa y confirma; aparecen cuatro esferas. Confirma pedido. Supervisor ve cubo de Ana, última atención y métricas. Reasigna a Bruno; pedido previo sigue atribuido a Ana. Bruno registra otro pedido, entrega ambos y finaliza. Mesa libre conserva asignación a Bruno.

Casos negativos: mesa ajena; mover fuera del terreno/sobre otra mesa/ocupada; voz denegada o tardía; cantidad inválida; doble confirmación; pedido vacío; finalizar con entregas pendientes; reset cancelado. Probar lista/panel sin WebGL.

Al implementar ejecutar `yarn lint`, `yarn build`, tests existentes `node --test tests/space.test.mjs` y nuevos tests de dominio con Node 24. Colocar nuevos `*.test.ts` junto al dominio y documentar comando al crearlos. Runner DOM solo si una tarea concreta lo justifica. Validación manual: mouse, teclado, cámara/zoom, dictado y fallback, resize y reinicio. Documentar lo ejecutado, sin asumir éxito.

Esta revisión cambia documentación y presentación. No implementa estas funcionalidades ni acredita nuevas pruebas de código o navegador.

## 11. Entregas y futuro

P01–P02: dominio y roles. P03–P04: mover y asignar. P05–P06: visitas manuales y voz. P07–P08: pedidos y avatares. P09–P10: cierre e indicadores. P11: recorrido y medición. Dependencias exactas en TASKS.

P12 reserva backend, persistencia, identidad, permisos reales, concurrencia, cocina y caja. La visión previa de monolito modular y base relacional queda como hipótesis futura, sin fijar proveedor. Aislamiento por local, idempotencia y eventos confirmados serán requisitos antes de operar datos reales. La demo no depende de esa etapa.
