# Mobiliario chibi

Primera familia de mobiliario creada en Blender: madera clara, bordes redondeados y tapizados suaves para combinar con los personajes.

- `table-square.glb`: mesa cuadrada de 1 x 1 m, altura 0.75 m.
- `table-round.glb`: mesa circular de 1 m de diametro, altura 0.75 m.
- `chair-sage.glb`, `chair-terracotta.glb`, `chair-cream.glb`: misma silla con tres tapizados. Asiento a 0.489 m.
- `dining-square-four.glb`: mesa cuadrada y cuatro sillas.
- `dining-round-two.glb`: mesa redonda y dos sillas.

Todos se encuentran en `public/models/furniture/`. El manifest incluye dimensiones XYZ ya convertidas a los ejes GLB y posiciones/orientaciones de los asientos de cada conjunto. Las piezas independientes tienen el origen centrado a nivel del suelo. GLB usa Y arriba; las sillas miran hacia +Z. Materiales incluidos, sin texturas externas, luces ni camaras.

Archivo editable: `assets-source/furniture/restaurant-furniture.blend`. La escena activa Restaurant Furniture muestra los conjuntos y los tres tapizados; las mesas individuales estan ocultas en esa escena para no superponerse, pero estan exportadas en sus GLB. Vista previa: `assets-source/furniture/furniture-preview.png`.

Script reproducible: `scripts/blender/create_furniture.py`, ejecutado dentro de Blender. Conserva las escenas existentes y crea una nueva escena de mobiliario.

La escena usa las mesas y sillas individuales, con una silla por plaza (1-8). DiningFurniture aplica escala 0.55 y distribuye asientos orientados al centro; usa mesa cuadrada para cuatro plazas y redonda para las restantes. La seleccion y previsualizacion de movimiento incluyen el conjunto completo. Las medidas son compatibles con los personajes fuente. Si se usan junto a los personajes de la app a escala 0.55, aplicar esa misma escala o definir una escala visual comun. Para integrar los conjuntos se debe contemplar la huella de las sillas en limites, separaciones y previsualizacion del movimiento: es mayor que TABLE_SIZE=1.

Validado visualmente en Blender y cargado con GLTFLoader de Three.js: dimensiones contrastadas con el manifest, normales presentes, apoyo al suelo y ausencia de camaras/luces en los siete GLB.
