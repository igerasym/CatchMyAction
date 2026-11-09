"use client";

import type { FailedUpload } from "@/hooks/use-upload-queue";

interface Props {
  total: number;
  done: number;
  failed: FailedUpload[];
  inProgress: boolean;
  onRetry: () => void;
  onDismiss: () => void;
}

/**
 * Progress bar plus what went wrong. Two different situations get two different messages:
 * photos the server rejected (the photographer has to fix or swap them, retrying changes nothing)
 * and photos that only failed because the connection dropped (just try again).
 */
export function UploadStatus({ total, done, failed, inProgress, onRetry, onDismiss }: Props) {
  if (total === 0) return null;
  const processed = done + failed.length;
  const rejected = failed.filter((f) => !f.retryable);
  const dropped = failed.filter((f) => f.retryable);
  return (
    <div className="space-y-4">
      <div className="bg-char-2 border border-line p-4" role="status" aria-live="polite">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-bone font-bold">{done} of {total} uploaded</span>
          {failed.length > 0 && <span className="text-rec font-bold">{failed.length} not uploaded</span>}
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

      {dropped.length > 0 && !inProgress && (
        <div className="bg-ink border border-line border-l-2 border-l-rec p-4" role="alert">
          <p className="text-bone font-bold text-sm">
            {dropped.length === 1 ? "1 photo" : `${dropped.length} photos`} didn&apos;t upload: the connection dropped
          </p>
          <p className="text-mute text-sm mt-1">Nothing is wrong with the photo{dropped.length > 1 ? "s" : ""}. Try again when the signal is back.</p>
          <ul className="text-sm text-mute space-y-1 mt-2">
            {dropped.map((f, i) => <li key={`${f.file.name}-${i}`}>— {f.file.name}</li>)}
          </ul>
          <button onClick={onRetry} className="btn-sec text-sm py-2 px-4 mt-3">Try again</button>
        </div>
      )}

      {rejected.length > 0 && !inProgress && (
        <div className="bg-ink border border-line border-l-2 border-l-rec p-4" role="alert">
          <p className="text-bone font-bold text-sm">
            {rejected.length === 1 ? "1 photo was" : `${rejected.length} photos were`} rejected
          </p>
          <p className="text-mute text-sm mt-1">
            {rejected.length === 1 ? "It" : "These"} can&apos;t be uploaded as {rejected.length === 1 ? "it is" : "they are"}. Fix or swap {rejected.length === 1 ? "it" : "them"} and add again.
          </p>
          <ul className="text-sm text-mute space-y-1 mt-2">
            {rejected.map((f, i) => (
              <li key={`${f.file.name}-${i}`}>— {f.file.name}: {f.message}</li>
            ))}
          </ul>
          <button onClick={onDismiss} className="hud hover:text-bone mt-3">Clear this list</button>
        </div>
      )}
    </div>
  );
}
