---
name: Validación visual en navegador
description: Usar cuando un cambio toca la UI o la escena de Restaurant Sim y falta comprobarlo en navegador. Describe cómo levantar el dev server, qué recorrer y cómo dejar registro de la evidencia obtenida.
---

# Validación visual — Restaurant Sim

P01–P05 tienen la validación visual **pendiente** porque en sesiones anteriores no había navegador disponible. Este skill define cómo destrabarla y qué acreditar.

## Requisito

Necesito un navegador real (Playwright/chromium o el navegador del usuario). Si no hay navegador disponible, **declararlo explícitamente**: no simular la prueba ni dar el criterio de UI por cumplido.

## Levantar el entorno

```sh
yarn dev        # desarrollo, http://localhost:5173
yarn build && yarn preview   # build de producción
```

## Recorrido base (spec §10)

1. Administración: construir 100 m² / 6 mesas.
2. Mover una mesa libre (arrastre, Guardar, Cancelar, Escape).
3. Asignar dos mesas a Ana y una a Bruno.
4. Como Ana: ingresar clientes (dictar «cuatro» cuando exista P06) y confirmar pedido (P07).
5. Supervisión: ver métricas (P10) y reasignar.
6. Finalizar visita (P09) y reiniciar.

## Casos negativos a probar

Mesa ajena · mover fuera del terreno / sobre otra mesa / mesa ocupada · voz denegada o tardía (P06) · cantidad inválida · doble confirmación · pedido vacío · finalizar con entregas pendientes · reset cancelado.

## Accesibilidad y responsive

- Teclado y foco visible en lista, paneles y menú de escena.
- Alternativa HTML con WebGL deshabilitado (lista + paneles deben seguir funcionando).
- `prefers-reduced-motion` (humo).
- Viewports 1280×720, 768×1024 y 390×844, sin desbordamiento de formularios.

## Rendimiento (P11)

30 s de pan/zoom con 25 mesas y con 200 mesas / 1600 clientes. Registrar navegador, GPU, resolución y DPR. Objetivo provisional ~60 FPS sin caídas sostenidas bajo 30.

## Registro de evidencia

- Capturas de los cambios visuales (adjuntarlas o guardarlas en el issue).
- Anotar en `TASKS.md` qué se recorrió de verdad, con navegador y fecha.
- Si algo quedó sin probar, va en el bloque **Pendiente**. Ver skill `tarea-workflow`.
