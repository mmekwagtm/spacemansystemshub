# Manual five-app live-test runbook

This runbook applies to the canonical checkout at
`/home/mmekwa/Desktop/projects/spacemansystems` and the real
`spacemansystemsbackend` **development** Firebase project. Do not use emulators
or production. Every command below states its working directory.

Never print or commit `.env.local`, `google-services.json`, provider secrets,
service accounts, access tokens, Firebase config contents, or generated test
accounts. Testing, review, commits, and pushes are manual.

Phase 2 is complete. Phase 3 source, deployment, Playwright, and self-cleaning
development-live work have passed their recorded gates. The external
JSON/HTTPS catalog API workflow was subsequently removed; CSV selected-row
commit and Google Places store staging remain. Phase 3 remains 0% accepted
until the narrowed live matrix and the owner-operated five-app/manual matrix
below pass. Do not mark Phase 3 complete from source, deployment, or automated
evidence alone.

## 0. Required security action before payment work

The original Paystack test secret appeared in diagnostic output during Phase 2
setup. Before any Phase 4 payment test:

1. In the Paystack Dashboard, rotate the **test-mode** secret key. Do not reuse
   the value currently stored in `docs/paystack-test`.
2. Store the new value interactively. Run from
   `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
env -u DEBUG corepack pnpm exec firebase functions:secrets:set PAYSTACK_SECRET_KEY --project spacemansystemsbackend
```

Paste the rotated value only at the hidden prompt. Do not put it on the command
line.

3. Confirm that a new enabled version exists. Run from
   `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
gcloud secrets versions list PAYSTACK_SECRET_KEY --project=spacemansystemsbackend --format='table(name,state,createTime)'
```

4. After the new version is enabled, disable exposed version `1`. Run from
   `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
gcloud secrets versions disable 1 --secret=PAYSTACK_SECRET_KEY --project=spacemansystemsbackend
```

No Paystack payment Function is part of Phase 3, so do not deploy payment code
after this rotation.

## 1. Inspect the checkout

Run from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
pwd
git status --short --branch
git branch --show-current
git diff --check
```

Phase 3 must start from a clean tracked checkout. Stop if the status reports an
unreviewed modification, staged file, duplicate package-manager lockfile, or
tracked secret/generated file. Normal ignored pnpm, build, Expo, and test
caches may remain. Preserve unrelated work; do not use reset, checkout, clean,
or force-push as a shortcut.

## 2. Verify the toolchain and dependency state

Run from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
node --version
corepack pnpm --version
corepack pnpm exec firebase --version
gcloud --version
java -version
```

Node must satisfy `>=22.13.0`; pnpm must match the root `package.json`.

Synchronize an existing checkout from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @spaceman/customer-app exec expo install --check
corepack pnpm --filter @spaceman/driver-app exec expo install --check
```

Do not run npm/yarn or manually alter `node_modules/.pnpm`.

## 3. Verify the development Firebase target

Run from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm exec firebase use
corepack pnpm exec firebase projects:list
gcloud config get-value project
corepack pnpm exec firebase functions:list --project spacemansystemsbackend
```

Stop if any command selects production or an unexpected project. The six
accepted Phase 2 identity Functions and 13 Phase 3 marketplace Functions must
be listed in `africa-south1`.

Verify ignored local inputs without printing them. Run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
test -s apps/admin-web/.env.local
test -s apps/merchant-web/.env.local
test -s apps/customer-web/.env.local
test -s apps/customer-app/.env.local
test -s apps/driver-app/.env.local
test -s apps/customer-app/google-services.json
test -s apps/driver-app/google-services.json
git check-ignore apps/admin-web/.env.local apps/merchant-web/.env.local apps/customer-web/.env.local apps/customer-app/.env.local apps/driver-app/.env.local apps/customer-app/google-services.json apps/driver-app/google-services.json
```

Only if a native file is missing, restore Customer App from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
env -u DEBUG corepack pnpm exec firebase apps:sdkconfig ANDROID 1:421320726419:android:77598e1763016ad87eba66 --project spacemansystemsbackend -o apps/customer-app/google-services.json
```

Only if a native file is missing, restore Driver App from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
env -u DEBUG corepack pnpm exec firebase apps:sdkconfig ANDROID 1:421320726419:android:ecf83418678098427eba66 --project spacemansystemsbackend -o apps/driver-app/google-services.json
```

Never display or stage those files.

## 4. Run the complete source-quality gate

Run from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm docs:check
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

Every command must pass before a manual commit. During Phase 3, compare the web
chunk report with the Phase 2 baseline and confirm marketplace routes/media
code are lazy-loaded rather than increasing every entry bundle unchecked.

## 5. Run Playwright manually

Install the checked-in Chromium browser once. Run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm exec playwright install chromium
```

Run the three-web regression suite from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm test:web:e2e
```

The harness builds and previews Admin Web on `127.0.0.1:4173`, Merchant Web on
`127.0.0.1:4174`, and Customer Web on `127.0.0.1:4175`. It covers Admin and
Merchant guest boundaries, Customer public marketplace/protected checkout, and
a phone viewport. Authenticated marketplace publication, imports, media,
cross-store denial, and retirement are covered by the live/manual matrix rather
than browser fixtures. A cold browser launch can take several minutes on this
two-core workstation. Inspect failure traces and the generated
`phase3-*.png` screenshots under ignored `test-results/` before removal.

## 6. Re-run the accepted Phase 2 security matrix

Application Default Credentials must belong to an account authorized for the
development project. If they are absent, run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
gcloud auth application-default login
```

Run the guarded identity test from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
(
  set -a
  source apps/customer-web/.env.local
  set +a
  env -u DEBUG GOOGLE_CLOUD_PROJECT=spacemansystemsbackend SPACEMAN_ENVIRONMENT=development SPACEMAN_FUNCTIONS_REGION=africa-south1 SPACEMAN_FIREBASE_WEB_API_KEY="$VITE_FIREBASE_API_KEY" corepack pnpm --dir firebase/functions run test:identity:live
)
```

The result must report every case as `passed` and end with `Live identity
fixture cleanup completed and verified.` The script uses a random exact
`testRunId`, temporary Firebase Auth UIDs, and post-cleanup Firestore/Auth
verification. Never run it against another project.

## 7. Bootstrap the retained development super-admin

Choose an email inbox you control. This is a retained development identity,
not a disposable test fixture. Run from
`/home/mmekwa/Desktop/projects/spacemansystems`, replacing both placeholders:

```sh
GOOGLE_CLOUD_PROJECT=spacemansystemsbackend SPACEMAN_ENVIRONMENT=development corepack pnpm --dir firebase/functions run bootstrap:super-admin -- --email=YOUR_EMAIL_ADDRESS --display-name="YOUR_DISPLAY_NAME"
```

The command is idempotent for the same super-admin email and does not create or
print a password.

## 8. Configure and deploy the Phase 3 development backend

Milestones 3.1 through 3.4 are implemented. Repeat deployment only after the
commands in section 4 pass and the exact diff is reviewed. Never enable Routes,
serviceability, or a payment API for this phase.

The development project already has a dedicated Places-API-restricted server
key in Secret Manager. Only if `GOOGLE_MAPS_SERVER_API_KEY` is absent, create a
replacement key with the same restriction without printing it, then store it
interactively. Run the interactive storage command from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
env -u DEBUG corepack pnpm exec firebase functions:secrets:set GOOGLE_MAPS_SERVER_API_KEY --project spacemansystemsbackend
```

Confirm enabled secret versions without reading their values. Run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
gcloud secrets versions list GOOGLE_MAPS_SERVER_API_KEY --project=spacemansystemsbackend --format='table(name,state,createTime)'
```

External JSON/HTTPS catalog API import is prohibited. Its callable and
`CATALOG_IMPORT_ALLOWED_HOSTS` secret must remain absent. Verify that state
without reading any secret value. Run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
if corepack pnpm exec firebase functions:list --project spacemansystemsbackend | rg -q 'stageApiCatalogImport'; then
  echo "ERROR: prohibited API catalog callable still exists"
  exit 1
fi
if gcloud secrets describe CATALOG_IMPORT_ALLOWED_HOSTS --project=spacemansystemsbackend >/dev/null 2>&1; then
  echo "ERROR: prohibited catalog host-allowlist secret still exists"
  exit 1
fi
echo "Prohibited API catalog cloud resources are absent."
```

Confirm every planned marketplace export exists before deployment. Run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
rg -n 'export const (upsertStore|submitMerchantStore|reviewStoreSubmission|updateMerchantStore|upsertItem|setItemAvailability|retireCatalogItem|searchStorePlaces|stageGoogleStoreImport|stageCsvCatalogImport|commitCatalogImport|cancelCatalogImport|cleanupCatalogMedia)' firebase/functions/src/marketplace.ts
```

Build the deployable Functions bundle. Run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm --dir firebase/functions run build
```

Review the diff, then deploy only development marketplace infrastructure. Run
from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
env -u DEBUG corepack pnpm exec firebase deploy --only firestore:rules,firestore:indexes,storage --project spacemansystemsbackend
env -u DEBUG FUNCTIONS_DISCOVERY_TIMEOUT=60000 corepack pnpm exec firebase deploy --only functions:upsertStore,functions:submitMerchantStore,functions:reviewStoreSubmission,functions:updateMerchantStore,functions:upsertItem,functions:setItemAvailability,functions:retireCatalogItem,functions:searchStorePlaces,functions:stageGoogleStoreImport,functions:stageCsvCatalogImport,functions:commitCatalogImport,functions:cancelCatalogImport,functions:cleanupCatalogMedia --project spacemansystemsbackend
```

Confirm the expected functions and region. Run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm exec firebase functions:list --project spacemansystemsbackend
```

Firebase callable Functions require public HTTP transport invocation; the
handler then enforces Firebase Auth, canonical role/status, and store scope.
First inspect the exact 13 Cloud Run policies. Run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
for phase3_service in upsertstore submitmerchantstore reviewstoresubmission updatemerchantstore upsertitem setitemavailability retirecatalogitem searchstoreplaces stagegooglestoreimport stagecsvcatalogimport commitcatalogimport cancelcatalogimport cleanupcatalogmedia
do
  gcloud run services get-iam-policy "$phase3_service" --project=spacemansystemsbackend --region=africa-south1 --flatten='bindings[].members' --filter='bindings.role:roles/run.invoker AND bindings.members:allUsers' --format='table(bindings.role,bindings.members)'
done
```

If every result is empty, stop and explicitly approve this persistent IAM
change. Only after that approval, grant the transport binding to exactly those
services. Run from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
for phase3_service in upsertstore submitmerchantstore reviewstoresubmission updatemerchantstore upsertitem setitemavailability retirecatalogitem searchstoreplaces stagegooglestoreimport stagecsvcatalogimport commitcatalogimport cancelcatalogimport cleanupcatalogmedia
do
  gcloud run services add-iam-policy-binding "$phase3_service" --project=spacemansystemsbackend --region=africa-south1 --member=allUsers --role=roles/run.invoker --quiet
done
```

Rerun the read-only policy loop and require one `roles/run.invoker`/`allUsers`
row for every service. Do not grant this role project-wide or to any unrelated
Cloud Run service.

## 9. Run the self-cleaning Phase 3 marketplace matrix

Application Default Credentials must belong to an account authorized for the
development project. The checked-in script uses a Mabopane Places query.
Override that query only with a reviewed non-sensitive development location.
Run from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
(
  set -a
  source apps/customer-web/.env.local
  set +a
  env -u DEBUG GOOGLE_CLOUD_PROJECT=spacemansystemsbackend SPACEMAN_ENVIRONMENT=development SPACEMAN_FUNCTIONS_REGION="${VITE_FUNCTIONS_REGION:-africa-south1}" SPACEMAN_FIREBASE_WEB_API_KEY="$VITE_FIREBASE_API_KEY" SPACEMAN_FIREBASE_STORAGE_BUCKET="$VITE_FIREBASE_STORAGE_BUCKET" corepack pnpm --dir firebase/functions run test:marketplace:live
)
```

The script must use a random exact `testRunId`, report every case as passed,
and verify zero tagged Firestore, Firebase Auth, import-row, audit, and Storage
residue after cleanup. Required cases are manual store/item publication,
merchant draft approval, rejection, cross-store denial, active-parent public
reads, Google staging, CSV selected-row commit, import replay, invalid media,
retirement, and suspended/archived denial. Never accept a run that skips
cleanup verification.

If the first callable returns HTTP 401, recheck the exact per-service Cloud Run
invoker policies in section 8. Do not weaken Firestore/Storage Rules or remove
Function authentication to work around a transport IAM failure.

## 10. Start and test the three web apps

Use a separate terminal for each server.

Run Admin Web from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm --filter @spaceman/admin-web dev -- --host 127.0.0.1 --port 5173
```

Run Merchant Web from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm --filter @spaceman/merchant-web dev -- --host 127.0.0.1 --port 5174
```

Run Customer Web from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm --filter @spaceman/customer-web dev -- --host 127.0.0.1 --port 5175
```

Complete this Phase 2 regression and Phase 3 marketplace matrix:

1. At `http://127.0.0.1:5175`, confirm a guest can browse only active/approved
   stores and active items. Draft, rejected, suspended, archived, and
   inactive-parent records must remain absent.
2. Sign in at `http://127.0.0.1:5173` as the retained development super-admin.
   Manually create a store and item, upload card/hero/item images, preview the
   result, and publish it. Confirm audit feedback and no direct client write.
3. Stage a Google Places store, review and edit the normalized fields, then
   publish. Confirm no fee, route, distance, or ETA is fabricated.
4. Invite or use a controlled Merchant account. Submit a draft store, reject it
   once, correct/resubmit, then approve it. Confirm the Merchant cannot
   self-approve or assign scope.
5. At `http://127.0.0.1:5174`, confirm the Merchant sees only assigned stores.
   Update store presentation/hours/open state and item presentation, price,
   availability, category, sort, and media. Attempt another store ID and
   confirm denial.
6. From Admin Web, preview CSV items, select only some rows, commit them, and
   rerun the same CSV. Confirm unchecked rows stay absent and replay creates no
   duplicates. Confirm no API catalog import control is present.
7. Return to Customer Web as guest and authenticated customer. Confirm the same
   active catalog, thumbnails, unavailable-item state, pagination, stale/error
   messaging, and no checkout/serviceability claim.
8. Hide and retire an item and suspend a parent store. Confirm customer reads
   update consistently while Merchant/Admin history and audit evidence remain.
9. Recheck wrong-role, suspended-user, session restoration, sign-out, and
   sign-in behavior from Phase 2.

Do not use the browser console or Firestore Console to modify protected role,
status, or scope fields.

## 11. Build and test the two self-contained preview APKs

First verify both native dependency sets. Run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm --filter @spaceman/customer-app exec expo install --check
corepack pnpm --filter @spaceman/driver-app exec expo install --check
```

Build the Customer App internal-distribution APK from
`/home/mmekwa/Desktop/projects/spacemansystems/apps/customer-app`:

```sh
source /home/mmekwa/.nvm/nvm.sh
env -u DEBUG corepack pnpm dlx eas-cli build --profile preview --platform android --wait
```

Build the Driver App internal-distribution APK from
`/home/mmekwa/Desktop/projects/spacemansystems/apps/driver-app`:

```sh
source /home/mmekwa/.nvm/nvm.sh
env -u DEBUG corepack pnpm dlx eas-cli build --profile preview --platform android --wait
```

Download both completed APKs, connect the physical Android device by USB, and
install them. Run from `/home/mmekwa/Desktop/projects/spacemansystems`,
replacing each absolute path with the downloaded file:

```sh
adb devices
adb install -r /absolute/path/to/customer-preview.apk
adb install -r /absolute/path/to/driver-preview.apk
adb shell pm path com.customer.app
adb shell pm path com.driver.app
```

Stop every Metro server before acceptance. Each app must launch from its normal
Android launcher icon and reach the configured development Firebase project
without Expo Go, a development-client launcher, or a workstation connection.
An OTA update cannot substitute for rebuilding after a native dependency,
plugin, Android configuration, icon, splash, or Firebase-file change.

In Customer App, verify both guest and retained active-customer journeys:

1. The same active stores, menus, item details, categories, thumbnails,
   unavailable states, pagination, and stale/offline indication appear as on
   Customer Web.
2. Draft, rejected, suspended, archived, retired, and inactive-parent records
   remain hidden.
3. Closing and reopening the installed app restores the expected cached state
   and authenticated session; sign-out returns to the guest boundary.
4. The app makes no route, serviceability, delivery-fee, ETA, payment, or order
   claim during Phase 3.

In Driver App, sign in with the retained active Driver account and verify:

1. Phase 3 added no marketplace or catalog control.
2. **Delivery operations**, assigned delivery-zone scope, session restoration,
   sign-out, and inactive-user denial remain unchanged.
3. Closing and reopening the installed app does not bypass canonical
   role/status/scope checks.

Reactivate any retained account intentionally changed during this regression.
Do not accept the native gate until both APKs pass on the physical device.

## 12. Record evidence and review the dirty worktree

Record the date, client, account role, expected result, actual result, and a
redacted screenshot or terminal excerpt under `docs/live-test-data-docs/`.
Never record email addresses, UIDs, tokens, API keys, or passwords.

Store Phase 3 terminal evidence at
`docs/live-test-data-docs/terminal-data/terminal-data-phase-3` and redacted
screenshots under `docs/live-test-data-docs/images/phase3-images/`. Record the
exact live `testRunId` and cleanup result without recording account IDs or
provider/config values.

Stop Vite servers with `Ctrl+C`. Then run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
git status --short --branch
git diff --check
git diff --stat
git diff
git diff --cached --check
git diff --cached --stat
git diff --cached
```

Confirm that `.env.local`, `google-services.json`, secrets, `node_modules`,
build output, Expo caches, and Playwright reports are absent from the staged
diff.

## 13. Commit a reviewed implementation checkpoint

After the source, Playwright, and live Firebase gates pass and the exact diff is
reviewed, an implementation checkpoint may be committed while owner-operated
manual acceptance remains pending. That commit does not change Phase 3 accepted
progress. Stage tracked modifications interactively from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
git add -p
git diff --cached --check
git diff --cached --stat
git diff --cached
```

Add any reviewed new source/evidence file by its exact path. Never use a broad
stage command while ignored credentials or generated outputs are present.

Commit the reviewed checkpoint from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
git commit -m "record reviewed Phase 3 marketplace checkpoint"
```

After sections 10 through 12 pass, commit the redacted acceptance evidence
separately and check every remaining Phase 3 exit item. The project owner
performs any push manually. Production deployment remains blocked until Phase
7 reaches 100% and its acceptance matrix is explicitly approved.

## Doctor check on APK's

```sh
cd /home/mmekwa/Desktop/projects/spacemansystems/apps/customer-app
env -u DEBUG corepack pnpm dlx expo-doctor

cd ../driver-app
env -u DEBUG corepack pnpm dlx expo-doctor
```

## Evidence already recorded

- 2026-07-21: owner-provided Phase 2 screenshots record customer and staff
  identity journeys, role/inactive boundaries, and both current Expo Go apps.
  The matching terminal record is
  `docs/live-test-data-docs/terminal-data/terminal-data-phase-2`.
- 2026-07-21: shared/package/Functions checks, all web builds, both native
  Jest/type-check/export gates, and three-client Playwright passed.
- 2026-07-21: exact live run
  `phase2_identity_1784610317153_749c82ef` passed the real-Firebase identity and
  denial matrix and verified zero Firestore/Auth residue.
- 2026-07-21: four Phase 3 Playwright Chromium scenarios passed and produced
  visually inspected Admin, Merchant, Customer desktop, and Customer mobile
  screenshots under ignored `test-results/`.
- 2026-07-22: exact live run
  `phase3_marketplace_1784749355621_646a3a94` passed all 12 marketplace,
  query, provider, import, scope, media, retirement, and inactive-user cases;
  exact cleanup verified zero Auth, Firestore, import-row, audit, and Storage
  residue. This is historical pre-removal evidence; its API-import case is no
  longer part of the approved product or current matrix.
- 2026-07-23: documentation, type-check, lint, unit/contract tests, all builds,
  Expo's online compatibility check, both Android exports, and four Playwright
  Chromium scenarios passed after removing the native UI automation harness.
- 2026-07-23: external JSON/HTTPS catalog API import was removed from source
  and the development backend. `stageApiCatalogImport`, its backing Cloud Run
  service, and `CATALOG_IMPORT_ALLOWED_HOSTS` are absent. The 13 retained
  callables were redeployed from the narrowed bundle. Authoritative post-deploy
  run `phase3_marketplace_1784796233777_d40dfad0` passed all 11 current cases
  and verified zero Auth, Firestore, import-row, audit, and Storage residue.
  Documentation, type-check, lint, all tests/builds, four Playwright scenarios,
  both Expo compatibility checks, and fresh Customer/Driver Android exports
  also passed.
- 2026-07-25: a Galaxy Note9 rerun proved that both self-contained preview APKs
  now launch after the explicit Expo public-environment inlining fix. Customer
  rendered the live catalog and a store menu; Driver rendered retained
  delivery-zone scope and returned to sign-in after sign-out. The raw captures
  expose test-account emails and remain local-only. Offline,
  session-restoration, inactive-user, complete guest/authenticated, corrected
  Playwright, and final redacted evidence gates remain.
- Remaining Phase 3 action: the project owner must complete sections 10 through
  12, including the missing preview-APK paths and corrected Playwright rerun,
  and record redacted five-app/manual evidence before changing Phase 3 from 0%
  accepted.

## Official references

- [Firebase CLI](https://firebase.google.com/docs/cli)
- [Firebase callable Functions](https://firebase.google.com/docs/functions/callable)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [Expo environment setup](https://docs.expo.dev/get-started/set-up-your-environment/)
- [Playwright test runner](https://playwright.dev/docs/test-cli)
