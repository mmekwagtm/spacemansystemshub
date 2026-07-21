# Manual five-app live-test runbook

This runbook applies to the canonical checkout at
`/home/mmekwa/Desktop/projects/spacemansystems`.

The repository uses Node.js 22, Corepack, and pnpm 10.13.1. Testing, review,
commits, and deployments are manual. No repository-hosted automation workflow
is required or expected.

All five applications share the real Firebase development project selected by
the `development` alias. Do not use Firebase emulators and never point these
steps at production. Do not print or commit `.env.local`, provider secrets,
service-account files, access tokens, or generated test data.

The shell smoke tests prove that the five applications start and render. They
do not prove authentication, Maps quoting, Paystack payment, fulfillment,
notifications, or production readiness until the corresponding phase exit
gate is executed against the development project.

## 1. Inspect the checkout

Run from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
pwd
git status --short --branch
git branch --show-current
git diff --check
```

Preserve every unrelated modification. Do not use reset, checkout, clean, or
force-push as a troubleshooting shortcut.

## 2. Verify the toolchain

Run from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
node --version
corepack pnpm --version
firebase --version
java -version
```

Node must satisfy `>=22.13.0`; pnpm must use the version declared in the root
`package.json`. Java is needed only for Maestro/native tooling.

If dependencies need to be synchronized, run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @spaceman/customer-app exec expo install --check
corepack pnpm --filter @spaceman/driver-app exec expo install --check
```

Use `corepack pnpm prune` to remove stale project dependency contexts. Do not
delete individual entries inside `node_modules/.pnpm` manually.

## 3. Verify the development Firebase target safely

Run from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
firebase use
firebase projects:list
gcloud config get-value project
```

The intended development project is `spacemansystemsbackend`. Stop if any
command identifies production or another unexpected project.

Verify that all five local environment files exist and remain ignored without
printing their values. Run from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
test -s apps/admin-web/.env.local
test -s apps/merchant-web/.env.local
test -s apps/customer-web/.env.local
test -s apps/customer-app/.env.local
test -s apps/driver-app/.env.local
git check-ignore apps/admin-web/.env.local apps/merchant-web/.env.local apps/customer-web/.env.local apps/customer-app/.env.local apps/driver-app/.env.local
```

## 4. Run the manual source-quality gate

Run from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm docs:check
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

Every command must pass before a manual commit. A smoke test does not override
a failed typecheck, lint, unit test, or build.

## 5. Run Playwright manually

Install the checked-in Chromium browser once. Run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm exec playwright install chromium
```

Run the web E2E smoke test from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm test:web:e2e
```

Playwright starts Admin Web on `http://127.0.0.1:4173`, Merchant Web on
`http://127.0.0.1:4174`, and Customer Web on `http://127.0.0.1:4175`. It runs
the three Chromium heading checks serially, reports through the list reporter,
and writes ignored output under `test-results/`. A first cold navigation can
take about one minute on a resource-constrained workstation; the checked-in
timeouts account for that without adding retries.

## 6. Smoke-test the three web apps

Use a separate terminal for each server.

Run Admin Web from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm --filter @spaceman/admin-web dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173` and verify `Operations foundation`.

Run Merchant Web from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm --filter @spaceman/merchant-web dev -- --host 127.0.0.1 --port 5174
```

Open `http://127.0.0.1:5174` and verify `Merchant operations foundation`.

Run Customer Web from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm --filter @spaceman/customer-web dev -- --host 127.0.0.1 --port 5175
```

Open `http://127.0.0.1:5175` and verify `Marketplace foundation`.

## 7. Smoke-test the two Expo Go apps

Connect the device and workstation to the same LAN and use a separate terminal
for each app.

Run Customer App from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm --filter @spaceman/customer-app exec expo start --clear --lan
```

Scan the QR code in Expo Go and verify `Marketplace foundation`. Allow the
first Android bundle several minutes on a resource-constrained workstation.

Run Driver App from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm --filter @spaceman/driver-app exec expo start --clear --lan
```

Scan the QR code and verify `Delivery operations foundation`.

If LAN discovery is unavailable, stop the affected server and replace `--lan`
with `--tunnel` from the same repository directory.

## 8. Run native checks and optional Maestro flows

Run from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm --filter @spaceman/customer-app typecheck
corepack pnpm --filter @spaceman/customer-app lint
corepack pnpm --filter @spaceman/customer-app test
corepack pnpm --filter @spaceman/driver-app typecheck
corepack pnpm --filter @spaceman/driver-app lint
corepack pnpm --filter @spaceman/driver-app test
```

Maestro requires installed development builds and real application IDs. Once
those Phase 7 prerequisites exist, run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
MAESTRO_CUSTOMER_APP_ID='<CUSTOMER_ANDROID_APPLICATION_ID>' maestro test .maestro/customer-foundation.yaml
MAESTRO_DRIVER_APP_ID='<DRIVER_ANDROID_APPLICATION_ID>' maestro test .maestro/driver-foundation.yaml
```

Do not claim Maestro passed while the application IDs/development builds are
absent.

## 9. Development Firebase integration gate

Before an approved integration test, run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
firebase use
gcloud config get-value project
firebase functions:list --project spacemansystemsbackend
firebase firestore:databases:list --project spacemansystemsbackend
firebase hosting:sites:list --project spacemansystemsbackend
```

Every integration fixture must carry one exact `testRunId`. Create it from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
testRunId="live-$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short HEAD)"
printf '%s\n' "$testRunId"
```

Seed and clean only through authenticated trusted development commands using
that exact ID. Never delete a collection or write privileged Firestore fields
directly from a client or shell.

The Phase 2–6 live scenario eventually proves: scoped sign-in, active catalog
browse, server-verified serviceability/fee, Paystack test payment, exactly one
paid order, merchant fulfillment, admin dispatch, driver delivery/location,
customer tracking, notification/audit evidence, and exact fixture cleanup.

## 10. Stop services and clean generated output

Stop each Vite/Expo server with `Ctrl+C` in its own terminal.

Generated directories are ignored and may be removed after inspecting failed
evidence. Prefer a recoverable temporary move. Run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
cleanup_dir="$(mktemp -d /tmp/spacemansystems-generated.XXXXXX)"
test -d test-results && mv test-results "$cleanup_dir/test-results"
test -d playwright-report && mv playwright-report "$cleanup_dir/playwright-report"
printf 'Generated-output backup: %s\n' "$cleanup_dir"
```

## 11. Review and commit manually

Run from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
git status --short --branch
git diff --check
git diff --stat
git diff
```

After all checks and live tests pass, stage only reviewed files and inspect the
staged diff. Run from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
git add -A
git diff --cached --check
git diff --cached --stat
git diff --cached
git commit -m '<reviewed commit message>'
```

The project owner performs commits and any remote push manually. Never stage
`.env.local`, secrets, service accounts, `node_modules`, build output, Expo
caches, or test reports.

## 12. Manual deployment rule

Deployment is not part of the smoke test. Development deployment requires a
separate explicit authorization after the source-quality, Playwright, and
development-project target checks pass. Production deployment remains blocked
until Phase 7 is 100% complete and the production acceptance matrix is
reviewed and explicitly approved.

## Evidence record

- 2026-07-21: project owner reported successful manual smoke startup/rendering
  for all five app shells.
- 2026-07-21: `corepack pnpm validate` passed documentation checks, recursive
  type-check, lint, unit tests, and production builds.
- 2026-07-21: Customer App and Driver App passed `expo install --check`.
- 2026-07-21: Playwright passed all three Chromium web-shell checks after its
  cold-start timeout was corrected.

## Official references

- [pnpm installation](https://pnpm.io/installation)
- [Firebase CLI](https://firebase.google.com/docs/cli)
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
- [Expo environment setup](https://docs.expo.dev/get-started/set-up-your-environment/)
- [Playwright test runner](https://playwright.dev/docs/test-cli)
- [Maestro](https://docs.maestro.dev/)
