/** Browser-side photo upload with retries. Kept free of React so it can be unit-tested. */

export type UploadOutcome<T = unknown> =
  | { ok: true; data: T | null }
  | { ok: false; message: string; retryable: boolean };

interface Options {
  fetchImpl?: typeof fetch;
  retries?: number; // extra attempts after the first one
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Upload one file. Network errors, 429 and 5xx are retried with backoff (a phone on a beach loses
 * signal all the time). Other 4xx are final: the server rejected the photo itself.
 * A 409 "duplicate" on a retry means an earlier attempt actually reached the server, so it counts as success.
 */
export async function uploadPhoto<T = unknown>(
  file: File,
  sessionId: string,
  opts: Options = {}
): Promise<UploadOutcome<T>> {
  const doFetch = opts.fetchImpl ?? fetch;
  const retries = opts.retries ?? 3;
  const sleep = opts.sleep ?? defaultSleep;
  let lastMessage = "Upload failed";

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(1000 * 2 ** (attempt - 1));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("sessionId", sessionId);
      const res = await doFetch("/api/photos/upload", { method: "POST", body: fd });
      if (res.ok) return { ok: true, data: (await res.json().catch(() => null)) as T | null };
      if (res.status === 409 && attempt > 0) return { ok: true, data: null };

      const body = await res.json().catch(() => ({}));
      lastMessage = body.error || `Upload failed (${res.status})`;
      if (res.status !== 429 && res.status < 500) return { ok: false, message: lastMessage, retryable: false };
    } catch {
      lastMessage = "Connection lost";
    }
  }
  return { ok: false, message: lastMessage, retryable: true };
}
