# API Contract

Base URL: `/api` (the Vite dev server proxies this to the Express server).

**Auth:** every endpoint except `/api/health` requires
`Authorization: Bearer <Firebase ID token>`. The token is obtained on the client
via Firebase Auth (`getIdToken()`). Both email/password and anonymous users are
accepted. The server verifies the token and derives `uid` from it — clients
never send a uid.

All data is scoped per user in Firestore:

```
users/{uid}/projects/{projectId}                                  -> Project meta
users/{uid}/projects/{projectId}/ftms/{id}                        -> Ftm
users/{uid}/projects/{projectId}/lots/{id}                        -> Lot
users/{uid}/projects/{projectId}/personnel/{id}                   -> Personnel
users/{uid}/projects/{projectId}/standaloneOs/{id}                -> OrdreService
```

## Endpoints

### Health

- `GET /api/health` → `{ ok: true }` (no auth)

### Projects

- `GET /api/projects` → `Project[]`
- `POST /api/projects` body `{ name }` → `Project` (201)
- `GET /api/projects/:projectId` → `Project`
- `GET /api/projects/:projectId/bootstrap` →
  `{ project, ftms, lots, personnel, standaloneOs }` (one round-trip to render
  the whole board — mirrors the legacy `loadData()`)
- `PUT /api/projects/:projectId` body `{ name?, financialConfig? }` → `Project`
- `DELETE /api/projects/:projectId` → 204 (also deletes all sub-collections)

### Collections (`ftms` | `lots` | `personnel` | `standaloneOs`)

Same shape for each `:col`:

- `GET /api/projects/:projectId/:col` → `T[]`
- `PUT /api/projects/:projectId/:col/:id` body `T` → `T` (create or replace;
  the document id in the URL wins)
- `DELETE /api/projects/:projectId/:col/:id` → 204

## Data model

The TypeScript source of truth is
[`client/src/types/models.ts`](../client/src/types/models.ts). Key entities:

- **Ftm** — central entity. `id`, `type` (`FTM`|`TS`), `ftmNumber`, `fpmNumber`,
  `status`, `statusDate`, `statusHistory[]`, `lots[]` (lot numbers),
  `impacts{ [lotNumber]: { text, expectedReturnDate } }`, `moeEstimate`,
  `moeValidationDate`, `moaValidationDate`, `quotes[]`, `os[]`, `exchanges[]`.
- **Quote** — attached to an Ftm. `amount`, `validatedAmount`,
  `validatedMoaAmount`, `delayDays`, `isAccepted`, …
- **OrdreService (OS)** — inside `ftm.os[]` or standalone. `number`, `lots[]`
  (recipients), `signatureChain[]`, `linkedQuoteDetails[]`.
- **Lot** — contractor/work package. `number`, `name`, `company`, `isExternal`,
  `montantMarche`, `tauxRG` (decimal, e.g. 0.05), `suiviFinancier[]`,
  `penalites[]`, `avance`.
- **Personnel** — `name`, `role`, `isArchived`.
- **Project** — `name`, `version: 2`, `financialConfig`.

> Note on amounts: the legacy app parses French-formatted numbers (spaces as
> thousands separators, comma as decimal). Use `safeParseFloat` from
> `client/src/lib/parse.ts` before storing numeric form values.
