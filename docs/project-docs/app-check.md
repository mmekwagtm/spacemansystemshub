# App Check Rollout Decision

## Phase 2 decision

App Check enforcement is **off** for all five development clients. Turning it
on now would lock out at least one valid client because providers and native
development-build attestation are not configured. This is a deliberate staged
rollout decision, not a replacement for authentication, Firestore/Storage
Rules, or Function authorization.

| Client | Phase 2 state | Prerequisite before enforcement |
| --- | --- | --- |
| Admin Web | Off | Register web provider, verify localhost/debug path, observe metrics, test rollback. |
| Merchant Web | Off | Register web provider, verify localhost/debug path, observe metrics, test rollback. |
| Customer Web | Off | Register web provider, verify localhost/debug path, observe metrics, test rollback. |
| Customer App | Off | Use an EAS development build or registered debug token; Expo Go is not the production attestation path. |
| Driver App | Off | Use an EAS development build or registered debug token; Expo Go is not the production attestation path. |

## Enforcement gate

For each client separately:

1. Register the supported provider in the development Firebase project.
2. Initialize the client through the app configuration/Firebase layer.
3. Verify valid requests and intentional invalid requests.
4. Observe App Check metrics until legitimate traffic is identified.
5. Enable enforcement for one backend surface at a time and execute the
   rollback test.
6. Record evidence before enabling the next client or surface.

Production enforcement remains a Phase 7 acceptance item.

## Official references

- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [App Check with custom resources](https://firebase.google.com/docs/app-check/custom-resource-backend)
- [App Check debug provider](https://firebase.google.com/docs/app-check/web/debug-provider)
