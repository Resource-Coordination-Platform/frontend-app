# Offline victim registration and SOS

Choosing Offline SOS after registration fails saves the validated registration
fields in SecureStore. The password is needed to create the same normal account
and is removed after registration, login, and all queued uploads succeed.
The first saved SOS supplies GPS coordinates when registration has none.

The root layout imports and registers the background task before authentication.
Connectivity changes, foreground resume, a 30-second JS retry timer, and native
background fetch all invoke the same serialized upload queue. JS timers only run
while the operating system permits JavaScript execution. Background fetch uses
an advisory 60-second interval; the OS decides actual execution times.

The worker calls the existing `/auth/register`, `/auth/login`, and authenticated
`/requests/help` endpoints. It preserves request IDs for server idempotency and
uses the normal victim routing, review, and delivery workflow. A registration
conflict is recovered only by logging in with the saved password. Failed work
remains stored. Another active account cannot submit the saved victim's SOS.

## Verification

Run `node scripts/test-offline-sync.cjs` and `npx tsc --noEmit`.
The service tests mock storage and HTTP; device scheduling needs a native build:

1. Use a fresh email in an installed development/release build with GPS enabled.
2. Disable internet, fill registration, choose Offline SOS, and save an SOS with quantities.
3. Background the app, then enable internet without reopening it. Allow the OS to run background fetch.
4. Verify one victim account and one help request under that account on the server.
5. Open the app; log out and log in with the original email/password, and verify request tracking.
6. Repeat with connectivity lost during upload; restoration must not create duplicate requests.

Use a rebuilt native app for background configuration changes. Expo Go is not
a substitute for this device test. On iOS background fetch does not run after
the app is terminated. Background restrictions or force-stop can prevent sync
until the OS permits execution or the user reopens the app.

Existing offline entries created before registration details were saved cannot
reconstruct the missing password; those users must register/sign in manually.
