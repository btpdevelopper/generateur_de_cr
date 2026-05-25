import { readFileSync } from "node:fs";

// When USE_MEMORY_DB=1 (or NODE_ENV=test) we swap the real Firebase Admin SDK
// for a zero-dependency in-memory shim so tests run with no credentials and no
// network. Production runs (flag off) initialize the real Admin SDK exactly as
// before. The decision is made once, at import time.
const USE_MEMORY_DB =
  process.env.USE_MEMORY_DB === "1" || process.env.NODE_ENV === "test";

let auth;
let db;
let admin;

if (USE_MEMORY_DB) {
  const { MemoryFirestore, MemoryAuth } = await import("./memory-firestore.js");
  db = new MemoryFirestore();
  auth = new MemoryAuth();
  // A minimal `admin` stand-in. Nothing in production code paths uses it during
  // tests, but we expose the same names so imports don't break.
  admin = { apps: [], firestore: () => db, auth: () => auth };
} else {
  const mod = await import("firebase-admin");
  admin = mod.default;

  // Initialize Firebase Admin once. Credentials are resolved in this order:
  //   1. FIREBASE_SERVICE_ACCOUNT (the service-account JSON inline, as a string)
  //   2. GOOGLE_APPLICATION_CREDENTIALS (path to a service-account JSON file)
  //   3. Application Default Credentials (e.g. on Google Cloud)
  const buildCredential = () => {
    const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (inline) {
      return admin.credential.cert(JSON.parse(inline));
    }
    const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (path) {
      return admin.credential.cert(JSON.parse(readFileSync(path, "utf8")));
    }
    return admin.credential.applicationDefault();
  };

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: buildCredential(),
      projectId: process.env.FIREBASE_PROJECT_ID || undefined,
    });
  }

  auth = admin.auth();
  db = admin.firestore();
}

export { auth, db, admin };
