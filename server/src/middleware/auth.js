import { auth } from "../config/firebase.js";

// Verifies the Firebase ID token in the Authorization: Bearer <token> header.
// Accepts both real (email/password) and anonymous users. On success, attaches
// req.uid and req.user (the decoded token).
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer (.+)$/);
  if (!match) {
    return res.status(401).json({ error: "Missing bearer token" });
  }
  try {
    const decoded = await auth.verifyIdToken(match[1]);
    req.uid = decoded.uid;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
