# Local setup and five-app live-test runbook

This runbook is for the Linux checkout at
/home/mmekwa/Desktop/projects/spacemansystems.

The repository is a pnpm-only monorepo. It requires Node.js >=22.13.0 and
pnpm >=10; the checked-in package manager is pnpm 10.13.1. It contains
three Vite web shells, two Expo Router native shells, shared packages, Firebase
Rules/Functions source, and GitHub Actions templates.

The project ID requested in this runbook is spacemansystemsbackend. Treat it as
the development project only after the verification commands below confirm
that exact ID. Never run these steps against production.

The current source is not yet a complete live marketplace. Firebase project
configuration, app environment files, Maps, Paystack, FCM, EAS identifiers,
live collections, and CI secrets are not configured in this checkout. The
current five-app test proves the source shells render and the local checks
pass. It must not be reported as a completed authentication, payment, order,
dispatch, notification, or production acceptance test until those integrations
are wired and verified.

This project uses the shared real development Firebase project for integration
testing. Do not start Firebase emulators or point any test at production.

All commands below include the directory where they must be run. Use a
separate terminal for each long-running development server.

## 1. Inspect the checkout before changing it

Run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
pwd
git status --short --branch
git branch --show-current
~~~

Do not discard files shown by Git. This checkout currently has no commit yet,
so review the complete source tree before the first commit.

## 2. Install Linux prerequisites

Run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
sudo apt-get update
sudo apt-get install -y build-essential ca-certificates curl git jq openssh-client unzip zip
~~~

The command above installs local build utilities and Git transport support. It
does not install Node.js, pnpm, Firebase CLI, Google Cloud CLI, or GitHub CLI.

Maestro requires Java 17 or newer. Install it now if you intend to run the
checked-in native UI flows.

Run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
sudo apt-get install -y openjdk-17-jdk
java -version
curl -fsSL https://get.maestro.mobile.dev | bash
maestro --version
~~~

For an Android emulator, a USB-connected Android device, or Maestro, install
the Android platform tools. Expo Go over a QR code does not require this step.

Run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
sudo apt-get install -y adb
adb version
adb devices
~~~

## 3. Install Node.js 22

First check the existing Node.js version.

Run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
node --version
~~~

If it prints v22.13.0 or newer within the Node 22 line, keep it and continue.
If Node is missing or older, install a user-scoped Node 22 with nvm.

Run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
~~~

Close and reopen the terminal, then run from
/home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
nvm install 22
nvm alias default 22
nvm use 22
node --version
~~~

The final version must satisfy the root package.json engine requirement.

## 4. Install the repository's pnpm version

Use the pnpm standalone installer. This avoids installing the project with
npm, yarn, bun, or another lockfile-producing package manager.

Run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION=10.13.1 sh -
~~~

Open a new terminal so the installer-added PNPM_HOME path is loaded. Then
run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
pnpm --version
~~~

The output must be 10.13.1 or another pnpm 10 version accepted by the
repository. If pnpm is available but a later global package operation reports
that the pnpm home/bin path is not configured, run the following from
/home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
pnpm setup
~~~

Open a new terminal again and repeat the pnpm --version check from
/home/mmekwa/Desktop/projects/spacemansystems.

Do not create package-lock.json, yarn.lock, or bun.lockb.

## 5. Install Firebase CLI and verify Firebase access

The Firebase JavaScript SDK is already declared by
packages/app-firebase/package.json. Do not add a second Firebase SDK
dependency. Install the command-line tool globally through pnpm.

Run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
pnpm add --global firebase-tools
firebase --version
~~~

Authenticate once with the Google account that has access to the development
Firebase project.

Run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
firebase login
firebase login:list
firebase projects:list
~~~

The project list must contain spacemansystemsbackend. If it does not, stop
and obtain the correct Google/Firebase account or the actual project ID before
continuing.

## 6. Install and initialize Google Cloud CLI (gcloud)

“Google Cloud CLI / gd” means the gcloud command. Install the Debian/Ubuntu
package from Google's signed package repository.

Run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
sudo apt-get update
sudo apt-get install -y ca-certificates gnupg curl
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee /etc/apt/sources.list.d/google-cloud-sdk.list
sudo apt-get update
sudo apt-get install -y google-cloud-cli
gcloud --version
~~~

Initialize the CLI and authenticate the same Google account used for Firebase.

Run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
gcloud init
gcloud auth list
gcloud config set project spacemansystemsbackend
gcloud config get-value project
gcloud projects describe spacemansystemsbackend --format='value(projectId)'
~~~

The final three commands must identify spacemansystemsbackend. gcloud config
set project changes the local gcloud default only; it does not deploy anything.

If a local Google API client specifically needs Application Default
Credentials, authenticate them separately. Do not put the generated
credentials in this repository.

Run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
gcloud auth application-default login
gcloud auth application-default set-quota-project spacemansystemsbackend
~~~

Only enable APIs if the preceding project check confirmed the development
project and the project owner has approved any billing or quota impact.

Run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
gcloud services list --enabled --project=spacemansystemsbackend
gcloud services enable firebase.googleapis.com firestore.googleapis.com firebasestorage.googleapis.com cloudfunctions.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com run.googleapis.com identitytoolkit.googleapis.com --project=spacemansystemsbackend
~~~

## 7. Permanently associate Firebase with this checkout

The existing firebase.json already defines Firestore, Storage, Functions, and
three Hosting targets. It does not yet have a .firebaserc alias file. Create
the persistent development alias interactively so the exact project is
selected rather than guessed.

Run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
firebase use --add
~~~

When prompted:

1. Select spacemansystemsbackend.
2. Enter the alias development.

Then verify the saved association from
/home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
firebase use
firebase use development
firebase projects:list
git status --short -- .firebaserc
~~~

.firebaserc contains a project alias, not a secret. Review it and commit it
with the repository if this is the private development checkout. Do not place
API secrets, service-account JSON, Paystack secrets, or access tokens in it.

List registered Firebase apps and obtain the client configuration for the
registered Web app.

Run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
firebase apps:list --project spacemansystemsbackend
firebase apps:sdkconfig WEB <WEB_FIREBASE_APP_ID> --project spacemansystemsbackend
~~~

Replace <WEB_FIREBASE_APP_ID> with the Web app ID printed by
firebase apps:list. If no Web app exists, register one in Firebase Console >
Project settings > Your apps before running apps:sdkconfig. Register
Android/iOS apps only when their package/bundle identifiers and native
configuration are ready; the current Expo manifests do not contain those
identifiers.

## 8. Create local app configuration without committing secrets

Copy each tracked example to an ignored local file.

Run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
cp apps/admin-web/.env.example apps/admin-web/.env.local
cp apps/merchant-web/.env.example apps/merchant-web/.env.local
cp apps/customer-web/.env.example apps/customer-web/.env.local
cp apps/customer-app/.env.example apps/customer-app/.env.local
cp apps/driver-app/.env.example apps/driver-app/.env.local
~~~

Populate the three VITE_* files and two EXPO_PUBLIC_* files with the
client-safe values from the Firebase Web/Expo configuration. Set the same
development project ID in every file and set
VITE_FUNCTIONS_REGION and EXPO_PUBLIC_FUNCTIONS_REGION to the approved
Functions region.

Run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
git status --short --ignored -- apps/admin-web/.env.local apps/merchant-web/.env.local apps/customer-web/.env.local apps/customer-app/.env.local apps/driver-app/.env.local
~~~

The files must be ignored. Client Firebase identifiers are not substitutes for
Paystack secret keys, webhook secrets, service-account keys, or CI credentials.

## 9. Install and link GitHub CLI to spacemansystemshub

Install GitHub CLI from its signed Debian/Ubuntu package source.

Run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
sudo mkdir -p -m 755 /etc/apt/keyrings
sudo curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o /etc/apt/keyrings/githubcli-archive-keyring.gpg
sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list
sudo apt-get update
sudo apt-get install -y gh
gh --version
~~~

Authenticate once using SSH for Git operations. The GitHub CLI stores its
authentication in the local credential store when available, and the SSH
remote means normal git fetch, git pull, and git push do not ask for a
password on every command.

Run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
gh auth login --hostname github.com --git-protocol ssh --web
gh auth status
gh auth setup-git
ssh -T git@github.com
~~~

Do not use --insecure-storage and do not save a GitHub token in the repository
or in .git/config.

Find the full owner/name of the existing repository instead of assuming the
owner. Run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
gh repo list --limit 100 --json nameWithOwner --jq '.[] | select(.name == "spacemansystemshub") | .nameWithOwner'
~~~

Copy the returned value, for example OWNER/spacemansystemshub, and use it in
the next commands. Replace <OWNER> below with that returned owner.

If this checkout has no origin, run from
/home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
git remote add origin git@github.com:<OWNER>/spacemansystemshub.git
~~~

If an origin already exists, inspect it first. Run from
/home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
git remote -v
~~~

If the existing URL is wrong, replace it from
/home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
git remote set-url origin git@github.com:<OWNER>/spacemansystemshub.git
~~~

Verify repository access without changing the remote repository. Run from
/home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
git ls-remote origin
~~~

If SSH reports Permission denied, complete the GitHub CLI login and key
upload before continuing. Do not create a second repository or force-push over
an existing main branch.

## 10. Synchronize and validate the pnpm workspace

This is the first dependency installation for the SDK-57 manifests. It may
update pnpm-lock.yaml; review that change before committing it.

Run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
pnpm install
pnpm --filter @spaceman/customer-app exec expo install --fix --pnpm
pnpm --filter @spaceman/driver-app exec expo install --fix --pnpm
~~~

Run the repository checks from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
pnpm docs:check
pnpm typecheck
pnpm lint
pnpm test
pnpm build
~~~

Install the Chromium browser needed by the checked-in Playwright test. Run
from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
pnpm exec playwright install chromium
~~~

If Playwright reports missing system libraries and the machine owner approves
the package changes, run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
pnpm exec playwright install --with-deps chromium
~~~

For CI, always use the lockfile from
/home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
pnpm install --frozen-lockfile
~~~

## 11. Make the first Git commit and push it

Do not stage .env.local, tokens, service-account JSON, node_modules, build
output, or generated reports. Review the complete staged set before the
commit.

Run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
git status --short --branch
git add -A
git diff --cached --check
git diff --cached --stat
git status --short
~~~

If the staged list is correct, create the first commit from
/home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
git branch -M main
git commit -m "chore: establish spaceman systems monorepo"
git status --short --branch
~~~

Check whether the remote already has a branch before pushing. Run from
/home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
git ls-remote --heads origin
~~~

If the output is empty, push the first commit from
/home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
git push --set-upstream origin main
~~~

If origin/main already exists, do not force-push. Inspect and merge it only
after confirming that the remote history belongs to this project. Run from
/home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
git fetch origin
git log --oneline --decorate --all -n 20
git merge --allow-unrelated-histories origin/main
git push --set-upstream origin main
~~~

Resolve any merge conflict deliberately, then rerun the validation commands
before pushing. Never commit credentials just to make the first push pass.

## 12. Use the existing GitHub Actions workflows

The repository already contains:

- .github/workflows/ci.yml: runs documentation, typecheck, lint, test, and
  build on pushes and pull requests targeting main.
- .github/workflows/deploy-development.yml: manual development deployment
  for Rules, Storage, Functions, and the three Hosting targets.
- .github/workflows/deploy-production.yml: manual production deployment with
  an explicit confirmation string. Do not run it during development setup.

After the first push, inspect the CI run. Replace <OWNER> with the owner
found earlier. Run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
gh workflow list --repo <OWNER>/spacemansystemshub
gh run list --repo <OWNER>/spacemansystemshub --limit 5
~~~

To watch a specific run, replace <RUN_ID> with the run ID printed above. Run
from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
gh run watch <RUN_ID> --repo <OWNER>/spacemansystemshub
~~~

### Development deployment credentials

Before enabling the manual development workflow, create a GitHub development
environment and configure its protection/secrets in repository Settings. The
checked-in workflow currently expects these names:

- FIREBASE_PROJECT_ID: spacemansystemsbackend.
- FIREBASE_TOKEN: required by the current workflow for Firebase CLI
  deployment. Firebase documents this as a legacy authentication path; do not
  reuse it as a normal local credential. Prefer replacing the workflow with
  GitHub OIDC/Google Workload Identity Federation before production use.
- EXPO_TOKEN: required only when the workflow input
  deploy_mobile_builds is set to true.

Set the non-secret project value in the current workflow contract from
/home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
gh secret set FIREBASE_PROJECT_ID --repo <OWNER>/spacemansystemshub --env development --body "spacemansystemsbackend"
~~~

The existing workflow still requires the legacy Firebase token. If the
development deploy has been explicitly approved, generate it interactively
and submit it directly to GitHub's secret prompt; do not save it to a file.
Run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
firebase login:ci
gh secret set FIREBASE_TOKEN --repo <OWNER>/spacemansystemshub --env development
~~~

For mobile EAS builds, authenticate once from the relevant app directory and
store the resulting token in the development environment. Run from
/home/mmekwa/Desktop/projects/spacemansystems/apps/customer-app:

~~~sh
pnpm dlx eas-cli@16.0.0 login
pnpm dlx eas-cli@16.0.0 whoami
~~~

Run from /home/mmekwa/Desktop/projects/spacemansystems to add the token when
deploy_mobile_builds is intentionally enabled:

~~~sh
gh secret set EXPO_TOKEN --repo <OWNER>/spacemansystemshub --env development
~~~

Do not put FIREBASE_TOKEN, EXPO_TOKEN, Paystack secrets, Maps server keys, or
service-account JSON in source, .env.example, or commit history.

Only after the development project, Functions source, Hosting targets, Rules,
secrets, and approval gates are verified may the manual development workflow
be started. Run from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
gh workflow run deploy-development.yml --repo <OWNER>/spacemansystemshub -f deploy_mobile_builds=false
~~~

Do not run deploy-production.yml for this setup.

## 13. Five-app local smoke test

This is the runnable baseline test for the current source. It tests the three
web shells, the two Expo shells, and the checked-in automated tests. It does
not prove that Firebase calls work because the current app screens do not yet
consume the configured Firebase client.

### Web app 1: admin-web

Run from /home/mmekwa/Desktop/projects/spacemansystems/apps/admin-web:

~~~sh
pnpm dev -- --host 127.0.0.1 --port 5173
~~~

Open http://127.0.0.1:5173 and verify the heading Operations foundation.
Keep this terminal running.

### Web app 2: merchant-web

Run from /home/mmekwa/Desktop/projects/spacemansystems/apps/merchant-web:

~~~sh
pnpm dev -- --host 127.0.0.1 --port 5174
~~~

Open http://127.0.0.1:5174 and verify the heading Merchant operations
foundation. Keep this terminal running.

### Web app 3: customer-web

Run from /home/mmekwa/Desktop/projects/spacemansystems/apps/customer-web:

~~~sh
pnpm dev -- --host 127.0.0.1 --port 5175
~~~

Open http://127.0.0.1:5175 and verify the heading Marketplace foundation.
Keep this terminal running.

Run the checked-in customer web E2E test from
/home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
pnpm test:web:e2e
~~~

The Playwright configuration starts its own customer-web server on
http://127.0.0.1:4173; it is separate from the three manual Vite servers.

### Native app 1: customer-app

Install Expo Go on a compatible Android device, connect the device and laptop
to the same network, then run from
/home/mmekwa/Desktop/projects/spacemansystems/apps/customer-app:

~~~sh
pnpm exec expo start --clear --lan
~~~

Scan the QR code in Expo Go and verify Marketplace foundation. If LAN access
is blocked, stop that server and run from
/home/mmekwa/Desktop/projects/spacemansystems/apps/customer-app:

~~~sh
pnpm exec expo start --clear --tunnel
~~~

### Native app 2: driver-app

Run from /home/mmekwa/Desktop/projects/spacemansystems/apps/driver-app:

~~~sh
pnpm exec expo start --clear --lan
~~~

Scan the QR code in Expo Go and verify Delivery operations foundation. Use
the tunnel variant from the same directory only if LAN access is unavailable.

Run from /home/mmekwa/Desktop/projects/spacemansystems/apps/driver-app:

~~~sh
pnpm exec expo start --clear --tunnel
~~~

Run the native unit tests from each native app directory.

Run from /home/mmekwa/Desktop/projects/spacemansystems/apps/customer-app:

~~~sh
pnpm typecheck
pnpm lint
pnpm test
~~~

Run from /home/mmekwa/Desktop/projects/spacemansystems/apps/driver-app:

~~~sh
pnpm typecheck
pnpm lint
pnpm test
~~~

## 14. Native development builds and Maestro

Expo Go is sufficient for the current shell screens. A development build is
required once the apps use native modules that Expo Go does not include.
Before creating EAS builds, add the approved EAS project IDs to the native app
configuration; those IDs are intentionally absent from this baseline.

When EAS configuration has been approved, run from
/home/mmekwa/Desktop/projects/spacemansystems/apps/customer-app:

~~~sh
pnpm dlx eas-cli@16.0.0 build --platform android --profile development
~~~

Run from /home/mmekwa/Desktop/projects/spacemansystems/apps/driver-app:

~~~sh
pnpm dlx eas-cli@16.0.0 build --platform android --profile development
~~~

After installing the corresponding development builds, define the two Maestro
app IDs in the shell and run the checked-in smoke flows. Run from
/home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
export MAESTRO_CUSTOMER_APP_ID='<CUSTOMER_ANDROID_APPLICATION_ID>'
export MAESTRO_DRIVER_APP_ID='<DRIVER_ANDROID_APPLICATION_ID>'
maestro test .maestro/customer-foundation.yaml
maestro test .maestro/driver-foundation.yaml
~~~

The current app.json files do not define Android application IDs, so do not
claim Maestro has passed until those IDs and development builds exist.

## 15. Development Firebase live-test gate

Run this gate before any integration test from
/home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
firebase use
gcloud config get-value project
firebase projects:list
git status --short --branch
~~~

Every result must identify spacemansystemsbackend as the development target.
If any command identifies production or an unexpected project, stop.

Check what is actually deployed. Run from
/home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
firebase functions:list --project spacemansystemsbackend
firebase firestore:databases:list --project spacemansystemsbackend
firebase hosting:sites:list --project spacemansystemsbackend
~~~

Create a unique test run ID for any approved integration fixture. Run from
/home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
testRunId="$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short HEAD)"
testRunId="live-$testRunId"
printf '%s\n' "$testRunId"
~~~

Pass that exact ID through the trusted seedTestFixtures command when the
authenticated integration client exists. The matching trusted
cleanupTestFixtures command must be called with the same ID after the test.
Never delete an entire Firestore collection or use a broad cleanup command.

The current repository does not include a CLI client for these authenticated
callables, so do not invent a direct Firestore write or an unauthenticated
HTTP request. The current Functions source also deliberately keeps checkout
blocked until a verified Maps quote exists. Full live acceptance remains
blocked until the app entrypoints, auth accounts/claims, Maps, Paystack test
credentials, and fixture client are configured.

When that wiring is complete, the five-app live scenario is:

1. Customer web and customer app sign in or browse the same development
   catalog.
2. Customer submits a valid address and receives a server-verified quote and
   fee; an unserviceable or failed Maps response blocks payment.
3. Customer uses Paystack test mode; an order appears only after verified
   payment evidence.
4. Merchant web sees only its scoped store/order and advances fulfillment.
5. Admin web sees the permitted operational/audit projection and can use only
   trusted role/scope commands.
6. Driver app sees only its assignment, publishes foreground location only
   during active delivery, and stops publishing after completion.
7. Customer web/app sees the fulfillment projection update in real time.
8. The exact testRunId is cleaned through the privileged development cleanup
   command and the audit entry is checked.

Until these steps are implemented and observed against the development
project, the accepted result is “five source shells and automated checks pass,”
not “the five-app marketplace is live.”

## 16. Stop and troubleshooting

Stop a Vite or Expo server with Ctrl-C in that server's terminal. Do not
delete project data to fix a local startup problem.

If pnpm is still missing, run from
/home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
command -v node
command -v pnpm
node --version
pnpm --version
~~~

If node is below 22.13 or missing, repeat the nvm section. If pnpm is missing
after the standalone installer, open a new terminal and rerun the standalone
installer command from section 4. Run pnpm setup only after command -v pnpm
finds the executable.

If the workspace install fails, preserve the error and inspect the dependency
state from /home/mmekwa/Desktop/projects/spacemansystems:

~~~sh
git status --short
pnpm --version
node --version
git diff -- package.json pnpm-lock.yaml
~~~

If GitHub push says the remote is not empty, fetch and inspect its history;
never use git push --force as a setup shortcut. If Expo cannot connect over
LAN, use the tunnel command from the relevant app directory and check the
device network.

## Official references

- [pnpm installation](https://pnpm.io/installation)
- [Firebase CLI reference and authentication](https://firebase.google.com/docs/cli)
- [Google Cloud CLI installation](https://cloud.google.com/sdk/docs/install)
- [Google Cloud authentication](https://cloud.google.com/docs/authentication)
- [GitHub CLI authentication](https://cli.github.com/manual/gh_auth_login)
- [GitHub CLI Git credential setup](https://cli.github.com/manual/gh_auth_setup-git)
- [GitHub Actions secrets](https://docs.github.com/en/actions/concepts/security/secrets)
- [GitHub Actions environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- [Expo environment setup](https://docs.expo.dev/get-started/set-up-your-environment/)
