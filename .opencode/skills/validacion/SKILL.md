---
name: Validación del proyecto
description: Usar antes de dar por terminado cualquier cambio en Restaurant Sim. Ejecuta y reporta tests, lint y build, y recordar cómo registrar tests nuevos.
---

# Validación — Restaurant Sim

## Comandos (siempre los tres, en este orden)

```sh
yarn test
yarn lint
yarn build
```

Opcional para revisar a mano: `yarn dev` (desarrollo) o `yarn preview` (build de producción).

## Reglas

- **Reportar solo lo ejecutado.** Un test o recorrido no corrido no acredita nada (`AGENTS.md`).
- Si `yarn build` falla por tipos de tests Node vs navegador: los tests van en la configuración Node (`tsconfig.node.json`), la app en la del navegador (`tsconfig.app.json`). Ambas con `strict` explícito.
- Vite avisa si el bundle supera 500 kB: es conocido y no bloquea.
- No introducir framework de tests: el runner es `node --test` de Node 24. Un runner DOM solo si una tarea concreta lo justifica.

## Tests nuevos

Los `*.test.ts` van junto al archivo del dominio (`src/features/restaurant/domain/*.test.ts`, `src/features/restaurant/state/*.test.ts`).

**Obligatorio:** agregar el archivo al script `test` de `package.json`, que es una lista explícita:

```json
"test": "node --test tests/space.test.mjs <ruta/nuevo.test.ts> ..."
```

Un test no listado en el script no se ejecuta y no cuenta como validación.

## Reporte mínimo

Incluir en la respuesta:

- Resultado de los tres comandos (`N/N` pruebas).
- Comandos reales usados.
- Cualquier fallo del primer intento y cómo se corrigió.
- Pendientes no verificados (por ejemplo, validación visual sin navegador).

## Lockfiles

`AGENTS.md`: usar Yarn y preservar `yarn.lock`; no introducir lockfiles competitivos. Antes de cerrar, verificar con `git status` que no aparezca `package-lock.json` y que `package.json` no tenga dependencias instaladas por accidente.
