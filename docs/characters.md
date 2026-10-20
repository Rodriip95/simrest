# Camareros chibi

Modelos originales construidos en Blender a partir de la referencia visual suministrada por el usuario. Son una interpretacion geometrica estilizada, no una reproduccion esculpida exacta.

- Fuente editable: `assets-source/characters/restaurant-waiters.blend`.
- Vista previa: `assets-source/characters/waiters-preview.png`.
- Modelos: `public/models/waiter-male.glb` y `waiter-female.glb`.
- Script reproducible: `scripts/blender/create_waiters.py` (ejecutar dentro de Blender; crea una escena nueva).

Cada personaje tiene 16 huesos y pesos asignados a todas sus piezas. Las piezas de extremidades se articulan como volumenes independientes: el rig esta preparado para esta estetica, no para deformaciones anatomicas realistas. Pelo, rasgos y uniforme estan incluidos. No hay texturas externas ni dependencias nuevas.

Los dos GLB incluyen `Idle` y `Walk`, clips ciclicos de un segundo a 24 fps. `Walk` es una caminata en el lugar, sin movimiento de la raiz. En Blender, la escena Restaurant Waiters queda con Walk activo: reproducir los fotogramas 1-25. El archivo tambien conserva la escena original.

GLB: Y arriba, frente +Z, origen a los pies, altura aproximada 1.7 m incluyendo pelo. En la app se muestran a escala 0.55 para el salon. `WaiterCharacter` clona el esqueleto por instancia y acepta `animation="Walk"`; por defecto reproduce `Idle`. El planificador de rutas y la sincronizacion de velocidad con desplazamientos quedan fuera de este trabajo de modelado: la escena actual sigue usando las posiciones de presencia del dominio.

Validacion: inspeccion de render y de cuatro poses del ciclo en Blender; verificacion de pieles y clips de los GLB con Three.js. Ver resultados de lint/build/test en el registro de la tarea. La revision interactiva de seleccion y camara requiere navegador habilitado.
