mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$ gcloud secrets list \
  --filter="name~PAYSTACK" \
  --format="table(name)"
NAME
PAYSTACK_SECRET_KEY
mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$ gcloud secrets versions list PAYSTACK_SECRET_KEY \
  --format="table(name.basename():label=VERSION,state,createTime)"
VERSION  STATE     CREATED
3        enabled   2026-07-26T16:26:37
2        disabled  2026-07-21T10:15:47
1        disabled  2026-07-21T03:48:09
mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$ grep -Rni "SPACEMAN_FIREBASE_DEPLOY_SCOPE" \
  PLAN-phase-5.md tools scripts package.json .github \
  2>/dev/null
tools/scripts/run-firebase-deploy-with-evidence.mjs:7:const scope = process.env.SPACEMAN_FIREBASE_DEPLOY_SCOPE ?? "";
tools/scripts/run-firebase-deploy-with-evidence.mjs:12:  throw new Error("SPACEMAN_FIREBASE_DEPLOY_SCOPE must be explicit and valid.");
mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$ sed -n '1,260p' tools/scripts/run-firebase-deploy-with-evidence.mjs
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const projectId = process.env.SPACEMAN_FIREBASE_PROJECT_ID ?? "";
const scope = process.env.SPACEMAN_FIREBASE_DEPLOY_SCOPE ?? "";

if (!/^[a-z][a-z0-9-]{4,29}$/.test(projectId))
  throw new Error("SPACEMAN_FIREBASE_PROJECT_ID must be explicit and valid.");
if (!/^[A-Za-z0-9:,_-]+$/.test(scope))
  throw new Error("SPACEMAN_FIREBASE_DEPLOY_SCOPE must be explicit and valid.");

function git(arguments_) {
  const result = spawnSync("git", arguments_, {
    cwd: root,
    encoding: "utf8",
  });
  if (result.error || result.status !== 0)
    throw new Error(`git ${arguments_.join(" ")} failed.`);
  return result.stdout.trim();
}

const dirty = git(["status", "--porcelain=v1", "--untracked-files=all"]);
if (dirty)
  throw new Error("Evidenced deployment requires an exact clean Git revision.");
const revision = git(["rev-parse", "HEAD"]);
if (!/^[a-f0-9]{40}$/.test(revision))
  throw new Error("Git did not return an exact commit revision.");

const startedAt = new Date().toISOString();
const deploy = spawnSync(
  "corepack",
  [
    "pnpm",
    "exec",
    "firebase",
    "deploy",
    "--project",
    projectId,
    "--only",
    scope,
  ],
  { cwd: root, encoding: "utf8", stdio: "inherit" },
);
const completedAt = new Date().toISOString();
const status = deploy.error || deploy.status !== 0 ? "failed" : "deployed";
const evidenceDirectory = path.join(root, ".local-evidence", "deployments");
mkdirSync(evidenceDirectory, { recursive: true });
const evidencePath = path.join(
  evidenceDirectory,
  `${completedAt.replaceAll(":", "-")}-${projectId}-${revision.slice(0, 12)}.json`,
);
writeFileSync(
  evidencePath,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      status,
      projectId,
      scope,
      revision,
      branch: git(["branch", "--show-current"]),
      startedAt,
      completedAt,
      worktreeCleanBeforeDeploy: true,
      worktreeCleanAfterDeploy:
        git(["status", "--porcelain=v1", "--untracked-files=all"]) === "",
      exitCode: deploy.status ?? 1,
    },
    null,
    2,
  )}\n`,
);
if (status !== "deployed")
  throw new Error(`Firebase deployment failed; evidence saved to ${evidencePath}.`);
console.log(
  `Firebase deployment evidence saved for ${projectId} at revision ${revision}: ${evidencePath}`,
);
mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$ git status --short
git diff --stat
git diff
pnpm validate
 M apps/admin-web/src/CheckoutSettingsPanel.test.tsx
 M apps/admin-web/src/CheckoutSettingsPanel.tsx
 M apps/customer-app/src/CheckoutPanel.tsx
 D apps/customer-app/src/app-contract.test.ts
 M apps/customer-web/src/CheckoutPanel.test.tsx
 M apps/customer-web/src/CheckoutPanel.tsx
 M docs/project-docs/api-cost-control.md
 M docs/project-docs/architecture-decisions.md
 M docs/project-docs/current-status.md
 M docs/project-docs/live-test-steps.md
 M docs/project-docs/roadmap-status.md
 M firebase/functions/scripts/live-checkout.mjs
 M firebase/functions/src/index.ts
 M firebase/functions/src/phase4.ts
 M package.json
 M packages/app-firebase/package.json
 M packages/app-functions/src/index.test.ts
 M packages/app-functions/src/index.ts
 M packages/app-maps/src/index.test.ts
 M packages/app-maps/src/index.ts
 M packages/app-query/package.json
 M packages/app-services/package.json
 M packages/app-types/src/index.ts
 M packages/app-validation/src/index.test.ts
 M packages/app-validation/src/index.ts
 M pnpm-lock.yaml
 M tests/web-e2e/phase4-live-checkout.spec.ts
?? _design-reference/
?? apps/customer-app/src/checkout-behavior.test.ts
?? apps/customer-app/src/checkout-behavior.ts
?? docs/plans-docs/PLAN-phase-5.md
?? docs/project-docs/phase-5-evidence.md
?? firebase/functions/.env.example
?? firebase/functions/fixture-collections.json
?? packages/app-firebase/src/index.test.ts
?? packages/app-query/src/index.test.ts
?? packages/app-services/src/index.test.ts
?? tools/scripts/cleanup-phase4-expo-go.mjs
?? tools/scripts/run-firebase-deploy-with-evidence.mjs
?? tools/scripts/verify-paystack-secret-rollback.mjs
 apps/admin-web/src/CheckoutSettingsPanel.test.tsx |   3 +
 apps/admin-web/src/CheckoutSettingsPanel.tsx      |  19 +++
 apps/customer-app/src/CheckoutPanel.tsx           | 137 +++++++++++++------
 apps/customer-app/src/app-contract.test.ts        |  65 ---------
 apps/customer-web/src/CheckoutPanel.test.tsx      | 152 +++++++++++++++++++++-
 apps/customer-web/src/CheckoutPanel.tsx           |  94 ++++++++++---
 docs/project-docs/api-cost-control.md             |  18 ++-
 docs/project-docs/architecture-decisions.md       |  16 ++-
 docs/project-docs/current-status.md               |  21 ++-
 docs/project-docs/live-test-steps.md              |   6 +-
 docs/project-docs/roadmap-status.md               |  11 +-
 firebase/functions/scripts/live-checkout.mjs      |  76 +++++------
 firebase/functions/src/index.ts                   |  25 +---
 firebase/functions/src/phase4.ts                  | 217 ++++++++++++++++++++++++-------
 package.json                                      |   3 +
 packages/app-firebase/package.json                |   4 +
 packages/app-functions/src/index.test.ts          |  69 +++++++---
 packages/app-functions/src/index.ts               | 121 ++++++++++++-----
 packages/app-maps/src/index.test.ts               |  41 ++++++
 packages/app-maps/src/index.ts                    |  84 +++++++++---
 packages/app-query/package.json                   |   4 +
 packages/app-services/package.json                |   4 +
 packages/app-types/src/index.ts                   |   8 +-
 packages/app-validation/src/index.test.ts         |  25 ++++
 packages/app-validation/src/index.ts              |   6 +
 pnpm-lock.yaml                                    |  12 ++
 tests/web-e2e/phase4-live-checkout.spec.ts        |  31 ++++-
 27 files changed, 945 insertions(+), 327 deletions(-)
diff --git a/apps/admin-web/src/CheckoutSettingsPanel.test.tsx b/apps/admin-web/src/CheckoutSettingsPanel.test.tsx
index 1efd275..d0cd81a 100644
--- a/apps/admin-web/src/CheckoutSettingsPanel.test.tsx
+++ b/apps/admin-web/src/CheckoutSettingsPanel.test.tsx
@@ -61,6 +61,9 @@ describe("Phase 4 checkout configuration", () => {
     expect(screen.getByLabelText("Allowed ZA localities")).toHaveValue(
       "Mabopane",
     );
+    expect(
+      screen.getByLabelText("Maximum delivery distance (metres, optional)"),
+    ).toHaveValue(null);
     expect(screen.getByLabelText("Base fee (rand)")).toHaveValue(20);
     expect(screen.getByLabelText("Included distance (metres)")).toHaveValue(
       3_000,
diff --git a/apps/admin-web/src/CheckoutSettingsPanel.tsx b/apps/admin-web/src/CheckoutSettingsPanel.tsx
index b3c89b0..de14ffa 100644
--- a/apps/admin-web/src/CheckoutSettingsPanel.tsx
+++ b/apps/admin-web/src/CheckoutSettingsPanel.tsx
@@ -94,6 +94,9 @@ export function CheckoutSettingsPanel({
       .split(",")
       .map((value) => value.trim())
       .filter(Boolean);
+    const maximumDistance = String(
+      data.get("maximumDeliveryDistanceMetres") ?? "",
+    ).trim();
     await run(async () => {
       const result = await saveZone.mutateAsync({
         ...(zoneId ? { deliveryZoneId: zoneId } : {}),









q

> spacemansystems@0.1.0 validate /home/mmekwa/Desktop/projects/spacemansystems
> corepack pnpm docs:check && corepack pnpm boundaries:check && corepack pnpm typecheck && corepack pnpm lint && corepack pnpm test && corepack pnpm build






> spacemansystems@0.1.0 docs:check /home/mmekwa/Desktop/projects/spacemansystems
> node tools/scripts/check-docs.mjs

q
Documentation check passed for 23 governance/project/plan documents.

> spacemansystems@0.1.0 boundaries:check /home/mmekwa/Desktop/projects/spacemansystems
> node tools/scripts/check-boundaries.mjs

Architecture boundary check passed for 61 source files.

> spacemansystems@0.1.0 typecheck /home/mmekwa/Desktop/projects/spacemansystems
> corepack pnpm -r --if-present run typecheck

Scope: 21 of 22 workspace projects
packages/app-core typecheck$ tsc --noEmit
└─ Done in 1m 20.5s
firebase/functions typecheck$ tsc --noEmit
└─ Done in 2m 7.7s
packages/app-errors typecheck$ tsc --noEmit
└─ Done in 26.8s
packages/app-types typecheck$ tsc --noEmit
└─ Done in 10.7s
packages/app-config typecheck$ tsc --noEmit
└─ Done in 13.9s
packages/app-ui typecheck$ tsc --noEmit
└─ Done in 7.8s
packages/app-validation typecheck$ tsc --noEmit
└─ Done in 14.4s
packages/app-functions typecheck$ tsc --noEmit
└─ Done in 24.8s
packages/app-database typecheck$ tsc --noEmit
└─ Done in 22.1s
packages/app-maps typecheck$ tsc --noEmit
└─ Done in 14.7s
packages/app-notifications typecheck$ tsc --noEmit
└─ Done in 5.7s
packages/app-state typecheck$ tsc --noEmit
└─ Done in 15.6s
packages/shared typecheck$ tsc --noEmit
└─ Done in 12.2s
packages/app-firebase typecheck$ tsc --noEmit
└─ Done in 11.4s
packages/app-services typecheck$ tsc --noEmit
└─ Done in 11.1s
apps/driver-app typecheck$ tsc --noEmit
└─ Done in 3m 37.4s
packages/app-query typecheck$ tsc --noEmit
└─ Done in 1m 23.4s
apps/customer-app typecheck$ tsc --noEmit
└─ Done in 1m 12s
apps/admin-web typecheck$ tsc -p tsconfig.app.json --noEmit
└─ Done in 1m 5.2s
apps/customer-web typecheck$ tsc -p tsconfig.app.json --noEmit
└─ Done in 1m 18.3s
apps/merchant-web typecheck$ tsc -p tsconfig.app.json --noEmit
└─ Done in 1m 9.7s

> spacemansystems@0.1.0 lint /home/mmekwa/Desktop/projects/spacemansystems
> corepack pnpm -r --if-present run lint

Scope: 21 of 22 workspace projects
firebase/functions lint$ eslint src --max-warnings 0
└─ Done in 45.6s
packages/app-core lint$ eslint src --max-warnings 0
└─ Done in 41.2s
packages/app-errors lint$ eslint src --max-warnings 0
└─ Done in 7s
packages/app-types lint$ eslint src --max-warnings 0
└─ Done in 5.7s
packages/app-config lint$ eslint src --max-warnings 0
└─ Done in 4.8s
packages/app-ui lint$ eslint src --max-warnings 0
└─ Done in 4.3s
packages/app-validation lint$ eslint src --max-warnings 0
└─ Done in 5.4s
packages/app-database lint$ eslint src --max-warnings 0
└─ Done in 5s
packages/app-functions lint$ eslint src --max-warnings 0
└─ Done in 5.7s
packages/app-maps lint$ eslint src --max-warnings 0
└─ Done in 5s
packages/app-notifications lint$ eslint src --max-warnings 0
└─ Done in 4.4s
packages/app-state lint$ eslint src --max-warnings 0
└─ Done in 4.8s
packages/shared lint$ eslint src --max-warnings 0
└─ Done in 4.6s
packages/app-firebase lint$ eslint src --max-warnings 0
└─ Done in 4.6s
packages/app-services lint$ eslint src --max-warnings 0
└─ Done in 4.1s
apps/driver-app lint$ eslint app src --max-warnings 0
└─ Done in 4.8s
packages/app-query lint$ eslint src --max-warnings 0
└─ Done in 4.8s
apps/admin-web lint$ eslint src --max-warnings 0
└─ Done in 7.8s
apps/customer-app lint$ eslint app src --max-warnings 0
└─ Done in 7.5s
apps/customer-web lint$ eslint src --max-warnings 0
└─ Done in 8.1s
apps/merchant-web lint$ eslint src --max-warnings 0
└─ Done in 7.8s

> spacemansystems@0.1.0 test /home/mmekwa/Desktop/projects/spacemansystems
> corepack pnpm -r --if-present run test

Scope: 21 of 22 workspace projects
firebase/functions test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansystems/firebase/functions
└─ Running...
packages/app-core test$ vitest run
│ stderr | src/index.test.ts > JSON provider gateway > maps provider throttling to a r…
└─ Running...
packages/app-core test$ vitest run
│ {"source":"test","status":429,"severity":"WARNING","message":"Provider rejected a re…
└─ Running...
packages/app-core test$ vitest run
│  ✓ src/index.test.ts (2 tests) 43msrojects/spacemansyste
└─ Running...
packages/app-core test$ vitest run
│  ✓ src/phase4-helpers.test.ts (3 tests) 25mspacemansyste
└─ Running...
packages/app-core test$ vitest run
│  Test Files  2 passed (2)/Desktop/projects/spacemansyste
└─ Running...
packages/app-core test$ vitest run
│       Tests  5 passed (5)/Desktop/projects/spacemansyste
└─ Running...
packages/app-core test$ vitest run
│    Start at  02:50:52ekwa/Desktop/projects/spacemansyste
└─ Running...
packages/app-core test$ vitest run
│    Duration  18.36s (transform 1.13s, setup 0ms, collect 15.15s, tests 68ms, environ…
└─ Running...
packages/app-core test$ vitest run
└─ Done in 28.2shome/mmekwa/Desktop/projects/spacemansyste
ms/packages/app-core:48
│  ✓ src/index.test.ts (3 tests) 273ms setup 0ms, collect
│  Test Files  1 passed (1)m…
│       Tests  3 passed (3)
│    Start at  02:50:48
│    Duration  6.63s (transform 547ms, setup 0ms, collect 525ms, tests 273ms, environm…
└─ Done in 12.1s
packages/app-validation test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansystems/packages/app-validation
│  ✓ src/index.test.ts (9 tests) 128ms
│  Test Files  1 passed (1)
│       Tests  9 passed (9)
│    Start at  02:51:13
│    Duration  2.43s (transform 582ms, setup 0ms, collect 698ms, tests 128ms, environm…
└─ Done in 4.5s
packages/app-database test$ vitest run
└─ Running...
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansystems/packages/app-databasekwa/Desktop/projects/spacemansyste
└─ Running...
packages/app-functions test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansyste│  ✓ src/index.test.ts (4 tests) 112ms
└─ Running...
packages/app-functions test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansyste│  Test Files  1 passed (1)
└─ Running...
packages/app-functions test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansyste│       Tests  4 passed (4)
└─ Running...
packages/app-functions test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansyste│    Start at  02:51:18ns
└─ Running...
packages/app-functions test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansyste│    Duration  7.65s (transform 679ms, setup 0ms, collect 5.46s, tests 112ms, environm…sts) 159mssetup 0ms, collect
└─ Running...
packages/app-functions test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansystems/packages/app-functionsnsform 963ms, setup 0ms, collect
└─ Done in 10.6sest.ts (28 tests) 159ms
│  Test Files  1 passed (1)
│       Tests  28 passed (28)t run
│    Start at  02:51:18
│    Duration  3.00s (transform 963ms, setup 0ms, collect 1.18s, tests 159ms, environm…
└─ Done in 5.6s
packages/app-maps test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansystems/packages/app-maps
│  ✓ src/index.test.ts (13 tests) 120ms
│  Test Files  1 passed (1)
│       Tests  13 passed (13)
│    Start at  02:51:23
│    Duration  2.40s (transform 888ms, setup 0ms, collect 800ms, tests 120ms, environm…
└─ Done in 5.2s
packages/app-state test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansystems/packages/app-state vitest run
└─ Running...
│  ✓ src/index.test.ts (8 tests) 52ms
└─ Running...
│  Test Files  1 passed (1)t run
└─ Running...
│       Tests  8 passed (8)t run
└─ Running...
│    Start at  02:51:29itest run
└─ Running...
│    Duration  2.42s (transform 903ms, setup 0ms, collect 732ms, tests 52ms, environme…esktop/projects/spacemansyste
└─ Running...
packages/shared test$ vitest run
└─ Done in 5.5s/home/mmekwa/Desktop/projects/spacemansyste
ms/packages/shared
│  ✓ src/auth/index.test.ts (2 tests) 34ms
│  Test Files  1 passed (1)
│       Tests  2 passed (2)
│    Start at  02:51:29
│    Duration  2.60s (transform 615ms, setup 0ms, collect 700ms, tests 34ms, environme…
└─ Done in 5.6s
packages/app-firebase test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansystems/packages/app-firebase
│  ✓ src/index.test.ts (1 test) 15ms
│  Test Files  1 passed (1)
│       Tests  1 passed (1)
│    Start at  02:51:34
│    Duration  5.10s (transform 1.21s, setup 0ms, collect 3.45s, tests 15ms, environme…
└─ Done in 7.5s
packages/app-services test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansystems/packages/app-services
│  ✓ src/index.test.ts (2 tests) 34ms
│  Test Files  1 passed (1)
│       Tests  2 passed (2)
│    Start at  02:51:42
│    Duration  5.05s (transform 1.85s, setup 0ms, collect 3.84s, tests 34ms, environme…
└─ Done in 7.9s
apps/driver-app test$ jest --runInBand
└─ Running...
packages/app-query test$ vitest run
│ PASS src/app-contract.test.tsktop/projects/spacemansyste
└─ Running...
packages/app-query test$ vitest run
│   driver app foundationwa/Desktop/projects/spacemansyste
└─ Running...
packages/app-query test$ vitest run
│     ✓ requires invited driver identity before operations (10 ms)ges/app-queryed (1)e…
└─ Running...
packages/app-query test$ vitest run
│ Test Suites: 1 passed, 1 totaltop/projects/spacemansyste
└─ Running...
packages/app-query test$ vitest run
│ Tests:       1 passed, 1 totaltop/projects/spacemansyste
└─ Running...
packages/app-query test$ vitest run
│ Snapshots:   0 totalmekwa/Desktop/projects/spacemansyste
└─ Running...
packages/app-query test$ vitest run
│ Time:        12.507 sekwa/Desktop/projects/spacemansyste
└─ Running...
packages/app-query test$ vitest run
│ Ran all test suites.mekwa/Desktop/projects/spacemansyste
└─ Running...
packages/app-query test$ vitest run
└─ Done in 28.2shome/mmekwa/Desktop/projects/spacemansyste
ms/packages/app-queryed (1)e…
│  ✓ src/index.test.ts (1 test) 31ms
│  Test Files  1 passed (1)form 813ms, setup 0ms, collect
│       Tests  1 passed (1)e…
│    Start at  02:51:51
│    Duration  3.24s (transform 813ms, setup 0ms, collect 1.62s, tests 31ms, environme…
└─ Done in 7.3s
apps/admin-web test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansystems/apps/admin-web test$ jest --runInBand
└─ Running...
apps/customer-app test$ jest --runInBand
│ PASS src/checkout-behavior.test.ts
│   native checkout behavior
│     ✓ normalizes the authoritative quote input and propagates the exact test tag (11…
│     ✓ persists pending payment only after the hosted bro[2 lines collapsed]
│     ✓ normalizes the authoritative quote input and propagates the exact test tag (11…
│     ✓ persists pending payment only after the hosted brow3er opens (5 ms)
│     ✓ persists pending payment only after the hosted browser opens (5 ms)
│4    ✓ does not persist pending payment when Linking fail│     ✓ does not persist pending payment when Linking fail│  ✓ src/MarketplacePanel.test.tsx (2 tests) 1636ms
└─ Running...
apps/customer-app test$ jest --runInBande (2 ms)
[5 lines collapsed]
│    ✓ Admin marketplace > exposes trusted manual, Google, and CSV workflows  828ms)d terminal outcome (1 ms) non-te
└─ Running...
apps/customer-app test$ jest --runInBandcome (1 ms)
[5 lines collapsed]
│    ✓ Admin marketplace > keeps a newly created store selectable outside the bounded …
└─ Running...
apps/customer-app test$ jest --runInBandcome (1 ms)
[5 lines collapsed]
│     ✓ reconciles only an owned pending checkout when the app becomes active (2 ms)
│     ✓ shows the failed terminal outcome (2 ms)
│     ✓ shows the cancelled terminal outcome (1 ms)
│     ✓ shows the abandoned terminal outcome (1 ms)
│     ✓ keeps delayed and successful payment states non-terminal (2 ms)t suites.
│ Test Suites: 1 passed, 1 total
│  ✓ src/CheckoutSettingsPanel.test.tsx (3 tests) 1005ms
└─ Running...
apps/customer-app test$ jest --runInBand
[5 lines collapsed]
│     ✓ reconciles only an owned pending checkout when the app becomes active (2 ms)test run
│     ✓ shows the failed terminal outcome (2 ms)
│     ✓ shows the cancelled terminal outcome (1 ms)
│     ✓ shows the abandoned terminal outcome (1 ms)
│     ✓ keeps delayed and successful payment states non-terminal (2 ms)sts authenticat…
│ Test Suites: 1 passed, 1 totalkout > quotes, launches ho
│    ✓ Phase 4 checkout configuration > prefills the approved zone and fee values with…
└─ Running...
apps/customer-app test$ jest --runInBandoes not lock the c
[5 lines collapsed]
│     ✓ reconciles only an owned pending checkout when the app becomes active (2 ms)a/Desktop/projects/spacemansyste
│     ✓ shows the failed terminal outcome (2 ms)
│     ✓ shows the cancelled terminal outcome (1 ms)
│     ✓ shows the abandoned terminal outcome (1 ms)
│     ✓ keeps delayed and successful payment states non-terminal (2 ms)er Web Phase 4 checkout > quotes, launches ho
│ Test Suites: 1 passed, 1 total
│ Tests:       8 passed, 8 totalkout > reuses a lost-respo
│ Snapshots:   0 total
│ Time:        3.993 s, estimated 4 s> does not lock the c
│  ✓ src/App.test.tsx (1 test) 554ms
└─ Running...
apps/customer-app test$ jest --runInBand
[5 lines collapsed]
│     ✓ reconciles only an owned pending checkout when the app becomes active (2 ms)t.tsx (11 tests) 5926ms
│     ✓ shows the failed terminal outcome (2 ms)
│     ✓ shows the cancelled terminal outcome (1 ms)
│     ✓ shows the abandoned terminal outcome (1 ms)
│     ✓ keeps delayed and successful payment states non-terminal (2 ms)er Web Phase 4 checkout > reuses a lost-respo
│ Test Suites: 1 passed, 1 total
│ Tests:       8 passed, 8 totalkout > does not lock the c
│ Snapshots:   0 total
│ Time:        3.993 s, estimated 4 s> blocks offline addr
│    ✓ Admin App > requires invited staff authentication  548msne in 7.1s
└─ Running...
apps/customer-app test$ jest --runInBandects/spacemansyste
[5 lines collapsed]
│     ✓ reconciles only an owned pending checkout when the app becomes active (2 ms)4 checkout > preserves a guest c
│     ✓ shows the failed terminal outcome (2 ms)
│     ✓ shows the cancelled terminal outcome (1 ms)ches ho
│     ✓ shows the abandoned terminal outcome (1 ms)
│     ✓ keeps delayed and successful payment states non-terminal (2 ms)equires a fresh…
│ Test Suites: 1 passed, 1 totalkout > does not lock the c
│ Tests:       8 passed, 8 total
│ Snapshots:   0 total
│ Time:        3.993 s, estimated 4 s
│  Test Files  3 passed (3)est.tsx (3 tests) 1362ms
└─ Running...
apps/customer-app test$ jest --runInBand
[5 lines collapsed]
│     ✓ reconciles only an owned pending checkout when the app becomes active (2 ms)t.tsx (11 tests) 5926ms
│     ✓ shows the failed terminal outcome (2 ms)
│     ✓ shows the cancelled terminal outcome (1 ms)
│     ✓ shows the abandoned terminal outcome (1 ms)
│     ✓ keeps delayed and successful payment states non-terminal (2 ms)er Web Phase 4 checkout > reuses a lost-respo
│ Test Suites: 1 passed, 1 total
│ Tests:       8 passed, 8 totalkout > does not lock the c
│ Snapshots:   0 total
│ Time:        3.993 s, estimated 4 s> blocks offline addr
│       Tests  6 passed (6)x…
└─ Running...
apps/customer-app test$ jest --runInBand
[5 lines collapsed]
│     ✓ reconciles only an owned pending checkout when the app becomes active (2 ms)t.tsx (11 tests) 5926ms
│     ✓ shows the failed terminal outcome (2 ms)
│     ✓ shows the cancelled terminal outcome (1 ms)
│     ✓ shows the abandoned terminal outcome (1 ms)
│     ✓ keeps delayed and successful payment states non-terminal (2 ms)er Web Phase 4 checkout > reuses a lost-respo
│ Test Suites: 1 passed, 1 total
│ Tests:       8 passed, 8 totalkout > does not lock the c
│ Snapshots:   0 total
│ Time:        3.993 s, estimated 4 s> blocks offline addr
[1 lines collapsed]
└─ Done in 7.1s
apps/customer-web test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansystems/apps/customer-web
│  ✓ src/CheckoutPanel.test.tsx (11 tests) 5926ms
│    ✓ Customer Web Phase 4 checkout > preserves a guest cart and requests authenticat…
│    ✓ Customer Web Phase 4 checkout > quotes, launches hosted Paystack, and reconcile…
│    Start at  02:52:19se 4 checkout > reuses a lost-respo
└─ Running...
apps/customer-app test$ jest --runInBandoes not lock the c
[5 lines collapsed]
│     ✓ reconciles only an owned pending checkout when the app becomes active (2 ms)ex…
│     ✓ shows the failed terminal outcome (2 ms)
│     ✓ shows the cancelled terminal outcome (1 ms) catalo
│     ✓ shows the abandoned terminal outcome (1 ms)
│     ✓ keeps delayed and successful payment states non-terminal (2 ms)
│ Test Suites: 1 passed, 1 total
│ Tests:       8 passed, 8 total
│ Snapshots:   0 total
│ Time:        3.993 s, estimated 4 s
│2Ran all test suites.
│    ✓ Admin marketplace > exposes trusted manual, Google, and CSV workflows  828msitest run
│    ✓ Admin marketplace > keeps a newly created store selectable outside the bounded …
│  ✓ src/CheckoutSettingsPanel.test.tsx (3 tests) 1005ms
│    ✓ Phase 4 checkout configuration > prefills the approved zone and fee values with…
│  ✓ src/App.test.tsx (1 test) 554ms
│    ✓ Admin App > requires invited staff authentication  [1 lines collapsed]
│2 Test Files  3 passed (3)
│    ✓ Customer Web Phase 4 checkout > preserves a guest cart and requests authenticat…
│    ✓ Customer Web Phase 4 checkout > quotes, launches hosted Paystack, and reconcile…
│    ✓ Customer Web Phase 4 checkout > reuses a lost-respon3e key and requires a fresh… shows the same active catalo
│    ✓ Customer Web Phase 4 checkout > quotes, launches hosted Paystack, and reconcile…) 939ms
│    ✓ Customer Web Phase 4 checkout > reuses a lost-response key and requires a fresh…
└─ Done in 1m 4.8sb Phase 4 checkout > does not lock the c
│    ✓ Customer Web Phase 4 checkout > reuses a lost-response key and requires a fresh…heckout > blocks offline addr
│    ✓ Customer Web Phase 4 checkout > does not lock the ca5t when the Paystack popup …t.tsx (3 tests) 1362ms
│    ✓ Customer Web Phase 4 checkout > does not lock the cart when the Paystack popup …
│    ✓ Customer Web Phase 4 checkout > blocks offline address search and refuses an ex… shows the same active catalo
│  ✓ src/MarketplacePanel.test.tsx (3 tests) 1362ms
│    ✓ Customer marketplace > shows the same active catalog to guests including unavai…rowsing public and protects c
│  ✓ src/App.test.tsx (1 test) 939ms
│    ✓ Customer App > keeps browsing public and protects checkout behind identity  931…
│  Test Files  3 passed (3)
│       Tests  15 passed (15)
│    Start at  02:52:25
│    Duration  54.88s (transform 1.96s, setup 5.36s, colle└─ Done in 57.8s 8.23s, envi…
apps/merchant-web test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansystems/apps/merchant-web
│  ✓ src/MarketplacePanel.test.tsx (3 tests) 1114ms
│    ✓ Merchant marketplace > keeps pending onboarding limited to a draft submission  …
│    ✓ Merchant marketplace > corrects and resubmits a rejected store without creating…
│  ✓ src/App.test.tsx (1 test) 434ms
│    ✓ Merchant App > requires invited merchant authentication  429ms
│  Test Files  2 passed (2)
│       Tests  4 passed (4)
│    Start at  02:53:23
│    Duration  22.87s (transform 6.50s, setup 772ms, collect 14.84s, tests 1.55s, envi…
└─ Done in 25.4s

> spacemansystems@0.1.0 build /home/mmekwa/Desktop/projects/spacemansystems
> corepack pnpm -r --if-present run build

Scope: 21 of 22 workspace projects
firebase/functions build$ tsup src/index.ts --format es…
│ CLI Building entry: src/index.ts
│ CLI Using tsconfig: tsconfig.json
│ CLI tsup v8.5.1
│ CLI Target: node22
│ CLI Cleaning output folder
│ ESM Build start
│ ESM lib/index.js 304.67 KB
│ ESM ⚡️ Build success in 2632ms
└─ Done in 7.1s
packages/app-core build$ tsc --noEmit
└─ Done in 16.6s
packages/app-errors build$ tsc --noEmit
└─ Done in 6.5s
packages/app-config build$ tsc --noEmit
└─ Done in 9.6s
packages/app-types build$ tsc --noEmit
└─ Done in 7.2s
packages/app-ui build$ tsc --noEmit
└─ Done in 6.1s
packages/app-validation build$ tsc --noEmit
└─ Done in 10.6s
packages/app-database build$ tsc --noEmit
└─ Done in 10.9s
packages/app-functions build$ tsc --noEmit
└─ Done in 15.4s
packages/app-maps build$ tsc --noEmit
└─ Done in 10.7s
packages/app-notifications build$ tsc --noEmit
└─ Done in 6s
packages/app-state build$ tsc --noEmit
└─ Done in 10.2s
packages/shared build$ tsc --noEmit
└─ Done in 9.7s
packages/app-firebase build$ tsc --noEmit
└─ Done in 11.4s
packages/app-services build$ tsc --noEmit
└─ Done in 11.1s
apps/driver-app build$ tsc --noEmit
└─ Done in 24.2s
packages/app-query build$ tsc --noEmit
└─ Done in 15.9s
apps/admin-web build$ tsc -p tsconfig.app.json --noEmit…
[5 lines collapsed]
│ dist/index.html                                  0.68…
│ dist/assets/index-DFZoLQTM.css                   2.22…
│ dist/assets/CheckoutSettingsPanel-Beyvmdrr.js    6.93…
│ dist/assets/App-CjJYUkPf.js                      7.93…
│ dist/assets/MarketplacePanel-wuOPuXGV.js        11.25…
│ dist/assets/query-vzhSoX6Q.js                   41.32…
│ dist/assets/index-D1o_tGuX.js                   82.74…
│ dist/assets/react-BLXyby6r.js                  231.11…
│ dist/assets/firebase-fDW0arjg.js               513.16…
│ ✓ built in 24.60s
└─ Done in 1m 2.1s
apps/customer-app build$ tsc --noEmit
└─ Done in 30.9s
apps/customer-web build$ tsc -p tsconfig.app.json --noE…
[5 lines collapsed]
│ dist/index.html                             0.69 kB │…
│ dist/assets/index-DAqEjPaL.css              3.53 kB │…
│ dist/assets/MarketplacePanel-BBzqJyPs.js    5.28 kB │…
│ dist/assets/App-DW76m5LQ.js                 6.53 kB │…
│ dist/assets/CheckoutPanel-DGe2Otpa.js       9.43 kB │…
│ dist/assets/query-Bqsh_jWd.js              42.52 kB │…
│ dist/assets/index-Cji5GzjN.js              84.08 kB │…
│ dist/assets/react-BLXyby6r.js             231.11 kB │…
│ dist/assets/firebase-EXN5t2Je.js          496.03 kB │…
│ ✓ built in 25.58s
└─ Done in 1m 4.1s
apps/merchant-web build$ tsc -p tsconfig.app.json --noE…
[4 lines collapsed]
│ computing gzip size...
│ dist/index.html                             0.68 kB │…
│ dist/assets/index-B2HwEQrA.css              1.98 kB │…
│ dist/assets/App-CA8k9iwL.js                 5.36 kB │…
│ dist/assets/MarketplacePanel-BFBdG2w5.js   10.51 kB │…
│ dist/assets/query-B_frIeoR.js              38.63 kB │…
│ dist/assets/index-BfjBHqba.js              81.17 kB │…
│ dist/assets/react-BLXyby6r.js             231.11 kB │…
│ dist/assets/firebase-fDW0arjg.js          513.16 kB │…
│ ✓ built in 14.32s
└─ Done in 47s