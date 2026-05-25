# Suivi Financier

Modern rewrite of the original single-file "Suivi Financier" SPA — a financial
tracker for construction projects (FTM / TS modification orders, OS service
orders, lots/contractors, quotes, DGD final settlements, forecasting, and
Excel/Word exports).

The original 13k-line `index.html` is preserved under
[`legacy/`](./legacy/SUIVI_FTM_v30.24.html) as the reference for behaviour and
for the modules still being ported.

## Architecture

| Layer        | Stack                                              |
| ------------ | -------------------------------------------------- |
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS        |
| **Backend**  | Node.js + Express + Firebase Admin SDK             |
| **Auth**     | Firebase Auth (email/password + anonymous guest)   |
| **Database** | Cloud Firestore (server-side only, via the API)    |

```
generateur_de_cr/
├── client/      # React app (Firebase Auth on the client; data via the API)
├── server/      # Express API; owns all Firestore access, verifies ID tokens
├── legacy/      # Original single-file app (reference + logic to port)
└── docs/        # Architecture & API contract
```

- The browser **never** talks to Firestore directly. It authenticates with
  Firebase, then calls the Express API with a `Bearer <idToken>` header.
- The API verifies every token and scopes all data under the caller's uid:
  `users/{uid}/projects/{projectId}/{ftms|lots|personnel|standaloneOs}`.

See [`docs/API.md`](./docs/API.md) for the full REST contract and data model.

## Prerequisites

- Node.js 20+
- A Firebase project with **Authentication** (Email/Password + Anonymous
  providers enabled) and **Cloud Firestore** enabled.

## Setup

```bash
npm run install:all    # installs both client and server dependencies
```

### 1. Configure the backend

```bash
cp server/.env.example server/.env
```

Provide Firebase Admin credentials (a service-account JSON from
*Firebase console → Project settings → Service accounts → Generate new private
key*) via `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT`.

### 2. Configure the frontend

```bash
cp client/.env.example client/.env
```

Fill in the Firebase **Web app** config (*Project settings → Your apps → Web*).

### 3. Run

```bash
npm run dev:server     # http://localhost:8080
npm run dev:client     # http://localhost:5173 (proxies /api to the server)
```

## Status

This is the first pass: modern scaffold + Firebase auth + the full data layer.
Core workflow (Kanban board, FTM, OS, Lots, Personnel) is being built on top of
this foundation. Heavier modules from the legacy app — DGD generation,
financial forecasting, financial tracking dashboards, and Excel/Word exports —
are ported incrementally; the legacy file remains the reference for those.
