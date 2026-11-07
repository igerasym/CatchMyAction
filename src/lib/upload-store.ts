/**
 * Durable upload queue in IndexedDB. Survives the app being backgrounded, killed by iOS, or
 * the tab being reloaded, so the photographer can resume instead of re-picking 150 files.
 *
 * Only metadata and the file blobs are stored, and only for the current session. Entries are
 * removed once a file is uploaded, so the store stays small.
 */

const DB_NAME = "cma-uploads";
const STORE = "items";
const DB_VERSION = 1;

export type ItemStatus = "pending" | "done" | "failed";

export interface StoredItem {
  id: string; // `${sessionId}:${name}:${size}:${lastModified}`, stable across reloads
  sessionId: string;
  name: string;
  size: number;
  lastModified: number;
  status: ItemStatus;
  blob: Blob;
  attempts: number;
  lastError?: string;
}

export function itemId(sessionId: string, file: { name: string; size: number; lastModified: number }): string {
  return `${sessionId}:${file.name}:${file.size}:${file.lastModified}`;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("bySession", "sessionId");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        t.oncomplete = () => {
          db.close();
          resolve(req.result);
        };
        t.onerror = () => {
          db.close();
          reject(t.error);
        };
      })
  );
}

export function putItems(items: StoredItem[]): Promise<void> {
  return open().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const t = db.transaction(STORE, "readwrite");
        const store = t.objectStore(STORE);
        for (const item of items) store.put(item);
        t.oncomplete = () => {
          db.close();
          resolve();
        };
        t.onerror = () => {
          db.close();
          reject(t.error);
        };
      })
  );
}

export function setStatus(id: string, status: ItemStatus, lastError?: string): Promise<unknown> {
  return tx<unknown>("readwrite", (store) => {
    const get = store.get(id);
    get.onsuccess = () => {
      const item = get.result as StoredItem | undefined;
      if (!item) return;
      store.put({ ...item, status, lastError, attempts: item.attempts + 1 });
    };
    return get;
  });
}

export function removeItem(id: string): Promise<void> {
  return tx<undefined>("readwrite", (store) => store.delete(id));
}

/** Everything still waiting for this session, oldest first. */
export function pendingForSession(sessionId: string): Promise<StoredItem[]> {
  return tx<StoredItem[]>("readonly", (store) => store.index("bySession").getAll(sessionId)).then((items) =>
    items.filter((i) => i.status !== "done").sort((a, b) => a.lastModified - b.lastModified)
  );
}

export function clearSession(sessionId: string): Promise<void> {
  return open().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const t = db.transaction(STORE, "readwrite");
        const req = t.objectStore(STORE).index("bySession").openCursor(IDBKeyRange.only(sessionId));
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
        t.oncomplete = () => {
          db.close();
          resolve();
        };
        t.onerror = () => {
          db.close();
          reject(t.error);
        };
      })
  );
}
