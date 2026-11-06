# Production Deployment (projectsbackend-831c6)

The owner approved a production deployment on 2026-11-06 (AD-017):

| Item             | Value                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| Firebase project | `projectsbackend-831c6` (`.firebaserc` alias `production`)                                      |
| Functions region | `africa-south1`                                                                                 |
| Customer Web     | default Hosting site `projectsbackend-831c6` → `spacemanprojects.co.za` (`www` redirects to it) |
| Admin Web        | Hosting site `projectsbackend-831c6-admin` → `admin.spacemanprojects.co.za`                     |
| Merchant Web     | Hosting site `projectsbackend-831c6-merchant` → `merchant.spacemanprojects.co.za`               |
| Data             | Starts empty; nothing is copied from `spacemansystemsbackend`                                   |

The owner runs every step below from a computer logged in to Firebase. Cloud
coding sessions have no Google credentials and must not deploy. Run commands
from the repository root unless a step says otherwise. Steps marked
**console** are done in the Firebase or Google Cloud console.

## 1. One-time project setup (console)

1. Upgrade the project to the **Blaze** plan and set a budget alert.
2. **Authentication → Sign-in method:** enable Email/Password and Google.
3. **Authentication → Settings → Authorized domains:** add
   `spacemanprojects.co.za`, `www.spacemanprojects.co.za`,
   `admin.spacemanprojects.co.za` and `merchant.spacemanprojects.co.za`.
4. **Firestore Database → Create database:** Standard edition, location
   `africa-south1`, production mode.
5. **Storage → Get started:** accept the default bucket.
6. **Hosting → Get started:** click through so the default site exists.
7. **Project settings → Your apps:** add one Web app (for example
   "Spaceman Web"). Hosting setup in that dialog is not needed.

## 2. Code and checks

Use the branch that contains this document. Then:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm validate
```

Do not deploy if validation fails.

## 3. Firebase CLI, sites and secrets

```sh
firebase login
firebase hosting:sites:create projectsbackend-831c6-admin --project projectsbackend-831c6
firebase hosting:sites:create projectsbackend-831c6-merchant --project projectsbackend-831c6
```

If a site ID is taken, create another ID and point the target at it, for
example `firebase target:apply hosting admin-web <new-id> --project
projectsbackend-831c6`, then commit the `.firebaserc` change.

The Functions bundle declares two secrets, so they must exist before the
first Functions deploy:

```sh
firebase functions:secrets:set PAYSTACK_SECRET_KEY --project projectsbackend-831c6
firebase functions:secrets:set GOOGLE_MAPS_SERVER_API_KEY --project projectsbackend-831c6
```

Use the Paystack **test** secret key until the owner explicitly switches to
live. For Maps, create a server key in this project's Google Cloud console,
enable Places API (New) and Routes API, and restrict the key to them. While
card checkout stays off (step 7), WhatsApp ordering does not use either key.

## 4. Environment files

```sh
corepack pnpm live:prepare -- --project=projectsbackend-831c6 --support-phone=+27723329351
```

`tools/scripts/prepare-live-environment.mjs` reads the public web-app
configuration through the Firebase CLI and writes these Git-ignored files:

- `apps/customer-web/.env.live.local`, `apps/admin-web/.env.live.local`,
  `apps/merchant-web/.env.live.local` — Firebase web config, Functions region
  and, for Customer Web, the optional footer support number.
- `firebase/functions/.env.projectsbackend-831c6` —
  `SPACEMAN_ENVIRONMENT=production`, `SPACEMAN_FUNCTIONS_REGION=africa-south1`,
  `SPACEMAN_ENFORCE_APP_CHECK=false`.

It refuses any project other than the `.firebaserc` `production` alias. Pass
`--app-id=<web app id>` if the project has more than one web app.

## 5. Deploy the backend

```sh
SPACEMAN_FIREBASE_PROJECT_ID=projectsbackend-831c6 \
SPACEMAN_FIREBASE_DEPLOY_SCOPE=firestore,storage,functions \
corepack pnpm deploy:firebase:evidenced
```

The wrapper refuses a dirty worktree (ignored files do not count) and saves a
deployment record under `.local-evidence/deployments/`.

After the deploy, open any callable from Customer Web or Admin Web. If
callables fail with a permission or CORS error, apply the same owner-approved
transport binding used in development to each callable Cloud Run service:

```sh
gcloud run services add-iam-policy-binding <service> --region=africa-south1 \
  --member=allUsers --role=roles/run.invoker --project=projectsbackend-831c6
```

Every handler still enforces Firebase Auth and role/status/scope.

## 6. Build and deploy the three sites

```sh
corepack pnpm live:build
SPACEMAN_FIREBASE_PROJECT_ID=projectsbackend-831c6 \
SPACEMAN_FIREBASE_DEPLOY_SCOPE=hosting \
corepack pnpm deploy:firebase:evidenced
```

`live:build` runs each web app's `build:live` script (`vite build --mode
live`), which reads the `.env.live.local` files from step 4. A plain `build`
keeps using the development `.env.local` values.

## 7. First administrator and ordering

1. Create the first super-admin with Application Default Credentials:

   ```sh
   gcloud auth application-default login
   cd firebase/functions
   GOOGLE_CLOUD_PROJECT=projectsbackend-831c6 SPACEMAN_ENVIRONMENT=production \
     corepack pnpm bootstrap:super-admin -- --email=<your email>
   ```

   The script accepts only `projectsbackend-831c6` with `production` (or the
   development pair). Then open the Admin site, use **Send secure setup link**
   for that email, set a password and sign in.

2. In Admin Web, create the first consenting kitchen with **Order channel:
   WhatsApp to the kitchen**, its WhatsApp number and delivery areas (for
   example `Mabopane = 40` and `Soshanguve = 50`), opening hours and status
   **Active**. The merchant user ID can be your own UID from Authentication
   until the kitchen has its own merchant account. Delivery zone IDs are used
   only by card checkout.
3. Import the menu with **Stage CSV**, review the rows and commit them.
   Columns: `sourceId,name,category,priceMinor,description,available,imageAlt`.
4. Card checkout stays off because the fresh project has no
   `platformSettings/default` document. Turn it on in Admin Web only after
   zones, fee rules, the Paystack webhook
   (`https://africa-south1-projectsbackend-831c6.cloudfunctions.net/handlePaystackWebhook`)
   and Paystack business verification are ready.

## 8. Custom domains (console and registrar)

1. **Hosting → default site → Add custom domain:** `spacemanprojects.co.za`,
   then `www.spacemanprojects.co.za` redirecting to it. This replaces whatever
   the domain serves today.
2. **Hosting → projectsbackend-831c6-admin → Add custom domain:**
   `admin.spacemanprojects.co.za`.
3. **Hosting → projectsbackend-831c6-merchant → Add custom domain:**
   `merchant.spacemanprojects.co.za`.
4. Add the TXT and A records Firebase shows at the domain registrar. Remove
   conflicting A/AAAA/CNAME records for those names. Wait for Firebase to
   verify and issue certificates.

## 9. Smoke test

On a phone, open `https://spacemanprojects.co.za`, open the kitchen, add a
dish, place a WhatsApp order to a number you control, and confirm the message
lists items, area fee, total, address and name. Sign in with Google and with
email. Record the results in `current-status.md`.

## Not covered yet

App Check enforcement, monitoring/alerting, backups, and the Phase 5–7
fulfillment, operations and launch gates. The WhatsApp channel creates no
orders in Firestore, so there is no in-system order history for those orders.
