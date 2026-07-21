# Workflow

## Bounded development workflow

1. Inspect the current implementation, Git state, and architecture decisions.
2. Name the affected apps, package layers, collections, Rules, Functions, and
   documentation.
3. Implement one bounded feature through the shared layer boundary.
4. Run targeted tests first, then root validation.
5. Report files, configuration/deployment impact, validation output, remaining
   placeholders, and the next safe step.

## Firebase workflow

Use the shared real development Firebase project only. Validate configuration
through typed environment parsing; never print secret values. Deploy backend
compatibility before clients that depend on it. Run the documented validation
and live-test gates manually before every deployment; production additionally
requires an explicit production acceptance review and approval.

## Sensitive-write workflow

All role/status/scope, payment, refund, order transition, assignment, location,
and cleanup writes pass through a validated trusted Function. The Function
records idempotency data, audit evidence, canonical state, and notification
intent together where feasible.

## Validation commands

Run from `/home/mmekwa/Desktop/projects/spacemansystems` before a manual
commit or deployment:

```sh
corepack pnpm docs:check
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm test:web:e2e
```
