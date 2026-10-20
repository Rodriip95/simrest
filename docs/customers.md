# Clientes chibi

Seis variantes creadas en Blender con las mismas proporciones y esqueleto de los camareros:

| GLB | Personaje | Vestuario y pelo |
| --- | --- | --- |
| man-polo | Hombre, piel media | Polo verde, pantalones beige, jopo oscuro |
| man-denim | Hombre, piel oscura | Chaqueta azul, pantalones oscuros, rizos |
| man-ochre | Hombre, piel clara | Camisa mostaza, jeans, pelo cobrizo con raya |
| woman-coral | Mujer, piel clara | Blusa coral, jeans, bob castano |
| woman-lilac | Mujer, piel oscura | Top lila, pantalones beige, pelo rizado |
| woman-sage | Mujer, piel media | Cardigan salvia, pantalones oscuros, coleta rubia |

Fuente editable: `assets-source/characters/restaurant-customers.blend`. Escena activa: Restaurant Customers (la generacion repetida puede agregar un sufijo). Preview: `customers-preview.png` en el mismo directorio.

Exportaciones independientes: `public/models/customers/`. `manifest.json` describe cada variante. Todos incluyen 16 huesos y los clips `Idle` y `Walk`, de un segundo y sin desplazamiento de raiz. Origen a los pies, Y arriba y frente +Z en GLB. Sin texturas externas. Son piezas articuladas estilizadas, compatibles con el enfoque de los camareros.

La app puede cargar las rutas `models/customers/<id>.glb` mediante GLTFLoader/useGLTF y clonar el esqueleto con SkeletonUtils.clone. La escena usa estos modelos para los comensales de visitas activas, aplicando el clip estatico Sit. El script add_customer_sitting.py agrega ese clip a las seis variantes; ejecutarlo despues de regenerar los clientes. No se implementan rutas de desplazamiento.

Recrear desde Blender ejecutando `scripts/blender/create_customers.py`. Requiere el archivo fuente de los camareros. Conserva ese archivo y guarda los clientes en un archivo aparte.

Validacion de pesos, clips, ciclo de caminata y esqueletos independientes: `node scripts/validate-characters.mjs`.
