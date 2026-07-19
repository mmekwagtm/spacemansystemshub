# Spaceman Systems

Spaceman Systems is the canonical pnpm monorepo for the Spaceman Projects
five-app marketplace and delivery platform.

## Current state

The source workspace is present: it includes five app shells, shared packages,
Firebase Rules/Functions templates, and release/test harnesses. The native
manifests target Expo SDK 57. Read
[current status](docs/project-docs/current-status.md) before assuming live
Firebase configuration, a synchronized dependency installation, or a deployed
application exists.

## Architecture and decisions

- [Architecture](docs/project-docs/architecture.md)
- [Architecture decisions](docs/project-docs/architecture-decisions.md)
- [Canonical data model](docs/project-docs/data-model.md)
- [Environment setup](docs/project-docs/environment-setup.md)
- [Roadmap status](docs/project-docs/roadmap-status.md)

The original blueprints under `docs/architecture-docs/` and
`docs/architecture-visuals-docs/` are preserved reference material.

## Rules

- Use pnpm only.
- All five apps share one real Firebase development project; do not use
  emulators or production credentials.
- Screens do not call Firebase directly.
- Before changing code, read [AGENTS.md](AGENTS.md).
