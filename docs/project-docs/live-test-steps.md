# Manual five-app live-test runbook

This runbook applies to the canonical checkout at
`/home/mmekwa/Desktop/projects/spacemansystems` and the real
`spacemansystemsbackend` **development** Firebase project. Do not use emulators
or production. Every command below states its working directory.

Never print or commit `.env.local`, `google-services.json`, provider secrets,
service accounts, access tokens, Firebase config contents, or generated test
accounts. Testing, review, commits, and pushes are manual.

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

No Paystack payment Function is part of Phase 2, so do not deploy payment code
after this rotation.

## 1. Inspect the checkout

Run from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
pwd
git status --short --branch
git branch --show-current
git diff --check
```

The Phase 2 checkout intentionally contains source/docs/package changes plus
staged deletions for the two formerly tracked native Firebase config files.
The ignored files themselves must remain on disk. Preserve any unrelated
modification; do not use reset, checkout, clean, or force-push as a shortcut.

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

Stop if any command selects production or an unexpected project. The six Phase
2 Functions must be listed in `africa-south1`.

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

Every command must pass before a manual commit. The web builds currently report
large Firebase entry chunks; record the warning for Phase 3 performance work,
but do not treat it as an identity failure.

## 5. Run Playwright manually

Install the checked-in Chromium browser once. Run from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm exec playwright install chromium
```

Run the three web identity-boundary tests from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm test:web:e2e
```

The harness builds and previews Admin Web on `127.0.0.1:4173`, Merchant Web on
`127.0.0.1:4174`, and Customer Web on `127.0.0.1:4175`. A cold browser launch
can take several minutes on this two-core workstation. Failure traces under
ignored `test-results/` must be inspected before removal.

## 6. Re-run the self-cleaning live security matrix

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

## 8. Start and test the three web apps

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

Complete this manual matrix:

1. At `http://127.0.0.1:5175`, confirm guest marketplace content is visible and
   **Continue to checkout** opens sign-in/registration.
2. Register a controlled customer email, observe **Verify your email**, open
   the real verification email, and select **I verified — refresh**. Confirm
   **Customer account ready**, sign out, sign in, then reload the page and
   confirm the session restores.
3. At `http://127.0.0.1:5173`, enter the bootstrapped super-admin email under
   **Accept invitation or reset password**, send the setup link, set a password,
   and sign in. Confirm **Operations foundation** and **Staff identity
   lifecycle**.
4. Invite retained development Merchant and Driver emails that you control.
   Give the Merchant at least one test store scope and the Driver at least one
   delivery-zone scope; activate both accounts. Use their setup emails to set
   passwords.
5. At `http://127.0.0.1:5174`, sign in as the Merchant. Confirm **Merchant
   operations foundation**, the assigned scope, reload/session restoration,
   sign-out, and sign-in.
6. Sign the Merchant into Admin Web and confirm **Admin access unavailable**.
   Sign the super-admin back in, suspend the Merchant, and confirm the Merchant
   loses access after refresh. Reactivate the retained account when finished.

Do not use the browser console or Firestore Console to modify protected role,
status, or scope fields.

## 9. Test the two Expo Go apps

Connect the Android device and workstation to the same LAN. Stop any other
Metro server first and test one app at a time.

Run Customer App from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm --filter @spaceman/customer-app exec expo start --clear --lan
```

Scan the QR code in Expo Go. Repeat the customer registration/verification or
sign in with the verified development customer. Confirm **Customer account
ready**, terminate/reopen Expo Go to verify persistence, then sign out.

Run Driver App from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm --filter @spaceman/driver-app exec expo start --clear --lan
```

Sign in with the activated retained Driver account. Confirm **Delivery
operations**, the assigned delivery-zone scope, terminate/reopen Expo Go to
verify persistence, then sign out. Suspend the Driver from Admin Web and verify
**Driver access unavailable** after refresh; reactivate the retained account
when finished.

If LAN discovery fails, stop Metro and run Customer App from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm --filter @spaceman/customer-app exec expo start --clear --tunnel
```

Or run Driver App from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
corepack pnpm --filter @spaceman/driver-app exec expo start --clear --tunnel
```

## 10. Record evidence and review the dirty worktree

Record the date, client, account role, expected result, actual result, and a
redacted screenshot or terminal excerpt under `docs/live-test-data-docs/`.
Never record email addresses, UIDs, tokens, API keys, or passwords.

Stop Vite/Expo servers with `Ctrl+C`. Then run from
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

## 11. Commit manually after Phase 2 acceptance

Only after all preceding checks pass, stage reviewed files from
`/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
git add -A
git diff --cached --check
git diff --cached --stat
git diff --cached
```

Commit from `/home/mmekwa/Desktop/projects/spacemansystems`:

```sh
git commit -m "implement phase 2 identity and security"
```

The project owner performs any push manually. Production deployment remains
blocked until Phase 7 reaches 100% and its acceptance matrix is explicitly
approved.

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

## Official references

- [Firebase CLI](https://firebase.google.com/docs/cli)
- [Firebase callable Functions](https://firebase.google.com/docs/functions/callable)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [Expo environment setup](https://docs.expo.dev/get-started/set-up-your-environment/)
- [Playwright test runner](https://playwright.dev/docs/test-cli)
