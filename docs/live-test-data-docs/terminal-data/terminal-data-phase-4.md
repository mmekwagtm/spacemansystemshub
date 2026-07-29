mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$ git diff --check
corepack pnpm docs:check
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm --filter @spaceman/customer-app exec expo install --check
corepack pnpm --filter @spaceman/driver-app exec expo install --check
env -u DEBUG corepack pnpm dlx expo-doctor apps/customer-app
env -u DEBUG corepack pnpm dlx expo-doctor apps/driver-app

> spacemansystems@0.1.0 docs:check /home/mmekwa/Desktop/projects/spacemansystems
> node tools/scripts/check-docs.mjs

Documentation check passed for 21 governance/project/plan documents.

> spacemansystems@0.1.0 typecheck /home/mmekwa/Desktop/projects/spacemansystems
> corepack pnpm -r --if-present run typecheck

Scope: 21 of 22 workspace projects
firebase/functions typecheck$ tsc --noEmit
└─ Done in 39.1s
packages/app-core typecheck$ tsc --noEmit
└─ Done in 18.3s
packages/app-errors typecheck$ tsc --noEmit
└─ Done in 3.3s
packages/app-types typecheck$ tsc --noEmit
└─ Done in 7.3s
packages/app-config typecheck$ tsc --noEmit
└─ Done in 10.7s
packages/app-ui typecheck$ tsc --noEmit
└─ Done in 8.1s
packages/app-validation typecheck$ tsc --noEmit
└─ Done in 12.4s
packages/app-database typecheck$ tsc --noEmit
└─ Done in 12.3s
packages/app-functions typecheck$ tsc --noEmit
└─ Done in 16.1s
packages/app-maps typecheck$ tsc --noEmit
└─ Done in 12.6s
packages/app-notifications typecheck$ tsc --noEmit
└─ Done in 7s
packages/app-state typecheck$ tsc --noEmit
└─ Done in 11.7s
packages/shared typecheck$ tsc --noEmit
└─ Done in 10.5s
packages/app-firebase typecheck$ tsc --noEmit
└─ Done in 9.1s
packages/app-services typecheck$ tsc --noEmit
└─ Done in 8.2s
apps/driver-app typecheck$ tsc --noEmit
└─ Done in 20.5s
packages/app-query typecheck$ tsc --noEmit
└─ Done in 11.6s
apps/customer-app typecheck$ tsc --noEmit
└─ Done in 37.7s
apps/admin-web typecheck$ tsc -p tsconfig.app.json --noEmit
└─ Done in 40.8s
apps/customer-web typecheck$ tsc -p tsconfig.app.json --noEmit
└─ Done in 1m 24.5s
apps/merchant-web typecheck$ tsc -p tsconfig.app.json --noEmit
└─ Done in 1m 19.6s

> spacemansystems@0.1.0 lint /home/mmekwa/Desktop/projects/spacemansystems
> corepack pnpm -r --if-present run lint

Scope: 21 of 22 workspace projects
firebase/functions lint$ eslint src --max-warnings 0
└─ Done in 26.8s
packages/app-core lint$ eslint src --max-warnings 0
└─ Done in 22s
packages/app-errors lint$ eslint src --max-warnings 0
└─ Done in 6.1s
packages/app-config lint$ eslint src --max-warnings 0
└─ Done in 5.4s
packages/app-types lint$ eslint src --max-warnings 0
└─ Done in 6.1s
packages/app-ui lint$ eslint src --max-warnings 0
└─ Done in 6.2s
packages/app-validation lint$ eslint src --max-warnings 0
└─ Done in 6.1s
packages/app-database lint$ eslint src --max-warnings 0
└─ Done in 5.9s
packages/app-functions lint$ eslint src --max-warnings 0
└─ Done in 7s
packages/app-maps lint$ eslint src --max-warnings 0
└─ Done in 6.4s
packages/app-notifications lint$ eslint src --max-warnings 0
└─ Done in 4.8s
packages/app-state lint$ eslint src --max-warnings 0
└─ Done in 6.7s
packages/shared lint$ eslint src --max-warnings 0
└─ Done in 6.2s
packages/app-firebase lint$ eslint src --max-warnings 0
└─ Done in 4.2s
packages/app-services lint$ eslint src --max-warnings 0
└─ Done in 4.1s
apps/driver-app lint$ eslint app src --max-warnings 0
└─ Done in 5.7s
packages/app-query lint$ eslint src --max-warnings 0
└─ Done in 6s
apps/admin-web lint$ eslint src --max-warnings 0
└─ Done in 8.1s
apps/customer-app lint$ eslint app src --max-warnings 0
└─ Done in 7.7s
apps/customer-web lint$ eslint src --max-warnings 0
└─ Done in 8.2s
apps/merchant-web lint$ eslint src --max-warnings 0
└─ Done in 7.8s

> spacemansystems@0.1.0 test /home/mmekwa/Desktop/projects/spacemansystems
> corepack pnpm -r --if-present run test

Scope: 21 of 22 workspace projects
firebase/functions test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansystems/firebase/functions
│ stderr | src/index.test.ts > JSON provider gateway > maps provider throttling to a resource-exhausted callable error
│ {"source":"test","status":429,"severity":"WARNING","message":"Provider rejected a request"}
│  ✓ src/index.test.ts (2 tests) 58ms
│  ✓ src/phase4-helpers.test.ts (3 tests) 32ms
│  Test Files  2 passed (2)
│       Tests  5 passed (5)
│    Start at  18:43:57
│    Duration  16.39s (transform 1.15s, setup 0ms, collect 13.01s, tests 90ms, environment 2ms, prepare 1.61s)
└─ Done in 21.7s
packages/app-core test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansystems/packages/app-core
│  ✓ src/index.test.ts (3 tests) 272ms
│  Test Files  1 passed (1)
│       Tests  3 passed (3)
│    Start at  18:43:57
│    Duration  3.44s (transform 445ms, setup 0ms, collect 342ms, tests 272ms, environment 1ms, prepare 1.61s)
└─ Done in 7.9s
packages/app-validation test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansystems/packages/app-validation
│  ✓ src/index.test.ts (8 tests) 84ms
│  Test Files  1 passed (1)
│       Tests  8 passed (8)
│    Start at  18:44:16
│    Duration  1.99s (transform 470ms, setup 0ms, collect 710ms, tests 84ms, environment 1ms, prepare 499ms)
└─ Done in 4.3s
packages/app-database test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansystems/packages/app-database
│  ✓ src/index.test.ts (4 tests) 77ms
│  Test Files  1 passed (1)
│       Tests  4 passed (4)
│    Start at  18:44:21
│    Duration  3.71s (transform 693ms, setup 0ms, collect 2.16s, tests 77ms, environment 1ms, prepare 641ms)
└─ Done in 6.3s
packages/app-functions test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansystems/packages/app-functions
│  ✓ src/index.test.ts (21 tests) 157ms
│  Test Files  1 passed (1)
│       Tests  21 passed (21)
│    Start at  18:44:21
│    Duration  2.54s (transform 780ms, setup 0ms, collect 788ms, tests 157ms, environment 1ms, prepare 641ms)
└─ Done in 5.3s
packages/app-maps test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansystems/packages/app-maps
│  ✓ src/index.test.ts (11 tests) 98ms
│  Test Files  1 passed (1)
│       Tests  11 passed (11)
│    Start at  18:44:26
│    Duration  2.15s (transform 533ms, setup 0ms, collect 552ms, tests 98ms, environment 1ms, prepare 562ms)
└─ Done in 4.6s
packages/app-state test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansystems/packages/app-state
│  ✓ src/index.test.ts (8 tests) 43ms
│  Test Files  1 passed (1)
│       Tests  8 passed (8)
│    Start at  18:44:27
│    Duration  2.41s (transform 683ms, setup 0ms, collect 747ms, tests 43ms, environment 3ms, prepare 516ms)
└─ Done in 5.2s
packages/shared test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansystems/packages/shared
│  ✓ src/auth/index.test.ts (2 tests) 25ms
│  Test Files  1 passed (1)
│       Tests  2 passed (2)
│    Start at  18:44:31
│    Duration  1.34s (transform 382ms, setup 0ms, collect 324ms, tests 25ms, environment 1ms, prepare 384ms)
└─ Done in 3.7s
apps/driver-app test$ jest --runInBand
│ PASS src/app-contract.test.ts
│   driver app foundation
│     ✓ requires invited driver identity before operations (11 ms)
│ Test Suites: 1 passed, 1 total
│ Tests:       1 passed, 1 total
│ Snapshots:   0 total
│ Time:        11.139 s
│ Ran all test suites.
└─ Done in 21.7s
apps/admin-web test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansystems/apps/admin-web
└─ Running...
apps/customer-app test$ jest --runInBand
[1 lines collapsed]
│   customer app foundation
│     ✓ keeps guest browsing separate from protected customer actions (8 ms)
│     ✓ wires the native route to the shared bounded active-catalog hooks (6 ms)
│     ✓ provides the shared query cache above every Expo Router screen (2 ms)
│     ✓ wires the persisted one-store cart and native hosted-payment lifecycle (3 ms)
│ Test Suites: 1 passed, 1 total
│  ✓ src/MarketplacePanel.test.tsx (2 tests) 1943ms
└─ Running...
apps/customer-app test$ jest --runInBand
[1 lines collapsed]
│   customer app foundation
│     ✓ keeps guest browsing separate from protected customer actions (8 ms)
│     ✓ wires the native route to the shared bounded active-catalog hooks (6 ms)
│     ✓ provides the shared query cache above every Expo Router screen (2 ms)
│     ✓ wires the persisted one-store cart and native hosted-payment lifecycle (3 ms)tion  727ms
│ Test Suites: 1 passed, 1 totalkout > quotes, launches hosted Paystack, and reconciles on focus  877ms
│    ✓ Admin marketplace > exposes trusted manual, Google, and CSV workflows  872msen and key after success  655ms
└─ Running...
apps/customer-app test$ jest --runInBand
[1 lines collapsed]
│   customer app foundation
│     ✓ keeps guest browsing separate from protected customer actions (8 ms)
│     ✓ wires the native route to the shared bounded active-catalog hooks (6 ms)
│     ✓ provides the shared query cache above every Expo Router screen (2 ms)
│     ✓ wires the persisted one-store cart and native hosted-payment lifecycle (3 ms)tion  727ms
│ Test Suites: 1 passed, 1 totalkout > quotes, launches hosted Paystack, and reconciles on focus  877ms
│    ✓ Admin marketplace > keeps a newly created store selectable outside the bounded admin page  1057msess  655ms
└─ Running...
apps/customer-app test$ jest --runInBand
[1 lines collapsed]
│   customer app foundation
│     ✓ keeps guest browsing separate from protected customer actions (8 ms)
│     ✓ wires the native route to the shared bounded active-catalog hooks (6 ms)
│     ✓ provides the shared query cache above every Expo Router screen (2 ms)
│     ✓ wires the persisted one-store cart and native hosted-payment lifecycle (3 ms)tion  727ms
│ Test Suites: 1 passed, 1 totalkout > quotes, launches hosted Paystack, and reconciles on focus  877ms
│ Tests:       4 passed, 4 totalkout > reuses a lost-response key, then rotates token and key after success  655ms
│ Snapshots:   0 total
│ Time:        4.056 s, estimated 15 s
│ Ran all test suites.
│  ✓ src/CheckoutSettingsPanel.test.tsx (3 tests) 1205ms
└─ Running...
apps/customer-app test$ jest --runInBandects/spacemansystems/apps/customer-web
[1 lines collapsed]
│   customer app foundation
│     ✓ keeps guest browsing separate from protected customer actions (8 ms)
│     ✓ wires the native route to the shared bounded active-catalog hooks (6 ms)token and key after success  655ms
│     ✓ provides the shared query cache above every Expo Router screen (2 ms)
│     ✓ wires the persisted one-store cart and native hosted-payment lifecycle (3 ms)
│ Test Suites: 1 passed, 1 totalows the same active catalog to guests including unavailable states  772ms
│ Tests:       4 passed, 4 totalads the next cursor page on demand  376ms
│ Snapshots:   0 total
│ Time:        4.056 s, estimated 15 s
│ Ran all test suites.
│    ✓ Phase 4 checkout configuration > prefills the approved zone and fee values without auto-saving  836ms
└─ Running...
apps/customer-app test$ jest --runInBandects/spacemansystems/apps/customer-web
[1 lines collapsed]
│   customer app foundation
│     ✓ keeps guest browsing separate from protected customer actions (8 ms)
│     ✓ wires the native route to the shared bounded active-catalog hooks (6 ms)token and key after success  655ms
│     ✓ provides the shared query cache above every Expo Router screen (2 ms)
│     ✓ wires the persisted one-store cart and native hosted-payment lifecycle (3 ms)
│ Test Suites: 1 passed, 1 totalows the same active catalog to guests including unavailable states  772ms
│ Tests:       4 passed, 4 totalads the next cursor page on demand  376ms
│ Snapshots:   0 total
│ Time:        4.056 s, estimated 15 s
│ Ran all test suites.
│    ✓ Phase 4 checkout configuration > keeps enable flags disabled for a non-super administrator  347ms
└─ Running...
apps/customer-app test$ jest --runInBandects/spacemansystems/apps/customer-web
[1 lines collapsed]
│   customer app foundation
│     ✓ keeps guest browsing separate from protected customer actions (8 ms)
│     ✓ wires the native route to the shared bounded active-catalog hooks (6 ms)token and key after success  655ms
│     ✓ provides the shared query cache above every Expo Router screen (2 ms)
│     ✓ wires the persisted one-store cart and native hosted-payment lifecycle (3 ms)
│ Test Suites: 1 passed, 1 totalows the same active catalog to guests including unavailable states  772ms
│ Tests:       4 passed, 4 totalads the next cursor page on demand  376ms
│ Snapshots:   0 total
│ Time:        4.056 s, estimated 15 s
│ Ran all test suites.
│  ✓ src/App.test.tsx (1 test) 615ms
└─ Running...
apps/customer-app test$ jest --runInBandects/spacemansystems/apps/customer-web
[1 lines collapsed]
│   customer app foundation
│     ✓ keeps guest browsing separate from protected customer actions (8 ms)
│     ✓ wires the native route to the shared bounded active-catalog hooks (6 ms)token and key after success  655ms
│     ✓ provides the shared query cache above every Expo Router screen (2 ms)
│     ✓ wires the persisted one-store cart and native hosted-payment lifecycle (3 ms)
│ Test Suites: 1 passed, 1 totalows the same active catalog to guests including unavailable states  772ms
│ Tests:       4 passed, 4 totalads the next cursor page on demand  376ms
│ Snapshots:   0 total
│ Time:        4.056 s, estimated 15 s
│ Ran all test suites.
│    ✓ Admin App > requires invited staff authentication  607ms
└─ Running...
apps/customer-app test$ jest --runInBandects/spacemansystems/apps/customer-web
[1 lines collapsed]
│   customer app foundation
│     ✓ keeps guest browsing separate from protected customer actions (8 ms)
│     ✓ wires the native route to the shared bounded active-catalog hooks (6 ms)token and key after success  655ms
│     ✓ provides the shared query cache above every Expo Router screen (2 ms)
│     ✓ wires the persisted one-store cart and native hosted-payment lifecycle (3 ms)
│ Test Suites: 1 passed, 1 totalows the same active catalog to guests including unavailable states  772ms
│ Tests:       4 passed, 4 totalads the next cursor page on demand  376ms
│ Snapshots:   0 total
│ Time:        4.056 s, estimated 15 s
│ Ran all test suites.
│  Test Files  3 passed (3)
└─ Running...
apps/customer-app test$ jest --runInBandects/spacemansystems/apps/customer-web
[1 lines collapsed]
│   customer app foundation
│     ✓ keeps guest browsing separate from protected customer actions (8 ms)
│     ✓ wires the native route to the shared bounded active-catalog hooks (6 ms)token and key after success  655ms
│     ✓ provides the shared query cache above every Expo Router screen (2 ms)
│     ✓ wires the persisted one-store cart and native hosted-payment lifecycle (3 ms)
│ Test Suites: 1 passed, 1 totalows the same active catalog to guests including unavailable states  772ms
│ Tests:       4 passed, 4 totalads the next cursor page on demand  376ms
│ Snapshots:   0 total
│ Time:        4.056 s, estimated 15 s
│ Ran all test suites.
[1 lines collapsed]
apps/customer-web test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansystems/apps/customer-web
│  ✓ src/CheckoutPanel.test.tsx (4 tests) 2976ms
│    ✓ Customer Web Phase 4 checkout > preserves a guest cart and requests authentication  727ms
│    ✓ Customer Web Phase 4 checkout > quotes, launches hosted Paystack, and reconciles on focus  877ms
│    ✓ Customer Web Phase 4 checkout > reuses a lost-response key, then rotates token and key after success  655ms
│    ✓ Customer Web Phase 4 checkout > blocks offline address search and refuses an expired quote  710ms
│  ✓ src/MarketplacePanel.test.tsx (3 tests) 1591ms
│    ✓ Customer marketplace > shows the same active catalog to guests including unavailable states  772ms
│       Tests  6 passed (6) > loads the next cursor page on demand  376ms
└─ Running...
apps/customer-app test$ jest --runInBand
[1 lines collapsed]
│   customer app foundation
│     ✓ keeps guest browsing separate from protected customer actions (8 ms)
│     ✓ wires the native route to the shared bounded active-catalog hooks (6 ms)
│     ✓ provides the shared query cache above every Expo Router screen (2 ms)
│     ✓ wires the persisted one-store cart and native hosted-payment lifecycle (3 ms)
│ Test Suites: 1 passed, 1 total
│ Tests:       4 passed, 4 total
│ Snapshots:   0 total
│ Time:        4.056 s, estimated 15 s
│ Ran all test suites.
└3 Done in 7s
└─ Done in 36.5sketplace > keeps a newly created store selectable outside the bounded admin page  1057ms
[6 lines collapsed]
│  ✓ src/MarketplacePanel.test.tsx (3 tests) 1591ms
│    ✓ Customer marketplace > shows the same active catalog to guests including unavailable states  772ms
│    ✓ Customer marketplace > loads the next cursor page on demand  376ms
│    ✓ Customer marketplace > keeps cached results visible after a deterministic refresh failure  438ms
│  ✓ src/App.test.tsx (1 test) 901ms
│    ✓ Customer App > keeps browsing public and protects checkout behind identity  893ms
│  Test Files  3 passed (3)
│       Tests  8 passed (8)
│    Start at  18:45:03
│    Duration  27.28s (transform 1.75s, setup 2.43s, collect 6.25s, tests 5.47s, environment 8.72s, prepare 1.68s)
└─ Done in 29.7s
apps/merchant-web test$ vitest run
│  RUN  v3.2.7 /home/mmekwa/Desktop/projects/spacemansystems/apps/merchant-web
│  ✓ src/MarketplacePanel.test.tsx (3 tests) 1084ms
│    ✓ Merchant marketplace > keeps pending onboarding limited to a draft submission  442ms
│    ✓ Merchant marketplace > corrects and resubmits a rejected store without creating a new record  532ms
│  ✓ src/App.test.tsx (1 test) 419ms
│    ✓ Merchant App > requires invited merchant authentication  413ms
│  Test Files  2 passed (2)
│       Tests  4 passed (4)
│    Start at  18:45:33
│    Duration  10.44s (transform 1.10s, setup 577ms, collect 3.14s, tests 1.50s, environment 3.48s, prepare 607ms)
└─ Done in 12.7s

> spacemansystems@0.1.0 build /home/mmekwa/Desktop/projects/spacemansystems
> corepack pnpm -r --if-present run build

Scope: 21 of 22 workspace projects
firebase/functions build$ tsup src/index.ts --format esm --target node22 --out-dir lib --clean --external firebase-admin --external firebase-functions
│ CLI Building entry: src/index.ts
│ CLI Using tsconfig: tsconfig.json
│ CLI tsup v8.5.1
│ CLI Target: node22
│ CLI Cleaning output folder
│ ESM Build start
│ ESM lib/index.js 297.58 KB
│ ESM ⚡️ Build success in 2027ms
└─ Done in 6.8s
packages/app-core build$ tsc --noEmit
└─ Done in 14.4s
packages/app-errors build$ tsc --noEmit
└─ Done in 4.3s
packages/app-config build$ tsc --noEmit
└─ Done in 9.3s
packages/app-types build$ tsc --noEmit
└─ Done in 6.8s
packages/app-ui build$ tsc --noEmit
└─ Done in 5.8s
packages/app-validation build$ tsc --noEmit
└─ Done in 9s
packages/app-database build$ tsc --noEmit
└─ Done in 9.8s
packages/app-functions build$ tsc --noEmit
└─ Done in 14.1s
packages/app-maps build$ tsc --noEmit
└─ Done in 10s
packages/app-notifications build$ tsc --noEmit
└─ Done in 6s
packages/app-state build$ tsc --noEmit
└─ Done in 9.5s
packages/shared build$ tsc --noEmit
└─ Done in 8.7s
packages/app-firebase build$ tsc --noEmit
└─ Done in 8.8s
packages/app-services build$ tsc --noEmit
└─ Done in 9.2s
apps/driver-app build$ tsc --noEmit
└─ Done in 23.2s
packages/app-query build$ tsc --noEmit
└─ Done in 15.3s
apps/admin-web build$ tsc -p tsconfig.app.json --noEmit && vite build
│ vite v6.4.3 building for production...
│ transforming...
[1 lines collapsed]
│ rendering chunks...
│ computing gzip size...
│5dist/index.html                                  0.68 kB │ gzip:   0.35 kB
│ dist/index.html                                  0.68 kB │ gzip:   0.35 kB
│ dist/assets/index-DFZoLQTM.css                   2.22 kB │ gzip:   0.85 kB
│ dist/assets/CheckoutSettingsPanel-CD04F0UG.js    6.53 kB │ gzip:   2.39 kB
│ dist/assets/App-CH7OmfDm.js                      7.93 kB │ gzip:   2.42 kB
│ dist/assets/MarketplacePanel-BdUqrBju.js        11.25 kB │ gzip:   3.46 kB
│ dist/assets/query-vzhSoX6Q.js                   41.32 kB │ gzip:  12.30 kB
│ dist/assets/index-DcMIeNNX.js                   82.67 kB │ gzip:  21.80 kB
└─ Done in 55.8sact-BLXyby6r.js                  231.11 kB │ gzip:  73.88 kB
│ dist/assets/firebase-fDW0arjg.js               513.16 kB │ gzip: 120.92 kB
│ ✓ built in 22.42s
apps/customer-web build$ tsc -p tsconfig.app.json --noEmit && vite build
│ vite v6.4.3 building for production...
│ transforming...
[1 lines collapsed]
│ rendering chunks...
│ computing gzip size...
│5dist/index.html                             0.69 kB │ gzip:   0.35 kB
│ dist/index.html                             0.69 kB │ gzip:   0.35 kB
│ dist/assets/index-DAqEjPaL.css              3.53 kB │ gzip:   1.23 kB
│ dist/assets/MarketplacePanel-HpcYY_KI.js    5.28 kB │ gzip:   1.89 kB
│ dist/assets/App-Bv9_k7uZ.js                 6.53 kB │ gzip:   2.21 kB
│ dist/assets/CheckoutPanel-BXkacNlj.js       8.76 kB │ gzip:   3.21 kB
│ dist/assets/query-Bqsh_jWd.js              42.52 kB │ gzip:  12.60 kBd
│ dist/assets/index-CvFd4ARc.js              84.01 kB │ gzip:  22.25 kB
└─ Done in 51.6sact-BLXyby6r.js             231.11 kB │ gzip:  73.88 kB
│ dist/assets/firebase-EXN5t2Je.js          496.03 kB │ gzip: 116.86 kBd
[4 lines collapsed]
│ computing gzip size...
│ dist/index.html                             0.68 kB │ gzip:   0.35 kB
│ dist/assets/index-B2HwEQrA.css              1.98 kB │ gzip:   0.82 kB
│ dist/assets/App-D4Ar6hM6.js                 5.36 kB │ gzip:   1.98 kB
│ dist/assets/MarketplacePanel-CFy8GCfd.js   10.51 kB │ gzip:   2.82 kB
│ dist/assets/query-B_frIeoR.js              38.63 kB │ gzip:  11.67 kB
│ dist/assets/index-zGHNSLi4.js              81.10 kB │ gzip:  21.42 kB
│ dist/assets/react-BLXyby6r.js             231.11 kB │ gzip:  73.88 kB
│ dist/assets/firebase-fDW0arjg.js          513.16 kB │ gzip: 120.92 kB
│ ✓ built in 12.84s
└─ Done in 40.3s
env: load .env.local
env: export EXPO_PUBLIC_FIREBASE_API_KEY EXPO_PUBLIC_FIREBASE_APP_ID EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID EXPO_PUBLIC_FIREBASE_PROJECT_ID EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET EXPO_PUBLIC_FUNCTIONS_REGION
Dependencies are up to date
env: load .env.local
env: export EXPO_PUBLIC_FIREBASE_API_KEY EXPO_PUBLIC_FIREBASE_APP_ID EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID EXPO_PUBLIC_FIREBASE_PROJECT_ID EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET EXPO_PUBLIC_FUNCTIONS_REGION
Dependencies are up to date
Packages: +1
+
Progress: resolved 1, reused 1, downloaded 0, added 1, done
env: load .env.local
env: export EXPO_PUBLIC_FIREBASE_API_KEY EXPO_PUBLIC_FIREBASE_APP_ID EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID EXPO_PUBLIC_FIREBASE_PROJECT_ID EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET EXPO_PUBLIC_FUNCTIONS_REGION
20/20 checks passed. No issues detected!
env: load .env.local
env: export EXPO_PUBLIC_FIREBASE_API_KEY EXPO_PUBLIC_FIREBASE_APP_ID EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID EXPO_PUBLIC_FIREBASE_PROJECT_ID EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET EXPO_PUBLIC_FUNCTIONS_REGION
20/20 checks passed. No issues detected!
mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$

## 2026-07-29 follow-up evidence

Galaxy Note9 / Expo Go:

```text
adb devices -l: SM-N960F connected as 2629bb3c470d7ece
Expo Go loaded the current Customer App bundle through adb reverse tcp:8081.
The screen rendered SPACEMAN / CUSTOMER APP and Catalog cached and current.
The live catalog remained populated with historical Phase 3 Playwright stores;
the configured Phase 4 store/item pair was not visible in the device catalog.
This earlier observation is superseded by the tagged Expo Go rerun recorded
below, which rendered the configured store/item and completed quote cleanup.
No FATAL EXCEPTION, AppError, Required public Firebase, PAYSTACK, or
GOOGLE_MAPS marker was returned by the targeted main/crash log query.
Current tagged-bundle capture:
docs/live-test-data-docs/images/phase4-images/Note9_expo-go_phase4-current-bundle-loaded_20260729.png
Updated-origin capture:
docs/live-test-data-docs/images/phase4-images/Note9_expo-go_phase4-corrected-origin-catalog_20260729.png
```

Signed webhook replay against retained development reference
`spc_checkout-d405ae2dc61a92bd` from the supplied transaction CSV:

```text
attempt 1: HTTP 200 {"received":true,"reconciled":true,"status":"paid"}
attempt 2: HTTP 200 {"received":true,"reconciled":true,"status":"paid"}
Firestore verification: checkout consumed, order paid, paymentEventCount=1.
The retained checkout has no testRunId and is not an exact-cleanup fixture.
```

The active development store `EYtuRg8911hAZYbnb0am` was corrected through
`upsertStore`; its origin is now latitude `-25.5407`, longitude `28.1007`.








mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$ gcloud services list --enabled --project=spacemansystemsbackend --filter='config.name:(places-backend.googleapis.com OR places.googleapis.com OR routes.googleapis.com)' --format='value(config.name)'
places-backend.googleapis.com
places.googleapis.com
routes.googleapis.com
mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$ gcloud secrets versions list PAYSTACK_SECRET_KEY --project=spacemansystemsbackend --format='table(name,state,createTime)'
gcloud secrets versions list GOOGLE_MAPS_SERVER_API_KEY --project=spacemansystemsbackend --format='table(name,state,createTime)'
NAME  STATE     CREATED
3     enabled   2026-07-26T16:26:37
2     enabled   2026-07-21T10:15:47
1     disabled  2026-07-21T03:48:09
NAME  STATE    CREATED
3     enabled  2026-07-24T11:52:19
2     enabled  2026-07-22T17:59:18
1     enabled  2026-07-21T19:19:11
mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$ phase4_paystack_candidate="$(gcloud secrets versions access 3 --secret=PAYSTACK_SECRET_KEY --project=spacemansystemsbackend)"
case "$phase4_paystack_candidate" in
  sk_test_*) echo "Paystack version 3 is test mode." ;;
  *) echo "ERROR: Paystack version 3 is not a test key."; unset phase4_paystack_candidate; exit 1 ;;
esac
unset phase4_paystack_candidate
Paystack version 3 is test mode.
mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$ rg -n 'export const (searchDeliveryAddresses|createCheckoutSession|upsertDeliveryZone|publishDeliveryFeeRule|updateCheckoutSettings|initializePaystackPayment|verifyPaystackPayment|handlePaystackWebhook|paystackPaymentReturn)' firebase/functions/src/phase4.ts
corepack pnpm --dir firebase/functions run build
1199:export const searchDeliveryAddresses = onCall(
1242:export const createCheckoutSession = onCall(
1456:export const upsertDeliveryZone = onCall(
1529:export const publishDeliveryFeeRule = onCall(
1639:export const updateCheckoutSettings = onCall(
1706:export const initializePaystackPayment = onCall(
1934:export const verifyPaystackPayment = onCall(
1980:export const handlePaystackWebhook = onRequest(
2052:export const paystackPaymentReturn = onRequest(

> @spaceman/firebase-functions@0.1.0 build /home/mmekwa/Desktop/projects/spacemansystems/firebase/functions
> tsup src/index.ts --format esm --target node22 --out-dir lib --clean --external firebase-admin --external firebase-functions

CLI Building entry: src/index.ts
CLI Using tsconfig: tsconfig.json
CLI tsup v8.5.1
CLI Target: node22
CLI Cleaning output folder
ESM Build start
ESM lib/index.js 297.58 KB
ESM ⚡️ Build success in 824ms
mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$ env -u DEBUG corepack pnpm exec firebase deploy --only firestore:rules,firestore:indexes --project spacemansystemsbackend
env -u DEBUG FUNCTIONS_DISCOVERY_TIMEOUT=60000 corepack pnpm exec firebase deploy --only functions:searchDeliveryAddresses,functions:createCheckoutSession,functions:upsertDeliveryZone,functions:publishDeliveryFeeRule,functions:updateCheckoutSettings,functions:initializePaystackPayment,functions:verifyPaystackPayment,functions:handlePaystackWebhook,functions:paystackPaymentReturn --project spacemansystemsbackend

=== Deploying to 'spacemansystemsbackend'...

i  deploying firestore
i  firestore: ensuring required API firestore.googleapis.com is enabled...
i  firestore: ensuring required API firestore.googleapis.com is enabled...
i  firestore: reading indexes from firestore.indexes.json...
i  cloud.firestore: checking firestore.rules for compilation errors...
✔  cloud.firestore: rules file firestore.rules compiled successfully
i  firestore: latest version of firestore.rules already up to date, skipping upload...
i  firestore: deploying indexes...
✔  firestore: deployed indexes in firestore.indexes.json successfully for (default) database
✔  firestore: released rules firestore.rules to cloud.firestore

✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/spacemansystemsbackend/overview

=== Deploying to 'spacemansystemsbackend'...

i  deploying functions
Running command: corepack pnpm --dir firebase/functions run build

> @spaceman/firebase-functions@0.1.0 build /home/mmekwa/Desktop/projects/spacemansystems/firebase/functions
> tsup src/index.ts --format esm --target node22 --out-dir lib --clean --external firebase-admin --external firebase-functions

CLI Building entry: src/index.ts
CLI Using tsconfig: tsconfig.json
CLI tsup v8.5.1
CLI Target: node22
CLI Cleaning output folder
ESM Build start
ESM lib/index.js 297.58 KB
ESM ⚡️ Build success in 273ms
✔  functions: Finished running predeploy script.
i  functions: preparing codebase default for deployment
i  functions: ensuring required API cloudfunctions.googleapis.com is enabled...
i  functions: ensuring required API cloudbuild.googleapis.com is enabled...
i  artifactregistry: ensuring required API artifactregistry.googleapis.com is enabled...
⚠  functions: package.json indicates an outdated version of firebase-functions. Please upgrade using npm install --save firebase-functions@latest in your functions directory.
i  functions: Loading and analyzing source code for codebase default to determine what to deploy
Serving at port 8813

i  extensions: ensuring required API firebaseextensions.googleapis.com is enabled...
i  functions: Loaded environment variables from .env.spacemansystemsbackend.
i  functions: preparing firebase/functions directory for uploading...
i  functions: packaged /home/mmekwa/Desktop/projects/spacemansystems/firebase/functions (129.38 KB) for uploading
i  functions: ensuring required API run.googleapis.com is enabled...
i  functions: ensuring required API eventarc.googleapis.com is enabled...
i  functions: ensuring required API pubsub.googleapis.com is enabled...
i  functions: ensuring required API storage.googleapis.com is enabled...
i  functions: generating the service identity for pubsub.googleapis.com...
i  functions: generating the service identity for eventarc.googleapis.com...
i  functions: ensuring required API secretmanager.googleapis.com is enabled...
✔  functions: firebase/functions source uploaded successfully
i  functions: updating Node.js 22 (2nd Gen) function createCheckoutSession(africa-south1)...
i  functions: updating Node.js 22 (2nd Gen) function handlePaystackWebhook(africa-south1)...
i  functions: updating Node.js 22 (2nd Gen) function initializePaystackPayment(africa-south1)...
i  functions: updating Node.js 22 (2nd Gen) function paystackPaymentReturn(africa-south1)...
i  functions: updating Node.js 22 (2nd Gen) function publishDeliveryFeeRule(africa-south1)...
i  functions: updating Node.js 22 (2nd Gen) function searchDeliveryAddresses(africa-south1)...
i  functions: updating Node.js 22 (2nd Gen) function updateCheckoutSettings(africa-south1)...
i  functions: updating Node.js 22 (2nd Gen) function upsertDeliveryZone(africa-south1)...
i  functions: updating Node.js 22 (2nd Gen) function verifyPaystackPayment(africa-south1)...
✔  functions[upsertDeliveryZone(africa-south1)] Successful update operation.
✔  functions[handlePaystackWebhook(africa-south1)] Successful update operation.
✔  functions[createCheckoutSession(africa-south1)] Successful update operation.
✔  functions[searchDeliveryAddresses(africa-south1)] Successful update operation.
✔  functions[verifyPaystackPayment(africa-south1)] Successful update operation.
✔  functions[initializePaystackPayment(africa-south1)] Successful update operation.
✔  functions[paystackPaymentReturn(africa-south1)] Successful update operation.
✔  functions[updateCheckoutSettings(africa-south1)] Successful update operation.
✔  functions[publishDeliveryFeeRule(africa-south1)] Successful update operation.
Function URL (handlePaystackWebhook(africa-south1)): https://handlepaystackwebhook-f7mhgkm75a-bq.a.run.app
Function URL (paystackPaymentReturn(africa-south1)): https://paystackpaymentreturn-f7mhgkm75a-bq.a.run.app

✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/spacemansystemsbackend/overview
mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$




mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$ for phase4_service in searchdeliveryaddresses createcheckoutsession upsertdeliveryzone publishdeliveryfeerule updatecheckoutsettings initializepaystackpayment verifypaystackpayment handlepaystackwebhook paystackpaymentreturn
do
  gcloud run services get-iam-policy "$phase4_service" --project=spacemansystemsbackend --region=africa-south1 --flatten='bindings[].members' --filter='bindings.role:roles/run.invoker AND bindings.members:allUsers' --format='table(bindings.role,bindings.members)'
done
ROLE               MEMBERS
roles/run.invoker  allUsers
ROLE               MEMBERS
roles/run.invoker  allUsers
ROLE               MEMBERS
roles/run.invoker  allUsers
ROLE               MEMBERS
roles/run.invoker  allUsers
ROLE               MEMBERS
roles/run.invoker  allUsers
ROLE               MEMBERS
roles/run.invoker  allUsers
ROLE               MEMBERS
roles/run.invoker  allUsers
ROLE               MEMBERS
roles/run.invoker  allUsers
ROLE               MEMBERS
roles/run.invoker  allUsers
mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$






mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$ (
  set -a
  source apps/customer-web/.env.local
  set +a
  env -u DEBUG GOOGLE_CLOUD_PROJECT=spacemansystemsbackend SPACEMAN_ENVIRONMENT=development SPACEMAN_FUNCTIONS_REGION="${VITE_FUNCTIONS_REGION:-africa-south1}" SPACEMAN_FIREBASE_WEB_API_KEY="$VITE_FIREBASE_API_KEY" corepack pnpm --dir firebase/functions run test:checkout:live
)

> @spaceman/firebase-functions@0.1.0 test:checkout:live /home/mmekwa/Desktop/projects/spacemansystems/firebase/functions
> node scripts/live-checkout.mjs

PASS isolated active test identities
PASS versioned zone, fee, and enable configuration
PASS open catalog fixture above minimum order
PASS three-character address minimum
PASS server-only Places autocomplete
PASS ZA locality, Routes distance/ETA, and clamped fee snapshot
PASS stable checkout idempotency
PASS idempotency-key input conflict
PASS invalid place/provider failure
PASS out-of-zone checkout denial
PASS direct checkout-session write denial
PASS direct order write denial
PASS cross-customer checkout read denial
PASS unsigned webhook denial
PASS catalog-change quote denial
PASS server-owned Paystack amount, reference, and hosted URL
PASS unpaid or abandoned checkout creates no order
Phase 4 live matrix passed for phase4_checkout_1785263019703_447d3a33.
PASS exact Auth and Firestore cleanup
mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$ (
  set -a
  source apps/customer-web/.env.local
  set +a
  env -u DEBUG GOOGLE_CLOUD_PROJECT=spacemansystemsbackend SPACEMAN_ENVIRONMENT=development SPACEMAN_FUNCTIONS_REGION="${VITE_FUNCTIONS_REGION:-africa-south1}" SPACEMAN_FIREBASE_WEB_API_KEY="$VITE_FIREBASE_API_KEY" corepack pnpm --dir firebase/functions run test:checkout:live -- --complete-payment
)

> @spaceman/firebase-functions@0.1.0 test:checkout:live /home/mmekwa/Desktop/projects/spacemansystems/firebase/functions
> node scripts/live-checkout.mjs -- --complete-payment

PASS isolated active test identities
PASS versioned zone, fee, and enable configuration
PASS open catalog fixture above minimum order
PASS three-character address minimum
PASS server-only Places autocomplete
PASS ZA locality, Routes distance/ETA, and clamped fee snapshot
PASS stable checkout idempotency
PASS idempotency-key input conflict
PASS invalid place/provider failure
PASS out-of-zone checkout denial
PASS direct checkout-session write denial
PASS direct order write denial
PASS cross-customer checkout read denial
PASS unsigned webhook denial
PASS catalog-change quote denial
PASS server-owned Paystack amount, reference, and hosted URL
OWNER ACTION: open the following Paystack test URL, complete one successful test payment, then return here.
[REDACTED: temporary Paystack hosted checkout URL]
Press Enter only after Paystack reports success:
PASS exactly-once paid order and repeated verification
Phase 4 live matrix passed for phase4_checkout_1785263181986_e559bf05.
PASS exact Auth and Firestore cleanup
mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$






mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$ (
  set -a
  source .phase3-owner.env.local
  set +a
  corepack pnpm test:web:e2e
)

> spacemansystems@0.1.0 test:web:e2e /home/mmekwa/Desktop/projects/spacemansystems
> corepack pnpm --filter @spaceman/admin-web build && corepack pnpm --filter @spaceman/merchant-web build && corepack pnpm --filter @spaceman/customer-web build && playwright test


> @spaceman/admin-web@0.1.0 build /home/mmekwa/Desktop/projects/spacemansystems/apps/admin-web
> tsc -p tsconfig.app.json --noEmit && vite build

vite v6.4.3 building for production...
✓ 132 modules transformed.
dist/index.html                                  0.68 kB │ gzip:   0.35 kB
dist/assets/index-DFZoLQTM.css                   2.22 kB │ gzip:   0.85 kB
dist/assets/CheckoutSettingsPanel-CD04F0UG.js    6.53 kB │ gzip:   2.39 kB
dist/assets/App-CH7OmfDm.js                      7.93 kB │ gzip:   2.42 kB
dist/assets/MarketplacePanel-BdUqrBju.js        11.25 kB │ gzip:   3.46 kB
dist/assets/query-vzhSoX6Q.js                   41.32 kB │ gzip:  12.30 kB
dist/assets/index-DcMIeNNX.js                   82.67 kB │ gzip:  21.80 kB
dist/assets/react-BLXyby6r.js                  231.11 kB │ gzip:  73.88 kB
dist/assets/firebase-fDW0arjg.js               513.16 kB │ gzip: 120.92 kB
✓ built in 15.37s

> @spaceman/merchant-web@0.1.0 build /home/mmekwa/Desktop/projects/spacemansystems/apps/merchant-web
> tsc -p tsconfig.app.json --noEmit && vite build

vite v6.4.3 building for production...
✓ 131 modules transformed.
dist/index.html                             0.68 kB │ gzip:   0.35 kB
dist/assets/index-B2HwEQrA.css              1.98 kB │ gzip:   0.82 kB
dist/assets/App-D4Ar6hM6.js                 5.36 kB │ gzip:   1.98 kB
dist/assets/MarketplacePanel-CFy8GCfd.js   10.51 kB │ gzip:   2.82 kB
dist/assets/query-B_frIeoR.js              38.63 kB │ gzip:  11.67 kB
dist/assets/index-zGHNSLi4.js              81.10 kB │ gzip:  21.42 kB
dist/assets/react-BLXyby6r.js             231.11 kB │ gzip:  73.88 kB
dist/assets/firebase-fDW0arjg.js          513.16 kB │ gzip: 120.92 kB
✓ built in 13.68s

> @spaceman/customer-web@0.1.0 build /home/mmekwa/Desktop/projects/spacemansystems/apps/customer-web
> tsc -p tsconfig.app.json --noEmit && vite build

vite v6.4.3 building for production...
✓ 134 modules transformed.
dist/index.html                             0.69 kB │ gzip:   0.35 kB
dist/assets/index-DAqEjPaL.css              3.53 kB │ gzip:   1.23 kB
dist/assets/MarketplacePanel-HpcYY_KI.js    5.28 kB │ gzip:   1.89 kB
dist/assets/App-Bv9_k7uZ.js                 6.53 kB │ gzip:   2.21 kB
dist/assets/CheckoutPanel-BXkacNlj.js       8.76 kB │ gzip:   3.21 kB
dist/assets/query-Bqsh_jWd.js              42.52 kB │ gzip:  12.60 kB
dist/assets/index-CvFd4ARc.js              84.01 kB │ gzip:  22.25 kB
dist/assets/react-BLXyby6r.js             231.11 kB │ gzip:  73.88 kB
dist/assets/firebase-EXN5t2Je.js          496.03 kB │ gzip: 116.86 kB
✓ built in 13.86s

Running 8 tests using 1 worker

  ✓  1 [phase3-matrix] › tests/web-e2e/phase3-live-matrix.spec.ts:105:5 › Phase 3 core marketplace web matrix (2.8m)
  ✓  2 …web-e2e/phase3-live-matrix.spec.ts:445:5 › Phase 3 customer final visibility, unavailable, pagination, and error feedback (18.2s)
  ✓  3 …dations] › tests/web-e2e/web-foundations.spec.ts:3:5 › admin web exposes invitation-only identity and marketplace boundary (4.6s)
  ✓  4 …] › tests/web-e2e/web-foundations.spec.ts:22:5 › merchant web exposes invitation-only identity and scoped catalog boundary (2.7s)
  ✓  5 …ations] › tests/web-e2e/web-foundations.spec.ts:39:5 › customer web keeps active-catalog browse public and guards checkout (2.5s)
  ✓  6 [web-foundations] › tests/web-e2e/web-foundations.spec.ts:66:5 › customer marketplace remains usable on a phone viewport (3.2s)
  ✓  7 …b-e2e/phase3-live-continuation.spec.ts:105:5 › Phase 3 continues from persisted Google, CSV, merchant, and customer state (43.8s)
  ✓  8 …tion] › tests/web-e2e/phase3-live-continuation.spec.ts:247:5 › Phase 3 final Customer Web hidden-parent visibility checks (23.7s)

  8 passed (5.6m)
mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$





mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$ (
  set -a
  source .phase4-owner.env.local
  set +a
  corepack pnpm test:web:e2e:phase4
)

> spacemansystems@0.1.0 test:web:e2e:phase4 /home/mmekwa/Desktop/projects/spacemansystems
> node tools/scripts/run-phase4-playwright.mjs

Running isolated Phase 4 browser acceptance as phase4_playwright_1785267576141_fde0c50e.

> @spaceman/customer-web@0.1.0 build /home/mmekwa/Desktop/projects/spacemansystems/apps/customer-web
> tsc -p tsconfig.app.json --noEmit && vite build

vite v6.4.3 building for production...
✓ 134 modules transformed.
dist/index.html                             0.69 kB │ gzip:   0.35 kB
dist/assets/index-DAqEjPaL.css              3.53 kB │ gzip:   1.23 kB
dist/assets/MarketplacePanel-DH6nXCJ9.js    5.28 kB │ gzip:   1.89 kB
dist/assets/App-BD_YF4Zm.js                 6.53 kB │ gzip:   2.21 kB
dist/assets/CheckoutPanel-DzQv4JON.js       8.76 kB │ gzip:   3.21 kB
dist/assets/query-Bqsh_jWd.js              42.52 kB │ gzip:  12.60 kB
dist/assets/index-zhMnmyav.js              84.07 kB │ gzip:  22.30 kB
dist/assets/react-BLXyby6r.js             231.11 kB │ gzip:  73.88 kB
dist/assets/firebase-EXN5t2Je.js          496.03 kB │ gzip: 116.86 kB
✓ built in 16.21s

Running 1 test using 1 worker

  ✓  1 …pec.ts:102:5 › Customer Web hosted-checkout owner acceptance (42.5s)

  1 passed (60.0s)
mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$






mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$ gcloud secrets versions disable 2 --secret=PAYSTACK_SECRET_KEY --project=spacemansystemsbackend
gcloud secrets versions list PAYSTACK_SECRET_KEY --project=spacemansystemsbackend --format='table(name,state,createTime)'
Disabled version [2] of the secret [PAYSTACK_SECRET_KEY].
NAME  STATE     CREATED
3     enabled   2026-07-26T16:26:37
2     disabled  2026-07-21T10:15:47
1     disabled  2026-07-21T03:48:09
mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$



mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$ gcloud services api-keys describe [REDACTED_API_KEY_RESOURCE_ID] \
  --project=spacemansystemsbackend \
  --location=global \
  --format='yaml(displayName,restrictions.apiTargets)'
displayName: Phase 3 Places server key
restrictions:
  apiTargets:
  - service: places-backend.googleapis.com
  - service: places.googleapis.com
  - service: routes.googleapis.com
mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$







[REDACTED: verbose handlePaystackWebhook and verifyPaystackPayment logs contained account, network, OAuth, service-account, build-token, and provider identifiers.]
2026-07-28T18:28:21.401528Z I handlepaystackwebhook: [empty application log entry]
2026-07-28T20:11:00.831064Z I handlepaystackwebhook: [empty application log entry]
2026-07-28T18:29:14.213341Z D verifypaystackpayment: Callable request verification passed; Firebase Auth valid; App Check missing.
2026-07-28T18:29:14.859112Z D verifypaystackpayment: Callable request verification passed; Firebase Auth valid; App Check missing.
2026-07-28T20:11:16.062893Z D verifypaystackpayment: Callable request verification passed; Firebase Auth valid; App Check missing.
[HISTORICAL, SUPERSEDED: time-correlated INFO requests alone were incomplete;
the signed replay record above now supplies two reconciled same-reference
results.]

2026-07-29T00:38:37Z — Tagged corrected-origin quote check
Run ID: `phase4_route_20260729_01`
Store: `EYtuRg8911hAZYbnb0am`; item: `import-6cb4499b-J3D5pF3hMtk5-0001`.
The deployed `searchDeliveryAddresses` and `createCheckoutSession` Functions
returned five Mabopane candidates and an authoritative quote with store
origin `(-25.5407, 28.1007)`, destination `(-25.4969374, 28.0854775)`, route
distance `7,391 m`, duration `791 s`, delivery fee `R47.57`, and total
`R97.57`. The exact `cleanupTestFixtures` call returned `remaining: 0`.

Read-only catalog ordering check: 67 active/approved stores were returned;
`EYtuRg8911hAZYbnb0am` (`store to r`) is record 12, which is the end of the
Customer App's first page of 12. A bounded Expo Go scroll exposed `store to r`
and a persisted cart, but the rendered menu did not expose `Kiddos Meal`; the
device also showed an Expo CLI connection toast. At that checkpoint this was a
device catalog/cart-state blocker, not a missing active store record. The
tagged rerun below resolved it. Captures:
`Note9_expo-go_phase4-scroll_20260729.png` and
`Note9_expo-go_phase4-current-bundle-loaded_20260729.png`.

2026-07-29T03:27:19+02:00 — Expo Go rerun on Galaxy Note9
Run ID: `phase4_note9_20260729_0002`.
The fresh bundle loaded, the old cart was cleared, `store to r` rendered, and
`Kiddos Meal` (R50) was found and added. Owner sign-in succeeded. The first
validated Mabopane address suggestion was selected and the app displayed
`Review server quote`, delivery `R47.57`, route `7.4 km · about 14 min`, and
total `R97.57`. The exact development cleanup callable deleted `1` tagged
checkout session and returned `remaining: 0`. No payment was submitted in this
rerun. This resolves the previously recorded catalog/cart-state blocker.



mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$ (
  set -a
  source apps/customer-web/.env.local
  set +a

  env -u DEBUG \
    GOOGLE_CLOUD_PROJECT=spacemansystemsbackend \
    SPACEMAN_ENVIRONMENT=development \
    SPACEMAN_FUNCTIONS_REGION="${VITE_FUNCTIONS_REGION:-africa-south1}" \
    SPACEMAN_FIREBASE_WEB_API_KEY="$VITE_FIREBASE_API_KEY" \
    corepack pnpm --dir firebase/functions run test:checkout:live -- --complete-payment
)

> @spaceman/firebase-functions@0.1.0 test:checkout:live /home/mmekwa/Desktop/projects/spacemansystems/firebase/functions
> node scripts/live-checkout.mjs -- --complete-payment

PASS isolated active test identities
PASS versioned zone, fee, and enable configuration
PASS open catalog fixture above minimum order
PASS three-character address minimum
PASS server-only Places autocomplete
PASS ZA locality, Routes distance/ETA, and clamped fee snapshot
PASS stable checkout idempotency
PASS idempotency-key input conflict
PASS invalid place/provider failure
PASS out-of-zone checkout denial
PASS direct checkout-session write denial
PASS direct order write denial
PASS cross-customer checkout read denial
PASS unsigned webhook denial
PASS catalog-change quote denial
PASS server-owned Paystack amount, reference, and hosted URL
OWNER ACTION: open the following Paystack test URL, complete one successful test payment, then return here.
[REDACTED: temporary Paystack hosted checkout URL]
Press Enter only after Paystack reports success:
PASS exactly-once paid order and repeated verification
Phase 4 live matrix passed for phase4_checkout_1785274758928_78d1be8d.
PASS exact Auth and Firestore cleanup
mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$





mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$ cd /home/mmekwa/Desktop/projects/spacemansystems

corepack pnpm --filter @spaceman/customer-app exec expo install --check

env -u DEBUG corepack pnpm dlx expo-doctor apps/customer-app

rm -rf .local-evidence/phase4-customer-export

corepack pnpm --filter @spaceman/customer-app exec expo export \
  --platform android \
  --output-dir .local-evidence/phase4-customer-export
env: load .env.local
env: export EXPO_PUBLIC_FIREBASE_API_KEY EXPO_PUBLIC_FIREBASE_APP_ID EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID EXPO_PUBLIC_FIREBASE_PROJECT_ID EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET EXPO_PUBLIC_FUNCTIONS_REGION
Dependencies are up to date
Packages: +1
+
Progress: resolved 1, reused 1, downloaded 0, added 1, done
env: load .env.local
env: export EXPO_PUBLIC_FIREBASE_API_KEY EXPO_PUBLIC_FIREBASE_APP_ID EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID EXPO_PUBLIC_FIREBASE_PROJECT_ID EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET EXPO_PUBLIC_FUNCTIONS_REGION
20/20 checks passed. No issues detected!
env: load .env.local
env: export EXPO_PUBLIC_FIREBASE_API_KEY EXPO_PUBLIC_FIREBASE_APP_ID EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID EXPO_PUBLIC_FIREBASE_PROJECT_ID EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET EXPO_PUBLIC_FUNCTIONS_REGION
Expo Autolinking module resolution enabled
Starting Metro Bundler

Android Bundled 165944ms node_modules/.pnpm/expo-router@57.0.8_c62b5c47f265dedcd5900e29fd3f1de2/node_modules/expo-router/entry.js (1332 modules)

› Assets (27):
../../node_modules/.pnpm/@expo-google-fonts+material-symbols@0.4.41/node_modules/@expo-google-fonts/material-symbols/400Regular/MaterialSymbols_400Regular.ttf (962KB)
../../node_modules/.pnpm/expo-router@57.0.8_c62b5c47f265dedcd5900e29fd3f1de2/node_modules/expo-router/assets/arrow_down.png (9.5KB)
../../node_modules/.pnpm/expo-router@57.0.8_c62b5c47f265dedcd5900e29fd3f1de2/node_modules/expo-router/assets/arrow_right.xml (307B)
../../node_modules/.pnpm/expo-router@57.0.8_c62b5c47f265dedcd5900e29fd3f1de2/node_modules/expo-router/assets/checkmark.xml (312B)
../../node_modules/.pnpm/expo-router@57.0.8_c62b5c47f265dedcd5900e29fd3f1de2/node_modules/expo-router/assets/error.png (469B)
../../node_modules/.pnpm/expo-router@57.0.8_c62b5c47f265dedcd5900e29fd3f1de2/node_modules/expo-router/assets/file.png (138B)
../../node_modules/.pnpm/expo-router@57.0.8_c62b5c47f265dedcd5900e29fd3f1de2/node_modules/expo-router/assets/forward.png (188B)
../../node_modules/.pnpm/expo-router@57.0.8_c62b5c47f265dedcd5900e29fd3f1de2/node_modules/expo-router/assets/pkg.png (364B)
../../node_modules/.pnpm/expo-router@57.0.8_c62b5c47f265dedcd5900e29fd3f1de2/node_modules/expo-router/assets/react-navigation/elements/back-icon-mask.png (653B)
../../node_modules/.pnpm/expo-router@57.0.8_c62b5c47f265dedcd5900e29fd3f1de2/node_modules/expo-router/assets/react-navigation/elements/back-icon.png (4 variations | 152B)
../../node_modules/.pnpm/expo-router@57.0.8_c62b5c47f265dedcd5900e29fd3f1de2/node_modules/expo-router/assets/react-navigation/elements/clear-icon.png (4 variations | 425B)
../../node_modules/.pnpm/expo-router@57.0.8_c62b5c47f265dedcd5900e29fd3f1de2/node_modules/expo-router/assets/react-navigation/elements/close-icon.png (4 variations | 235B)
../../node_modules/.pnpm/expo-router@57.0.8_c62b5c47f265dedcd5900e29fd3f1de2/node_modules/expo-router/assets/react-navigation/elements/search-icon.png (4 variations | 599B)
../../node_modules/.pnpm/expo-router@57.0.8_c62b5c47f265dedcd5900e29fd3f1de2/node_modules/expo-router/assets/sitemap.png (465B)
../../node_modules/.pnpm/expo-router@57.0.8_c62b5c47f265dedcd5900e29fd3f1de2/node_modules/expo-router/assets/unmatched.png (4.8KB)

› android bundles (1):
_expo/static/js/android/entry-639bc6b281b288b459481f314a080390.hbc (4.4MB)

› Files (1):
metadata.json (1.9KB)

Exported: .local-evidence/phase4-customer-export
mmekwa@mmekwa-L1420:~/Desktop/projects/spacemansystems$ 