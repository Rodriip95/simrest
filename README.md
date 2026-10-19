# Restaurant Sim

Demo local con React, TypeScript, Vite, React Three Fiber y Zustand. El salón ocupa toda la ventana; roles y controles flotan sobre la escena. Mesas, clientes, pedidos y mozos comparten una sesión en memoria.

## Ejecutar

```sh
yarn install --frozen-lockfile
yarn dev
```

Usar Yarn 1 y Node 24 o posterior. Verificado con Node 26.11.1 y Yarn 1.22.22. Recargar reinicia la demo. No se agregaron dependencias para esta UI.

## Interfaz del salón

- Arriba: Administración, Supervisión y Mi servicio. Este último permite elegir Ana, Bruno o Carla.
- Abajo: directorios de Mesas y Mozos, e Indicadores de sesión; Administración también tiene Salón para construir/reiniciar.
- Tocar una mesa muestra su selección y acciones en la barra inferior. Elegir Detalle, Clientes, Asignar mozo, Pedidos o Mover abre el formulario correspondiente en un panel deslizante.
- La selección no abre automáticamente un panel que tape la escena. Cerrar un formulario conserva la selección y el borrador; la cruz de la barra deselecciona, con confirmación si hay un pedido pendiente.
- Tocar el cubo o nombre de un mozo permite consultar sus mesas y última atención simulada. El directorio permite abrir una mesa para asignar o reasignar su responsable. Mi servicio muestra únicamente su propio avatar y clientes.
- Mesas verdes: libres; ámbar: ocupadas. El resaltado celeste identifica la selección. Clientes: esferas; mozos: cubos de 0,28 m.
- Las mesas ocupadas muestran cuánto tiempo llevan en atención desde el ingreso de clientes. El contador aparece también en la barra y el listado; se detiene al finalizar la visita.
- El botón superior de pantalla completa usa la API del navegador cuando está disponible. El salón ocupa toda la ventana incluso sin esta API.
- Los directorios y formularios HTML siguen funcionando sin WebGL.

## Recorrido

1. En Administración, seleccioná una mesa y usá **Asignar mozo** → Ana → **Guardar responsable**.
2. Cambiá a **Mi servicio**, elegí Ana y seleccioná su mesa desde la escena o el directorio.
3. En **Clientes**, ingresá de 1 a la capacidad o usá **Dictar cantidad**. El dictado propone un valor editable y requiere confirmación. Aparece una esfera por cliente.
4. En **Pedidos**, agregá productos, cantidades y observaciones; confirmá el pedido y marcá la entrega.
5. En **Supervisión**, seleccioná Ana y abrí **Mesas y acciones** para ver sus asignaciones y última atención simulada. La selección de una mesa propia representa atención; deseleccionarla la libera. El cambio a Supervisión conserva un snapshot.
6. Entregá los pedidos y usá **Finalizar visita** desde Clientes. La mesa vuelve a libre, conserva el responsable y mantiene su historial. Indicadores permite revisar actividad global o por mozo.

Administración y Supervisión pueden asistir mesas asignadas y reasignar responsables. Cambiar el responsable de una mesa ocupada requiere confirmación; los pedidos previos conservan su atribución. Un borrador bloquea cambios de mesa/rol hasta descartarlo expresamente.

## Distribución y cámara

**Salón** permite construir entre 4 y 2500 m², con 0–200 mesas según capacidad. Reconstruir requiere confirmación porque elimina las operaciones de la sesión.

En una mesa libre, **Mover** abre vista previa: arrastrá el cubo o editá X/Z en pasos de 0,5 m. Guardar confirma una posición válida; Cancelar, Escape o cerrar el panel descartan la vista previa. La cámara se pausa durante el movimiento. **Detalle** incluye eliminación confirmada, con humo y respeto por movimiento reducido.

Arrastrar desplaza la cámara; rueda o +/− ajustan zoom; **Centrar salón** restablece el encuadre. Con foco en la escena, flechas desplazan, +/− hacen zoom y 0 centra. Un dedo desplaza y dos permiten zoom. Seleccionar o cambiar de rol conserva el encuadre; reconstruir lo restablece.

## Validación del 14/10/2026

```sh
yarn test
yarn lint
yarn build
```

51 pruebas de dominio, estado y dictado aprobadas; lint y build correctos. Vite mantiene el aviso de bundle mayor a 500 kB. `yarn test` usa `node --test` e incluye geometría y los archivos colocados bajo domain, state y speech. Node moderno ejecuta estos archivos TypeScript directamente, sin el flag experimental retirado en Node 26.

Recorrido local mediante Chrome Headless 154.0.8037.99 y CDP: clic sobre mesa 3D, barra contextual, asignación, cambio de rol, cuatro clientes, confirmación/entrega de pedido, consulta del mozo y snapshot, movimiento por coordenadas (válido e inválido), cancelación/Escape/cierre, eliminación, pan por teclado, zoom/reset y formularios sin WebGL. Revisados tamaños 1280×720, 768×1024 y 390×844. Sin excepciones no capturadas en los recorridos finales.

Capturas: [salón](docs/ui/salon-desktop.png), [mesa](docs/ui/mesa-desktop.png), [contador activo](docs/ui/contador-mesa.png), [varios pisos](docs/ui/varios-pisos.png), [administración de pisos](docs/ui/administrar-pisos.png), [mozo](docs/ui/mozo-desktop.png), [móvil](docs/ui/mesa-mobile.png), [clientes móvil](docs/ui/clientes-mobile.png), [sin WebGL](docs/ui/sin-webgl.png).

Pendiente: arrastre completo y pérdida de captura en dispositivo táctil real, API fullscreen real, revisión exhaustiva con lector de pantalla, 30 s de rendimiento con 200 mesas/1600 clientes. Las verificaciones de navegador de esta entrega se ejecutaron como scripts temporales CDP; no se incorporó un runner DOM.

## Arquitectura y alcance

El dominio y las acciones permanecen en `src/features/restaurant/domain` y `state`; la UI no mantiene copias de entidades. La selección de mesa está en Zustand, y la selección de mozo y panel abierto son transitorios de la interfaz. `SceneLabels` proyecta etiquetas en una capa HTML del mismo árbol React: evita crear una raíz React por mesa y actualiza posiciones solo al renderizar la escena bajo demanda. DPR [1, 1.5].

Los paneles se montan cuando se abren; los borradores de pedidos permanecen en el store. Cambiar rol o sesión limpia los paneles y la selección de mozo sin recrear el canvas por rol. Las operaciones gráficas no escriben posiciones del dominio por frame.

Siguen pendientes el micrófono físico, la validación integral y medición de rendimiento (P11). Varios pisos ya permite crear, renombrar, ordenar y eliminar niveles, cambiar la vista y filtrar métricas; el recorrido integral de P13 en móvil y fallback sigue pendiente. No hay caminatas simuladas, backend, autenticación, persistencia, pagos ni seguimiento real de personas.

[SPEC.md](SPEC.md) y [TASKS.md](TASKS.md) conservan el plan y registran esta entrega. La planificación anterior y la presentación de roles están en `docs/planning/`.
