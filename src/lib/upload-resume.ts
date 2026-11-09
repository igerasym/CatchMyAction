/** Pure rules for resuming an interrupted upload. Kept separate from IndexedDB so they can be tested. */

import type { StoredItem } from "@/lib/upload-store";

export interface ResumeSummary {
  total: number;
  done: number;
  pending: number;
  failed: number;
}

type Resumable = Pick<StoredItem, "status"> & { lastError?: string };

/** The server refused this photo (too small, moderation...). Retrying never helps, so it is not "left to upload". */
export function isRejected(i: Resumable): boolean {
  return i.status === "failed" && i.lastError !== "retryable";
}

/** Summarise a stored batch for the "uploaded 37 of 150" line shown after a restart. Rejected photos don't count. */
export function summarise(all: Resumable[]): ResumeSummary {
  const items = all.filter((i) => !isRejected(i));
  const failed = items.filter((i) => i.status === "failed").length;
  const pending = items.filter((i) => i.status === "pending").length;
  const done = items.filter((i) => i.status === "done").length;
  return { total: items.length, done, pending, failed };
}

/**
 * Files to send when the user resumes. Done files are skipped, so a restart never re-sends a
 * photo that already reached the server. Pending files go first, then failed ones that the
 * server did not reject outright (network trouble, not "photo too small").
 */
export function filesToResume<T extends Resumable>(items: T[]): T[] {
  const pending = items.filter((i) => i.status === "pending");
  const retryable = items.filter((i) => i.status === "failed" && i.lastError === "retryable");
  return [...pending, ...retryable];
}
