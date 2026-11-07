/** Pure rules for resuming an interrupted upload. Kept separate from IndexedDB so they can be tested. */

import type { StoredItem } from "@/lib/upload-store";

export interface ResumeSummary {
  total: number;
  done: number;
  pending: number;
  failed: number;
}

/** Summarise a stored batch for the "uploaded 37 of 150" line shown after a restart. */
export function summarise(items: Pick<StoredItem, "status">[]): ResumeSummary {
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
export function filesToResume<T extends Pick<StoredItem, "status" | "lastError">>(items: T[]): T[] {
  const pending = items.filter((i) => i.status === "pending");
  const retryable = items.filter((i) => i.status === "failed" && i.lastError === "retryable");
  return [...pending, ...retryable];
}
