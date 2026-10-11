# CLAUDE.md

## Versioning (required)

Every change must bump `version` in `package.json` (semver, `0.MINOR.PATCH`):

- **Minor** (`0.21.x` → `0.22.0`) for new features (`feat:` commits)
- **Patch** (`0.21.2` → `0.21.3`) for bug fixes and small changes (`fix:` commits)

Bump exactly once per change, in the same commit as the change. Do not touch the major version.

## Commits

Use conventional prefixes, short and lowercase: `feat: ...`, `fix: ...`.

## Commands

- `yarn dev` – start dev server (Vite)
- `yarn build` – typecheck (`tsc`) and build
- `yarn lint` – ESLint
