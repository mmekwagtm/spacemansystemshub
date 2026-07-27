# Manual five-app live-test runbook

This runbook applies to the canonical checkout at
`/home/mmekwa/Desktop/projects/spacemansystems` and the real
`spacemansystemsbackend` **development** Firebase project. Do not use emulators
or production. Every command below states its working directory.

Never print or commit `.env.local`, `google-services.json`, provider secrets,
service accounts, access tokens, Firebase config contents, or generated test
accounts. Testing, review, commits, and pushes are manual.

Phases 2 and 3 are complete. Phase 3 source, deployment, Playwright,
self-cleaning development-live work, owner-operated five-app/manual matrix,
physical-device checks, and redacted evidence passed. The external JSON/HTTPS
catalog API workflow was removed; CSV selected-row commit and Google Places
store staging remain. Keep this runbook for regression after future
marketplace changes; do not infer a future pass from the 2026-07-26 evidence.

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

## 11. Run the two native regressions through Expo Go

First verify both native dependency sets. Run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm --filter @spaceman/customer-app exec expo install --check
corepack pnpm --filter @spaceman/driver-app exec expo install --check
```

Start Customer App in Expo Go from
`/home/mmekwa/Desktop/projects/spacemansystems/apps/customer-app`:

```sh
source /home/mmekwa/.nvm/nvm.sh
corepack pnpm exec expo start --go --lan
```

Complete the Customer checks below, stop Metro with `Ctrl+C`, then start Driver
App in Expo Go from
`/home/mmekwa/Desktop/projects/spacemansystems/apps/driver-app`:

```sh
source /home/mmekwa/.nvm/nvm.sh
corepack pnpm exec expo start --go --lan
```

Connect the physical Android device by USB and confirm it is visible. Run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
adb devices
```

Each app must load the current local bundle in Expo Go and reach the configured
development Firebase project. Self-contained EAS preview-APK testing is not a
development regression requirement and is deferred to the final Phase 7 gate.

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

After the source, Playwright, live Firebase, and owner-operated gates pass and
the exact diff is reviewed, the bounded source and redacted evidence may be
committed. Stage tracked modifications interactively from
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

After sections 10 through 12 pass, check every Phase 3 exit item. The project
owner performs any push manually. Production deployment remains blocked until
Phase 7 reaches 100% and its acceptance matrix is explicitly approved.

## 14. Review Phase 4 source and provider prerequisites

Do not infer deployment from local source. Run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
git diff --check
corepack pnpm docs:check
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm --filter @spaceman/customer-app exec expo install --check
corepack pnpm --filter @spaceman/driver-app exec expo install --check
env -u DEBUG corepack pnpm dlx expo-doctor apps/customer-app
env -u DEBUG corepack pnpm dlx expo-doctor apps/driver-app
```

In Google Cloud Console, edit the existing server key used by
`GOOGLE_MAPS_SERVER_API_KEY`. Keep it server-only and allow exactly the Places
backend service (`places-backend.googleapis.com`), Places API (New)
(`places.googleapis.com`), and Routes API (`routes.googleapis.com`). Do not
create or expose a browser/native Maps key.

Confirm the required APIs without reading the key. Run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
gcloud services list --enabled --project=spacemansystemsbackend --filter='config.name:(places-backend.googleapis.com OR places.googleapis.com OR routes.googleapis.com)' --format='value(config.name)'
```

All three service names must be returned.

Confirm secret versions without printing their values. Run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
gcloud secrets versions list PAYSTACK_SECRET_KEY --project=spacemansystemsbackend --format='table(name,state,createTime)'
gcloud secrets versions list GOOGLE_MAPS_SERVER_API_KEY --project=spacemansystemsbackend --format='table(name,state,createTime)'
```

Confirm that Paystack version `3` is a rotated test key while emitting only a
verdict. Run from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
phase4_paystack_candidate="$(gcloud secrets versions access 3 --secret=PAYSTACK_SECRET_KEY --project=spacemansystemsbackend)"
case "$phase4_paystack_candidate" in
  sk_test_*) echo "Paystack version 3 is test mode." ;;
  *) echo "ERROR: Paystack version 3 is not a test key."; unset phase4_paystack_candidate; exit 1 ;;
esac
unset phase4_paystack_candidate
```

Never enable checkout with an `sk_live_` credential in development.

## 15. Deploy exact Phase 4 development infrastructure

Confirm the new exports and build the deployable bundle. Run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
rg -n 'export const (searchDeliveryAddresses|createCheckoutSession|upsertDeliveryZone|publishDeliveryFeeRule|updateCheckoutSettings|initializePaystackPayment|verifyPaystackPayment|handlePaystackWebhook|paystackPaymentReturn)' firebase/functions/src/phase4.ts
corepack pnpm --dir firebase/functions run build
```

Review the diff, then deploy only the shared development Rules/indexes and the
exact Phase 4 Functions. Run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
env -u DEBUG corepack pnpm exec firebase deploy --only firestore:rules,firestore:indexes --project spacemansystemsbackend
env -u DEBUG FUNCTIONS_DISCOVERY_TIMEOUT=60000 corepack pnpm exec firebase deploy --only functions:searchDeliveryAddresses,functions:createCheckoutSession,functions:upsertDeliveryZone,functions:publishDeliveryFeeRule,functions:updateCheckoutSettings,functions:initializePaystackPayment,functions:verifyPaystackPayment,functions:handlePaystackWebhook,functions:paystackPaymentReturn --project spacemansystemsbackend
```

Do not deploy Hosting, production, or unrelated Functions.

Every callable/HTTP service needs public transport invocation while its handler
continues to enforce Firebase Auth, role/status, signature, and ownership.
Inspect the exact policies first. Run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
for phase4_service in searchdeliveryaddresses createcheckoutsession upsertdeliveryzone publishdeliveryfeerule updatecheckoutsettings initializepaystackpayment verifypaystackpayment handlepaystackwebhook paystackpaymentreturn
do
  gcloud run services get-iam-policy "$phase4_service" --project=spacemansystemsbackend --region=africa-south1 --flatten='bindings[].members' --filter='bindings.role:roles/run.invoker AND bindings.members:allUsers' --format='table(bindings.role,bindings.members)'
done
```

Only after reviewing the empty/missing bindings, apply transport access to
exactly those nine services. Run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
for phase4_service in searchdeliveryaddresses createcheckoutsession upsertdeliveryzone publishdeliveryfeerule updatecheckoutsettings initializepaystackpayment verifypaystackpayment handlepaystackwebhook paystackpaymentreturn
do
  gcloud run services add-iam-policy-binding "$phase4_service" --project=spacemansystemsbackend --region=africa-south1 --member=allUsers --role=roles/run.invoker --quiet
done
```

Rerun the read-only loop and require one binding per service.

## 16. Configure Paystack test webhook and Admin checkout settings

In the Paystack test dashboard, set the webhook URL to:

```text
https://africa-south1-spacemansystemsbackend.cloudfunctions.net/handlePaystackWebhook
```

The fixed informational return endpoint is:

```text
https://africa-south1-spacemansystemsbackend.cloudfunctions.net/paystackPaymentReturn
```

Start Admin Web from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm --filter @spaceman/admin-web dev --host 127.0.0.1
```

Sign in as the retained super administrator. Under **Maps, checkout, and
payment controls**:

1. Create or update the active ZA delivery zone with the reviewed exact
   Mabopane locality list.
2. Publish fee-rule version 1 with R20 base, 3,000 included metres, R4/km,
   R100 threshold, R10 surcharge, R20 minimum, and R80 maximum.
3. Confirm the new immutable version is active.
4. Enable customer ordering, Maps quotes, and new Paystack payments only after
   configuration is complete.

Stop the server with `Ctrl+C`.

## 17. Run the self-cleaning Phase 4 backend matrix

Application Default Credentials must be authorized for development. Run the
unpaid/abandoned path from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
(
  set -a
  source apps/customer-web/.env.local
  set +a
  env -u DEBUG GOOGLE_CLOUD_PROJECT=spacemansystemsbackend SPACEMAN_ENVIRONMENT=development SPACEMAN_FUNCTIONS_REGION="${VITE_FUNCTIONS_REGION:-africa-south1}" SPACEMAN_FIREBASE_WEB_API_KEY="$VITE_FIREBASE_API_KEY" corepack pnpm --dir firebase/functions run test:checkout:live
)
```

The matrix checks address minimum/debounce contract, Maps success and provider
failure, out-of-zone denial, catalog change, idempotency conflict/replay,
direct-write denial, cross-customer denial, hosted Paystack initialization,
no unpaid order, prior-setting restoration, and exact zero-residue cleanup.

Run the successful-payment variant from the same directory:

```sh
(
  set -a
  source apps/customer-web/.env.local
  set +a
  env -u DEBUG GOOGLE_CLOUD_PROJECT=spacemansystemsbackend SPACEMAN_ENVIRONMENT=development SPACEMAN_FUNCTIONS_REGION="${VITE_FUNCTIONS_REGION:-africa-south1}" SPACEMAN_FIREBASE_WEB_API_KEY="$VITE_FIREBASE_API_KEY" corepack pnpm --dir firebase/functions run test:checkout:live -- --complete-payment
)
```

The script prints one temporary Paystack hosted URL and pauses. Complete a test
payment using Paystack's current documented test data, then press Enter. It
must verify the same order twice and finish with exact Auth/Firestore cleanup.
Do not paste provider card data, account credentials, or the hosted URL into
tracked evidence.

Use Paystack test mode to perform one declined or explicitly abandoned hosted
checkout as a separate owner check. **Check payment** must report failure or
abandonment and Firestore must contain no corresponding order.

## 18. Run Phase 3 regression and isolated Phase 4 Playwright

Run the accepted Phase 3 browser regression with the existing ignored owner
environment from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
(
  set -a
  source .phase3-owner.env.local
  set +a
  corepack pnpm test:web:e2e
)
```

Create an ignored `.phase4-owner.env.local` in the repository root containing
only retained development test-account/store identifiers:

```sh
PHASE4_ADMIN_EMAIL=
PHASE4_ADMIN_PASSWORD=
PHASE4_CUSTOMER_EMAIL=
PHASE4_CUSTOMER_PASSWORD=
PHASE4_STORE_NAME=
PHASE4_ITEM_NAME=
PHASE4_ADDRESS_QUERY=Mabopane Central City
```

The named store/item must already be active, approved, open, available, above
minimum order, and linked to the configured zone. Run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
(
  set -a
  source .phase4-owner.env.local
  set +a
  corepack pnpm test:web:e2e:phase4
)
```

The runner creates a unique browser `testRunId`, injects it only into the test
build, validates guest-cart preservation, sign-in, offline blocking, address
selection, quote display, and the approved `checkout.paystack.com` popup, then
calls exact cleanup and verifies zero tagged records.

## 19. Accept Customer App through Expo Go on the Galaxy Note9

Run compatibility/export checks from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm --filter @spaceman/customer-app exec expo install --check
env -u DEBUG corepack pnpm dlx expo-doctor apps/customer-app
corepack pnpm --filter @spaceman/customer-app exec expo export --platform android --output-dir .local-evidence/phase4-customer-export
```

Start the current Customer App bundle in Expo Go from
`/home/mmekwa/Desktop/projects/spacemansystems/apps/customer-app`:

```sh
source /home/mmekwa/.nvm/nvm.sh
corepack pnpm exec expo start --go --lan
```

Open the displayed project in Expo Go on the Note9. Before exercising the
workflow, clear old device logs from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
adb logcat -c
```

On the Note9, verify persisted one-store replacement, guest intent, unavailable
items, Mabopane address search/attribution, quote details, expiry, offline
blocking, hosted browser launch, app-resume reconciliation, manual payment
check, and exactly one visible paid order. Then inspect only crash/error
markers from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
adb logcat -d -b main -b crash | rg 'FATAL EXCEPTION|AppError|Required public Firebase|PAYSTACK|GOOGLE_MAPS'
```

Do not capture credentials, full addresses, provider tokens, or payment data.
Stop Metro with `Ctrl+C` after the check. Self-contained EAS preview-APK
acceptance is deferred to the end of Phase 7 and is not part of Phase 4.

## 20. Rollback and secret retirement

If a Phase 4 problem appears, use Admin Web to disable **new** customer
ordering/Maps quote/payment initialization. Do not undeploy or block
`handlePaystackWebhook`; already-initialized payments must still reconcile.

Only after version `3` completes a successful payment, repeat verification, and
webhook replay without duplication, disable version `2`. Run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
gcloud secrets versions disable 2 --secret=PAYSTACK_SECRET_KEY --project=spacemansystemsbackend
gcloud secrets versions list PAYSTACK_SECRET_KEY --project=spacemansystemsbackend --format='table(name,state,createTime)'
```

## 21. Record and accept Phase 4 evidence

Store redacted terminal evidence under
`docs/live-test-data-docs/terminal-data/terminal-data-phase-4` and only the
necessary screenshots under
`docs/live-test-data-docs/images/phase4-images/`. Record each exact
`testRunId`, payment outcome, replay result, cleanup verdict, browser/device
gate, and reviewed source revision without recording secrets or account
identifiers.

Phase 4 reaches **100%** and overall accepted progress reaches **62.5%** only
after every checklist item in `docs/plans-docs/PLAN-phase-4.md` passes and the
owner explicitly approves the redacted evidence.

## Native Expo Doctor checks

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
  expose test-account emails and remain local-only. At that checkpoint,
  offline,
  session-restoration, inactive-user, complete guest/authenticated, corrected
  Playwright, and final redacted evidence gates remained.
- 2026-07-26: run `phase3_accept_20260726_1450` passed the corrected core
  matrix `2/2`, persisted-state continuation `2/2`, and web foundations `4/4`.
  Redacted Galaxy Note9 evidence passed Customer guest/authenticated parity,
  pagination, session/sign-out, explicit cached-offline fallback, and clean
  standalone launch, plus Driver guest/active/suspended/session boundaries and
  absence of marketplace controls. Customer preview build
  `6e06e1a9-985b-439f-abeb-d2489c0ac25e` contains the SDK-compatible
  `expo-network` correction. Wi-Fi was restored, the crash buffer was empty,
  and the exact temporary Driver denial fixture left zero residue.
- Phase 3 is 100% accepted. No Phase 2 or Phase 3 acceptance action remains;
  rerun the relevant sections only after a behavior or backend change.

## Official references

- [Firebase CLI](https://firebase.google.com/docs/cli)
- [Firebase callable Functions](https://firebase.google.com/docs/functions/callable)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [Expo environment setup](https://docs.expo.dev/get-started/set-up-your-environment/)
- [Playwright test runner](https://playwright.dev/docs/test-cli)
- [Google Address Validation coverage](https://developers.google.com/maps/documentation/address-validation/coverage)
- [Google Place Details](https://developers.google.com/maps/documentation/places/web-service/place-details)
- [Google Routes computeRoutes](https://developers.google.com/maps/documentation/routes/compute_route_directions)
- [Paystack hosted payments](https://paystack.com/docs/payments/accept-payments/)
- [Paystack transaction verification](https://paystack.com/docs/payments/verify-payments/)
- [Paystack webhooks](https://paystack.com/docs/payments/webhooks/)
