# Referencia visual SIMREST

Fuente: [resim](https://www.figma.com/design/56f3iyoOVza9DPZUwCqbHa/resim?node-id=0-1).
Revisión: 19 de octubre de 2026.

Se obtuvieron contexto de diseño y capturas de Wireframe 1 (`3:8`), Wireframe 2 (`3:15`) y ModalMesa (`3:77`).

## Implementación

- `SalonSidebar`: navegación lateral oscura, marca SIMREST y acceso a los paneles existentes. Cocina y Stock se muestran deshabilitados; no se simula una sesión autenticada ni cierre de sesión.
- `SalonStatus`: ocupadas, libres y reloj, con datos del piso activo.
- `TableSummaryCard`: tarjeta de mesa seleccionada, estado, clientes, mozo, duración y pedidos. Respeta permisos y abre el detalle existente.
- `figma-theme.css`: colores, superficies, bordes y distribución derivados de los frames. Texto ampliado respecto del componente de 118 × 192 para mantener legibilidad.
- `public/figma`: recursos originales descargados localmente. SVG con dimensiones intrínsecas preservadas; no hay URLs temporales en la aplicación.

La cafetería del diseño es una imagen raster, no un modelo 3D. El botón Referencia visual permite verla; la vista principal conserva el salón interactivo existente, pisos y acciones. La escena 3D todavía no reproduce la ambientación de esa imagen. Se utiliza Poppins/Inter si están disponibles en el sistema y Segoe UI como alternativa; no se incluyeron archivos de fuente.

## Validación

51 pruebas de dominio aprobadas y build correcto. Se comprobó que los ocho recursos locales existen y no están vacíos, y se inspeccionaron las dimensiones raíz de los SVG.

La verificación visual de geometría renderizada, adaptación móvil, interacciones y comparación final sigue pendiente: la herramienta devuelve «Local browser use is disabled in Work settings». No se acredita coincidencia pixel a pixel ni prueba manual de la nueva UI.
