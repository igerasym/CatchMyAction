"use client";

import type { FailedUpload } from "@/hooks/use-upload-queue";

interface Props {
  total: number;
  done: number;
  failed: FailedUpload[];
  inProgress: boolean;
  retryableCount: number;
  onRetry: () => void;
  onDismiss: () => void;
}

/** Progress bar plus a failure list with a retry button. Shared by both upload screens. */
export function UploadStatus({ total, done, failed, inProgress, retryableCount, onRetry, onDismiss }: Props) {
  if (total === 0) return null;
  const processed = done + failed.length;
  return (
    <div className="space-y-4">
      <div className="bg-char-2 border border-line p-4" role="status" aria-live="polite">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-bone font-bold">{done} of {total} uploaded</span>
          {failed.length > 0 && <span className="text-rec font-bold">{failed.length} failed</span>}
        </div>
        <div className="flex justify-between hud mb-2.5">
          <span>{processed} / {total} processed</span>
          {inProgress && (
            <span className="flex items-center gap-2 text-bone">
              <span className="rec-dot blink" aria-hidden="true" />uploading, keep this tab open
            </span>
          )}
        </div>
        <div className="w-full bg-ink h-1">
          <div className="bg-rec h-1 transition-all" style={{ width: `${(processed / total) * 100}%` }} />
        </div>
      </div>

      {failed.length > 0 && !inProgress && (
        <div className="bg-ink border border-line border-l-2 border-l-rec p-4" role="alert">
          <p className="hud text-rec mb-2">
            {failed.length} photo{failed.length > 1 ? "s" : ""} not uploaded (the others are fine)
          </p>
          <ul className="text-sm text-mute space-y-1">
            {failed.map((f, i) => (
              <li key={`${f.file.name}-${i}`}>
                — {f.file.name}: {f.message}
              </li>
            ))}
          </ul>
          <div className="flex gap-4 mt-3">
            {retryableCount > 0 && (
              <button onClick={onRetry} className="btn-sec text-sm py-2 px-4">
                Retry {retryableCount} failed
              </button>
            )}
            <button onClick={onDismiss} className="hud hover:text-bone">Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
}
