import admin from "firebase-admin";
import { readFileSync } from "node:fs";

// Initialize Firebase Admin once. Credentials are resolved in this order:
//   1. GOOGLE_APPLICATION_CREDENTIALS (path to a service-account JSON file)
//   2. FIREBASE_SERVICE_ACCOUNT (the service-account JSON inline, as a string)
//   3. Application Default Credentials (e.g. on Google Cloud)
function buildCredential() {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (inline) {
    return admin.credential.cert(JSON.parse(inline));
  }
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (path) {
    return admin.credential.cert(JSON.parse(readFileSync(path, "utf8")));
  }
  return admin.credential.applicationDefault();
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: buildCredential(),
    projectId: process.env.FIREBASE_PROJECT_ID || undefined,
  });
}

export const auth = admin.auth();
export const db = admin.firestore();
export { admin };
