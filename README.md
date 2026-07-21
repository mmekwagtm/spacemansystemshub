# Spaceman Systems

Spaceman Systems is the canonical pnpm monorepo for the Spaceman Projects
five-app marketplace and delivery platform.

## Current state

Phases 0 and 1 are accepted: the synchronized workspace contains five app
shells, shared packages, Firebase Rules/Functions templates, and manual test
harnesses. The native manifests target Expo SDK 57, and the current baseline
passes full workspace validation plus browser/native smoke checks. Read
[current status](docs/project-docs/current-status.md) before assuming a Phase
2-7 business flow, live development-project integration, or production
deployment is accepted.

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
