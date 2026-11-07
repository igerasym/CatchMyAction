"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { uploadPhoto } from "@/lib/upload-client";
import { itemId, putItems, removeItem, setStatus, pendingForSession, clearSession, type StoredItem } from "@/lib/upload-store";
import { filesToResume, summarise, type ResumeSummary } from "@/lib/upload-resume";

export interface FailedUpload {
  file: File;
  message: string;
  retryable: boolean;
}

const CONCURRENCY = 3;

/**
 * Upload queue for a session: 3 files at a time, automatic retries, and a list of failures
 * that can be retried without picking the files again.
 */
export function useUploadQueue<T = unknown>(sessionId: string | null, onUploaded?: (data: T) => void) {
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState<FailedUpload[]>([]);
  const [active, setActive] = useState(0);
  const queue = useRef<File[]>([]);
  const running = useRef(0);
  const failedRef = useRef<FailedUpload[]>([]);
  failedRef.current = failed;
  const callback = useRef(onUploaded);
  callback.current = onUploaded;

  const pump = useCallback(() => {
    if (!sessionId) return;
    while (running.current < CONCURRENCY && queue.current.length > 0) {
      const file = queue.current.shift() as File;
      running.current++;
      setActive(running.current);
      const id = itemId(sessionId, file);
      uploadPhoto<T>(file, sessionId).then((outcome) => {
        if (outcome.ok) {
          setDone((n) => n + 1);
          if (outcome.data) callback.current?.(outcome.data);
          removeItem(id).catch(() => {});
        } else {
          setFailed((f) => [...f, { file, message: outcome.message, retryable: outcome.retryable }]);
          // "retryable" marks network trouble; anything else is the server rejecting the photo.
          setStatus(id, "failed", outcome.retryable ? "retryable" : outcome.message).catch(() => {});
        }
        running.current--;
        setActive(running.current);
        pump();
      });
    }
  }, [sessionId]);

  const add = useCallback(
    (files: File[]) => {
      if (files.length === 0 || !sessionId) return;
      setTotal((n) => n + files.length);
      queue.current.push(...files);
      // Write the batch to durable storage before sending, so an interruption loses nothing.
      const items: StoredItem[] = files.map((f) => ({
        id: itemId(sessionId, f),
        sessionId,
        name: f.name,
        size: f.size,
        lastModified: f.lastModified,
        status: "pending",
        blob: f,
        attempts: 0,
      }));
      putItems(items).catch(() => {});
      pump();
    },
    [pump, sessionId]
  );

  /**
   * On mount, pick up whatever a previous visit left unfinished for this session. Those files
   * are not in memory anymore, so the photographer re-selects them; we only report the count.
   */
  const [resumable, setResumable] = useState<ResumeSummary | null>(null);
  useEffect(() => {
    if (!sessionId) return;
    pendingForSession(sessionId)
      .then((items) => {
        const summary = summarise(items);
        if (summary.pending + summary.failed > 0) setResumable(summary);
      })
      .catch(() => {});
  }, [sessionId]);

  /** Resume a previous batch from storage: the blobs are still in IndexedDB, so no re-picking. */
  const resume = useCallback(async () => {
    if (!sessionId) return;
    const stored = await pendingForSession(sessionId);
    const toSend = filesToResume(stored);
    if (toSend.length === 0) return setResumable(null);
    const files = toSend.map((i) => new File([i.blob], i.name, { lastModified: i.lastModified }));
    setResumable(null);
    setTotal((n) => n + files.length);
    queue.current.push(...files);
    pump();
  }, [pump, sessionId]);

  /** Re-queue everything that failed for a reason other than the server rejecting the photo. */
  const retryFailed = useCallback(() => {
    const again = failedRef.current.filter((f) => f.retryable);
    if (again.length === 0) return;
    setFailed(failedRef.current.filter((f) => !f.retryable));
    queue.current.push(...again.map((f) => f.file));
    pump();
  }, [pump]);

  const dismissFailed = useCallback(() => {
    setTotal((n) => n - failedRef.current.length);
    setFailed([]);
  }, []);

  const inProgress = active > 0 || queue.current.length > 0;
  const retryableCount = failed.filter((f) => f.retryable).length;

  // Closing the tab mid-upload silently drops the rest of the batch.
  useEffect(() => {
    if (!inProgress) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [inProgress]);

  /** Forget the stored batch for this session, e.g. when the photographer chooses to discard it. */
  const discardResumable = useCallback(async () => {
    if (!sessionId) return;
    await clearSession(sessionId).catch(() => {});
    setResumable(null);
  }, [sessionId]);

  return {
    total, done, failed, inProgress, retryableCount, add, retryFailed, dismissFailed,
    resumable, resume, discardResumable,
  };
}
