"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { uploadPhoto } from "@/lib/upload-client";

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
      uploadPhoto<T>(file, sessionId).then((outcome) => {
        if (outcome.ok) {
          setDone((n) => n + 1);
          if (outcome.data) callback.current?.(outcome.data);
        } else {
          setFailed((f) => [...f, { file, message: outcome.message, retryable: outcome.retryable }]);
        }
        running.current--;
        setActive(running.current);
        pump();
      });
    }
  }, [sessionId]);

  const add = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      setTotal((n) => n + files.length);
      queue.current.push(...files);
      pump();
    },
    [pump]
  );

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

  return { total, done, failed, inProgress, retryableCount, add, retryFailed, dismissFailed };
}
