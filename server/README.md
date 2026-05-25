# Suivi Financier — API server

Node/Express + Firebase Admin REST API for the "Suivi Financier" construction
finance tracker.

The browser authenticates with Firebase Auth (email/password or anonymous) and
calls this API with `Authorization: Bearer <Firebase ID token>`. The server
verifies the token, derives the `uid` from it, and owns **all** Firestore
access. Clients never send a `uid`; data is scoped per user by construction:

```
users/{uid}/projects/{projectId}                                  -> Project meta + financialConfig
users/{uid}/projects/{projectId}/{ftms|lots|personnel|standaloneOs}/{docId}
```

The full REST contract is documented in [`../docs/API.md`](../docs/API.md). The
data model lives in [`../client/src/types/models.ts`](../client/src/types/models.ts).

## Requirements

- Node.js 20+ (uses the built-in `node:test` runner and `node --watch`).
- ESM project (`"type": "module"`).

## Environment variables

Copy [`.env.example`](.env.example) to `.env` and fill it in. The server loads
`.env` automatically via `dotenv`.

| Variable | Purpose |
| --- | --- |
| `PORT` | Port to listen on (default `8080`). |
| `CORS_ORIGIN` | Allowed CORS origin for the client (e.g. `http://localhost:5173`). Defaults to permissive when unset. |
| `FIREBASE_PROJECT_ID` | Firebase project id (optional; usually inferred from credentials). |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to a service-account JSON file. |
| `FIREBASE_SERVICE_ACCOUNT` | The service-account JSON inline as a single-line string (alternative to the path). |
| `USE_MEMORY_DB` | When set to `1`, swaps Firebase for an in-memory shim (tests/local). See below. |
| `FIRESTORE_EMULATOR_HOST` | Point the Admin SDK at a local Firestore emulator (e.g. `localhost:8081`). |
| `FIREBASE_AUTH_EMULATOR_HOST` | Point the Admin SDK at a local Auth emulator (e.g. `localhost:9099`). |

**Credential resolution order** (when not using the memory shim or emulator):
1. `FIREBASE_SERVICE_ACCOUNT` (inline JSON), else
2. `GOOGLE_APPLICATION_CREDENTIALS` (path to JSON file), else
3. Application Default Credentials (e.g. on Google Cloud).

## Install

```bash
npm install
```

## Run

```bash
npm run dev     # node --watch src/index.js (reloads on change)
npm start       # node src/index.js
```

Then:

```bash
curl -s http://localhost:8080/api/health   # -> {"ok":true}
```

`GET /api/health` is the only public endpoint; everything else requires a valid
bearer token.

## Test

```bash
npm test        # USE_MEMORY_DB=1 node --test
```

Tests use Node's built-in test runner plus `supertest`, driving the Express app
in-process. They run with **zero credentials and no network**: setting
`USE_MEMORY_DB=1` makes [`src/config/firebase.js`](src/config/firebase.js) load
an in-memory Firestore/Auth shim ([`src/config/memory-firestore.js`](src/config/memory-firestore.js))
instead of the real Admin SDK.

- The Firestore shim implements just the surface the data layer uses
  (`collection`/`doc`/`get`/`set`/`delete`/`orderBy`/`limit`/`batch` and the
  matching snapshot shapes).
- The Auth shim maps a fake token `test-token-<uid>` to that `uid`, so tests can
  act as different users and assert per-user ownership isolation.

Production behavior is unchanged when `USE_MEMORY_DB` is unset: the real Admin
SDK is used exactly as before.

Coverage includes: 401 without/invalid token, project create/list/get/update/
delete, `bootstrap`, collection upsert/list/delete round-trips for all four
sub-collections, 404 on unknown projects, malformed-body handling, and
ownership isolation (user A cannot see or mutate user B's data).

## Alternative: run against the Firebase Emulator Suite

For an end-to-end local setup against real Firebase semantics (instead of the
in-memory shim), use the [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite).
Start the Firestore and Auth emulators, then export the emulator hosts before
running the server so the Admin SDK connects locally instead of to production:

```bash
export FIRESTORE_EMULATOR_HOST=localhost:8081
export FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
npm run dev
```

These variables are also noted in [`.env.example`](.env.example). The emulator
requires Java; the in-memory shim used by `npm test` does not, which is why the
test suite prefers it.

## Security rules

[`firestore.rules`](firestore.rules) documents the per-user access model and
acts as defense-in-depth: it restricts `users/{uid}/**` so a signed-in user can
only read/write their own subtree
(`allow read, write: if request.auth != null && request.auth.uid == uid`).

Note: this API uses the Firebase Admin SDK, which bypasses security rules — the
server is the trusted enforcement point. The rules matter if any client ever
accesses Firestore directly, and they encode the intended model either way.

## Project layout

```
src/
  index.js                  Express app wiring (CORS, JSON, routes, error handler)
  config/firebase.js        Admin SDK init OR in-memory shim (USE_MEMORY_DB)
  config/memory-firestore.js In-memory Firestore + Auth shim (test only)
  middleware/auth.js        requireAuth: verifies bearer token, sets req.uid
  lib/store.js              Firestore data layer (paths, validation, CRUD)
  routes/projects.js        Project lifecycle endpoints
  routes/collections.js     Generic CRUD router for the 4 sub-collections
test/
  api.test.js               Integration tests (supertest + memory shim)
```
