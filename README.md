# Restaurant Sim

Demo local con React, TypeScript, Vite y React Three Fiber. Incluye roles de Administración, Supervisión y Mi servicio sobre una sesión compartida, construcción del salón y eliminación de mesas.

## Ejecutar

```sh
yarn dev
```

Abrir la URL que muestra Vite. Si faltan dependencias, usar `yarn install --frozen-lockfile` con Yarn 1. El entorno utilizado tiene Node 24 y Yarn 1.22.

## Construir el espacio

Elegí **Administración** en el selector **Modo demo** para acceder al formulario.

1. Ingresá la superficie en m² (entre 4 y 2500).
2. Ingresá la cantidad de mesas (0 a 200, según la capacidad del terreno).
3. Presioná **Construir espacio**.

100 m² generan un suelo de 10 × 10 m. Cada mesa es un cubo de 1 m. Se distribuyen desde el centro, dejando 1 m entre cubos y al menos 0,5 m hasta el borde. Una construcción válida reemplaza el espacio y ajusta la cámara; los errores conservan la escena anterior.

## Seleccionar y eliminar mesas

- Hacé clic en un cubo para resaltarlo y abrir un menú sobre la mesa.
- **Mover mesa** inicia una vista previa para Administración y Supervisión, solo en mesas libres.
- **Eliminar mesa** abre la confirmación. **Cancelar** vuelve al menú sin borrar.
- **Confirmar** elimina la mesa con una nube de humo. El contador se actualiza; las demás mesas conservan posición, identificación y color.
- **Escape** vuelve de la confirmación al menú o cierra el menú. También podés cerrarlo con la cruz o haciendo clic en el suelo.
- La animación se acorta si el sistema solicita movimiento reducido.

La lista HTML debajo de la escena comparte la selección y permite consultar detalles, cancelar y confirmar eliminaciones sin WebGL. Usá Tab y Enter/Espacio para seleccionar sus botones. Administración y Supervisión pueden eliminar mesas libres; Mi servicio no permite editar la distribución. El humo se reproduce al eliminar desde la escena.

## Roles de demo

- **Administración:** formulario de construcción, consulta del salón y eliminación de mesas libres.
- **Supervisión:** consulta del salón y eliminación de mesas libres; no puede reconstruirlo.
- **Mi servicio:** selector de Ana, Bruno o Carla; ve el estado general y solo accede a detalles operativos de sus mesas asignadas.

Cambiar de rol o mozo conserva la sesión y limpia selección/edición temporal. Un borrador pendiente bloquea el cambio hasta descartarlo expresamente o seguir editando. Administración y Supervisión ya pueden asignar mesas desde su detalle. Mi servicio comienza sin mesas propias hasta que se asignen. Los pedidos llegan en P07. La matriz de permisos es compartida por UI y acciones implementadas, y representa reglas locales de demo.

## Controles de cámara

- Arrastrar con botón izquierdo o derecho: desplazarse sobre el suelo. Un arrastre no debe abrir el menú de mesa.
- Rueda o botones **+ / −**: acercar y alejar.
- **Restablecer vista** o centrar: recuperar el encuadre inicial.
- Con foco en la escena: flechas para desplazarse, **+ / −** para zoom y **0** para restablecer.
- Pantalla táctil: un dedo desplaza; dos dedos permiten desplazar y hacer zoom.

Eliminar una mesa conserva el encuadre. Reconstruir restablece cámara, selección y efectos.

## Validación

```sh
yarn test
yarn lint
yarn build
yarn preview
```

Las pruebas usan el runner integrado de Node 24, sin dependencias adicionales. `yarn test` ejecuta `node --test tests/space.test.mjs src/features/restaurant/state/sessionStore.test.ts src/features/restaurant/domain/permissions.test.ts`. Cubren distribución, eliminación, referencias, números estables, errores sin mutaciones, eventos atómicos, reloj no decreciente, limpieza al reiniciar, aislamiento entre sesiones, permisos y navegación con borradores. Los tests TypeScript se comprueban con la configuración Node; el código de aplicación, con la del navegador. Ambas usan `strict` explícito.

Validación P02 (13/10/2026): 15 pruebas aprobadas, `yarn lint` y `yarn build` correctos. Vite advierte de un bundle mayor a 500 kB. Los roles, teclado, fallback sin WebGL, confirmación, gestos, humo y cámara siguen pendientes de validación visual: no hubo navegador disponible en la herramienta de UI de la sesión. No hay pruebas DOM/WebGL automatizadas.

## Alcance y estructura

No hay backend, autenticación ni persistencia. Al recargar se vuelve a 100 m² y 6 mesas. El input de cantidad configura la próxima construcción; el contador muestra las mesas presentes después de las eliminaciones.

- `src/App.tsx`: formulario, proyección del estado compartido y controles HTML.
- `src/features/restaurant/domain`: tipos de entidades, errores y contratos de operaciones futuras.
- `src/features/restaurant/data`: tres mozos y catálogo determinista con precios enteros en centavos ARS.
- `src/features/restaurant/state`: store de sesión Zustand, selectores por ID y pruebas con Node.
- `src/features/supervisor/domain/space.ts`: capacidad, distribución y eliminación.
- `src/features/supervisor/scene/RestaurantScene.tsx`: suelo, mesas, selección y cámara.
- `src/features/supervisor/scene/TableMenu.tsx`: opciones y confirmación.
- `src/features/supervisor/scene/SmokeEffect.tsx`: animación de desaparición.
- [SPEC.md](SPEC.md): alcance y arquitectura.
- [TASKS.md](TASKS.md): issues P01–P11 de la demo operativa y P12 de evolución futura; incluye subtareas, dependencias y criterios de aceptación.
- [Presentación de roles](docs/planning/slides/restaurant-sim-roles.pptx): planificación de administrador, supervisor y mozos.

## Próxima etapa planificada

P01 tiene implementada la base del dominio y sesión. Zustand ya estaba instalado y ahora centraliza las entidades, construcción, eliminación y selección. `tables` y `placements` son la fuente de verdad; `SpaceLayout` se deriva para reutilizar la escena B01/B02 sin mantener otra colección. Solo el humo conserva coordenadas temporales para su animación. La fábrica de store acepta reloj y generador de IDs para pruebas; el hook comparte una única instancia en memoria. Reconstruir cambia la sesión y recargar crea una nueva.

Las operaciones futuras tienen contratos tipados, pero no acciones vacías ejecutables. Las reglas completas y confirmaciones operativas se implementarán en sus issues. P02 agrega navegación, permisos y lista HTML accesible; P03 agrega movimiento con vista previa, P04 asignaciones y P05 clientes/visitas. La próxima implementación según el backlog es P07: pedidos, seguida de P06: dictado. La comprobación visual de P01–P05 permanece pendiente.

El spec del 13 de octubre de 2026 incorpora además dictado, pedidos, avatares simples y métricas de sesión. Los clientes serán esferas y los mozos cubos pequeños. Estas funcionalidades posteriores a P05 todavía no están implementadas.

## Ingresar clientes (P05)

Asigná una mesa a un mozo. Como ese mozo, o desde Administración/Supervisión, seleccioná la mesa e ingresá una cantidad entera entre 1 y su capacidad. **Confirmar ingreso** crea la visita y marca la mesa como ocupada. El menú de la escena incluye **Ingresar clientes**, que lleva al formulario HTML.

En una mesa ocupada, **Guardar cantidad** permite corregir comensales sin cambiar la hora de ingreso. El contador muestra cantidad/capacidad. Administración y Supervisión pueden cambiar la capacidad de 1 a 8 solo mientras la mesa esté libre. Una mesa ocupada no se puede mover ni eliminar. El cierre de visita llegará en P09; todavía no hay avatares ni dictado.

Validación P05: 27 pruebas aprobadas con `yarn test` (incluye `domain/visits.test.ts`), lint sin advertencias y build correcto. Recorrido visual y teclado pendientes por falta de navegador conectado a la herramienta.

## Asignar mesas (P04)

Como Administración o Supervisión, seleccioná una mesa y elegí Ana, Bruno o Carla en **Responsable de la mesa**, debajo de la escena. **Guardar responsable** confirma el cambio; **Sin asignar** retira el responsable de una mesa libre. Un mozo puede tener varias mesas. La lista y Mi servicio reflejan la nueva asignación inmediatamente.

El dominio conserva los intervalos históricos. Reasignar una mesa ocupada exige reemplazo y confirmación, además del descarte explícito de cualquier borrador. Los pedidos anteriores conservan su responsable histórico. Estos casos se probaron con fixtures hasta que P05/P07 permitan el recorrido desde la UI.

Validación P04: 23 pruebas aprobadas con `yarn test` (incluye `domain/assignments.test.ts`), lint sin advertencias y build correcto. Formulario y teclado pendientes de revisión visual por falta de navegador conectado a la herramienta.

El plan anterior se conserva en `docs/planning/archive/` como referencia histórica.

## Mover mesas (P03)

Elegí una mesa libre y pulsá **Mover mesa**. Arrastrá el cubo de vista previa o editá X/Z en el detalle debajo de la escena, en pasos de 0,5 m. Verde indica posición válida; rojo, inválida. Soltar no guarda: usá **Guardar posición** para confirmar. Se exige margen de 0,5 m al borde y separación de 1 m entre cubos en al menos un eje.

Cancelar, Escape, cambiar de rol/mesa o perder la captura durante el gesto descartan la edición. La cámara queda pausada durante el modo mover y recupera sus controles al terminar. La alternativa por coordenadas funciona sin WebGL.

Validación P03: 19 pruebas aprobadas (`yarn test`, ahora incluye `domain/movement.test.ts`), lint sin advertencias y build correcto. Localhost:5173 respondió HTTP 200. Falta validación visual de arrastre, captura, teclado, cámara y resize porque la herramienta no detectó un navegador disponible. La próxima implementación es P04: asignaciones.
