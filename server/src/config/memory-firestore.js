// =============================================================================
// In-memory Firestore + Auth shim — TEST ONLY.
//
// Activated by config/firebase.js when USE_MEMORY_DB=1 (or NODE_ENV=test).
// Implements just enough of the firebase-admin surface that the data layer
// (src/lib/store.js) and routes use:
//
//   db.collection(path).doc(id)
//   ref.collection(sub)
//   ref.get() / ref.set(data, opts) / ref.delete()
//   query.orderBy(field, dir) / query.limit(n) / query.get()
//   snapshot: .exists / .data() / .ref            (document snapshots)
//   snapshot: .docs / .empty / .size / .forEach    (query snapshots)
//   db.batch() -> { delete(ref), commit() }
//   collectionRef.firestore -> the db (used for batched deletes)
//
// Storage model: a single flat Map keyed by the document's full slash path
// ("users/<uid>/projects/<pid>"). Collections are derived by scanning keys
// that have the collection path as a prefix and exactly one more segment.
// This mirrors Firestore semantics closely enough for the data layer.
// =============================================================================

function clone(value) {
  // Deep clone so callers can't mutate stored state by reference.
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

class MemoryDocumentSnapshot {
  constructor(ref, data) {
    this.ref = ref;
    this.id = ref.id;
    this._data = data;
    this.exists = data !== undefined;
  }
  data() {
    return clone(this._data);
  }
}

class MemoryQuerySnapshot {
  constructor(docs) {
    this.docs = docs;
    this.empty = docs.length === 0;
    this.size = docs.length;
  }
  forEach(cb) {
    this.docs.forEach(cb);
  }
}

class MemoryDocumentReference {
  constructor(store, path) {
    this._store = store;
    this.path = path;
    const segments = path.split("/");
    this.id = segments[segments.length - 1];
  }

  get firestore() {
    return this._store;
  }

  collection(name) {
    assertSegment(name, "collection id");
    return new MemoryCollectionReference(this._store, `${this.path}/${name}`);
  }

  async get() {
    const data = this._store._data.get(this.path);
    return new MemoryDocumentSnapshot(this, data);
  }

  async set(data, opts = {}) {
    const incoming = clone(data) ?? {};
    if (opts.merge) {
      const existing = this._store._data.get(this.path) ?? {};
      this._store._data.set(this.path, { ...existing, ...incoming });
    } else {
      this._store._data.set(this.path, incoming);
    }
    return { writeTime: new Date() };
  }

  async delete() {
    // Delete the document and, like Firestore, leave sub-collection docs alone
    // unless the caller cleaned them up. The routes delete sub-docs explicitly,
    // so a plain delete here only removes this exact key.
    this._store._data.delete(this.path);
    return { writeTime: new Date() };
  }
}

class MemoryQuery {
  constructor(store, collectionPath, { orderBy = null, limit = null } = {}) {
    this._store = store;
    this._collectionPath = collectionPath;
    this._orderBy = orderBy;
    this._limit = limit;
  }

  get firestore() {
    return this._store;
  }

  orderBy(field, dir = "asc") {
    return new MemoryQuery(this._store, this._collectionPath, {
      orderBy: { field, dir },
      limit: this._limit,
    });
  }

  limit(n) {
    return new MemoryQuery(this._store, this._collectionPath, {
      orderBy: this._orderBy,
      limit: n,
    });
  }

  _collectDocs() {
    const prefix = `${this._collectionPath}/`;
    const childDepth = this._collectionPath.split("/").length + 1;
    const out = [];
    for (const [key, value] of this._store._data) {
      if (!key.startsWith(prefix)) continue;
      // Direct children only: exactly one segment beyond the collection path.
      if (key.split("/").length !== childDepth) continue;
      const ref = new MemoryDocumentReference(this._store, key);
      out.push(new MemoryDocumentSnapshot(ref, value));
    }
    return out;
  }

  async get() {
    let docs = this._collectDocs();
    if (this._orderBy) {
      const { field, dir } = this._orderBy;
      docs.sort((a, b) => {
        const av = a._data?.[field];
        const bv = b._data?.[field];
        if (av < bv) return dir === "desc" ? 1 : -1;
        if (av > bv) return dir === "desc" ? -1 : 1;
        return 0;
      });
    }
    if (this._limit != null) docs = docs.slice(0, this._limit);
    return new MemoryQuerySnapshot(docs);
  }
}

class MemoryCollectionReference extends MemoryQuery {
  constructor(store, path) {
    super(store, path);
    this.path = path;
    const segments = path.split("/");
    this.id = segments[segments.length - 1];
  }

  doc(id) {
    const docId = id ?? autoId();
    assertSegment(docId, "document id");
    return new MemoryDocumentReference(this._store, `${this.path}/${docId}`);
  }
}

class MemoryWriteBatch {
  constructor() {
    this._ops = [];
  }
  delete(ref) {
    this._ops.push(() => ref.delete());
    return this;
  }
  set(ref, data, opts) {
    this._ops.push(() => ref.set(data, opts));
    return this;
  }
  async commit() {
    for (const op of this._ops) await op();
    return [];
  }
}

export class MemoryFirestore {
  constructor() {
    this._data = new Map();
  }
  collection(name) {
    assertSegment(name, "collection id");
    return new MemoryCollectionReference(this, name);
  }
  batch() {
    return new MemoryWriteBatch();
  }
  // Test helper: wipe everything between tests.
  _reset() {
    this._data.clear();
  }
}

// Auth stub: maps a fake token "test-token-<uid>" to that uid so tests can
// simulate different users (and verify per-user isolation). Anything else is
// rejected the same way a real invalid token would be.
export class MemoryAuth {
  async verifyIdToken(token) {
    const match = /^test-token-(.+)$/.exec(token || "");
    if (!match) {
      const err = new Error("Invalid token");
      err.code = "auth/argument-error";
      throw err;
    }
    return { uid: match[1], sub: match[1] };
  }
}

let autoCounter = 0;
function autoId() {
  // Deterministic-ish auto id, prefixed to avoid collisions across calls.
  autoCounter += 1;
  return `auto-${Date.now().toString(36)}-${autoCounter}`;
}

// Reject ids that would break out of their path (Firestore forbids "/" and
// empty segments in document/collection ids). This also hardens the real path
// scheme against traversal via crafted URL params.
function assertSegment(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    const err = new Error(`Invalid ${label}`);
    err.status = 400;
    throw err;
  }
  if (value.includes("/")) {
    const err = new Error(`Invalid ${label}: must not contain "/"`);
    err.status = 400;
    throw err;
  }
}
