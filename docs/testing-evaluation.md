# Mobile app automated testing

Run these commands from the frontend-app folder using Node.js 24 (the version used for this setup).

```powershell
npm run test:unit
npm run test:sync
npm run test:auth
npm test
```

The commands run 8 validation unit tests, 8 offline/help-request service tests, and 4 authentication session tests respectively. `npm test` runs all 20 tests. No running backend or phone is needed for these automated tests.

## What the unit tests check

The tests import the actual functions from `utils/validation.ts`; they do not copy the validation rules. The victim and helper registration screens use these functions. The login screen also uses the email validator.

| ID | Input | Expected result |
| --- | --- | --- |
| U01 | student@example.com | Valid email |
| U02 | student | Invalid email with an error message |
| U03 | Empty email | Invalid email with an error message |
| U04 | Empty password | Invalid password with an error message |
| U05 | Abcdef12! (9 characters) | Invalid password with an error message |
| U06 | Abcdef123! (10 characters) | Valid password length |
| U07 | 0771234567 | Valid phone format |
| U08 | 077ABC4567 | Invalid phone format with an error message |

U01/U06/U07 are positive cases. The rejected inputs are negative cases. U05 and U06 check the boundary around the minimum password length. These checks do not prove that an email or phone number exists, or that a password is secure.

## Read one test

```javascript
test('U02: email without @ and domain is rejected', () => {
  const result = validateEmail('student');
  assert.equal(result.isValid, false);
  assert.ok(result.error);
});
```

- `test(...)` names and runs one test case.
- `validateEmail('student')` calls the app's real function with invalid input.
- `result` holds the returned result.
- `assert.equal(actual, expected)` fails the test if the values differ.
- `false` means this input must be rejected. A rejected input is a PASS when rejection is expected.
- `assert.ok(result.error)` checks that an error message was returned. It does not check whether the phone displays it.

## Offline-sync and help-request tests

These exercise registration and help-request services together with mocked API and storage dependencies:

1. Pending registration, login, and authenticated request upload, including quantity and queue cleanup.
2. Upload failure preserves the queued request; retry uses the same request ID.
3. Invalid credentials or another active account block uploading and keep the request queued.
4. S04: Saving the same request ID updates the saved entry without duplicating it.
5. S05: An already logged-in victim uploads a request with the correct disaster, location, quantity, unit and authentication header; the queue is then cleared.
6. S06: A request without a logged-in user stays queued; no upload is attempted.
7. S07: An older request without requested items is blocked and retained for review.
8. S08: When the second of two uploads fails, the first is removed from the queue. Retry sends only the remaining request.

They are service integration tests with mocks, not live backend or device tests. They do not prove server-side deduplication or persistence after restarting a real phone.

### Understanding the async tests

- `setup()` gives each test fresh fake storage and API dependencies, and loads the real app services.
- `s.signIn()` supplies a fake logged-in victim token. It does not call the real login server.
- `await` waits for an asynchronous action to finish before checking its result.
- `assert.rejects(...)` expects the operation to fail. If it unexpectedly succeeds, the test fails.
- `s.calls` records requests attempted against the mock API, including failed attempts.
- `readOfflineHelpRequests()` reads what remains in the mocked queue.

Explain S08 as: "I saved two requests. The first upload succeeded and the second failed. I checked that only the failed request remained. After retrying, the queue was empty and the first request had not been sent again."

## Authentication session tests

`scripts/test-auth-session.cjs` loads the real `services/api.ts` with mocked SecureStore and Axios. Setup is test plumbing; the four named tests below it describe the behavior.

| ID | Behavior checked |
| --- | --- |
| A01 | Session saving stores access token, refresh token, role and tenant |
| A02 | Session clearing removes all four saved values |
| A03 | Request interceptor adds the saved token as a Bearer authorization header |
| A04 | After session clearing, a request with empty headers gets no saved token |

`attachToken` is the real request callback registered by `api.ts`. The mock captures it so the test can call it without sending a network request. These tests do not verify password authentication on the server, token refresh, secure storage encryption, or the logout button/navigation.

Explain A03 as: "I saved a test access token, passed a request with empty headers through the app's interceptor, and checked that it added the correct Authorization header."

## Scope to explain honestly

Automated coverage here includes form validation, session helpers, the authorization request interceptor, pending registration and the help-request queue/sync logic. It is not a measured percentage of code coverage. Maps/GPS permissions, alerts, donations, delivery confirmation, navigation and screen interactions still need manual or additional automated tests. Use your manual evidence for the flows you actually checked.

## Evaluation evidence

Run and save the real output in PowerShell:

```powershell
npm test 2>&1 | Tee-Object -FilePath docs/testing-results.txt
```

Take a screenshot showing the command, named tests, and totals. Show `scripts/test-validation.cjs` and its import from `utils/validation.ts` when explaining the code. Keep your manual test evidence separately for screen behavior and real-device flows.

Suggested explanation (after a successful run):

> I tested the mobile app's validation logic using Node's test runner. I covered valid inputs, invalid inputs, and the password-length boundary. The tests call the same functions used by the registration screens. I also ran the existing offline-sync service tests using mocked API and storage. These are not automated UI tests. I checked the screens manually.

Rerunning these tests after a code change helps detect regressions in the behavior they cover. Passing these tests does not mean 100% app coverage.
