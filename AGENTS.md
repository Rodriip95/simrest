# Repository Guidelines

## Project Structure & Module Organization

Restaurant Sim currently contains a React + TypeScript + Vite starter. `src/main.tsx` mounts the application; `src/App.tsx` contains the starter screen. Global styles live in `src/index.css`, component styles in `src/App.css`, imported images in `src/assets/`, and static public files in `public/`. Root configuration covers Vite, TypeScript, and ESLint. No test directory exists yet.

As features are introduced, separate administration components, 3D scenes, domain types, mock data, and shared state into focused modules under `src/`. Keep business rules outside graphical components.

## Build, Test, and Development Commands

Use Yarn and preserve `yarn.lock`; do not introduce competing lockfiles.

- `yarn install`: install project dependencies.
- `yarn dev`: start the Vite development server with hot reload.
- `yarn build`: run TypeScript project checks and generate production files in `dist/`.
- `yarn lint`: run ESLint, including TypeScript, React Hooks, and React Refresh rules.
- `yarn preview`: serve the production build locally after building.

## Coding Style & Naming Conventions

Match existing TypeScript style: two-space indentation, single quotes, and no semicolons. Use PascalCase for components and component filenames, camelCase for functions and variables, and `use` prefixes for hooks. Prefer explicit domain types; avoid unjustified `any`. Strict TypeScript is a project target, but `tsconfig.app.json` does not currently enable `strict` explicitly. ESLint is configured; no standalone formatter is configured.

## Testing Guidelines

No automated test framework, test script, or coverage threshold is configured. For code changes, run `yarn lint` and `yarn build`, then check affected interactions locally. Once implemented, verify table selection, sidebar details, camera movement, and zoom. When introducing automated tests, use colocated `*.test.ts` or `*.test.tsx` files and document the runner. Report only validations actually executed.

## Commit & Pull Request Guidelines

Git history is unavailable in this checkout. Use concise imperative commit subjects, such as `Add table selection panel`. Keep changes focused. PRs should describe scope, link relevant issues when available, list validation results, and include screenshots or recordings for visual changes.

## Scope & Architecture

The initial phase is frontend-only with mock data: administration layout, basic React Three Fiber geometry, camera controls, and table selection. Defer backend, authentication, payments, and real-time communication. Use Zustand only for necessary shared state. Inspect existing dependencies before changes, justify additions, and document significant architectural decisions.
