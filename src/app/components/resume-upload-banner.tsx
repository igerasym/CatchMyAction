"use client";

import type { ResumeSummary } from "@/lib/upload-resume";

interface Props {
  summary: ResumeSummary;
  onResume: () => void;
  onDiscard: () => void;
}

/**
 * Shown when a previous visit left photos unfinished. Resuming uses the files still stored on
 * the device, so the photographer does not have to pick 150 files again.
 */
export function ResumeUploadBanner({ summary, onResume, onDiscard }: Props) {
  const left = summary.pending + summary.failed;
  return (
    <div role="status" className="mb-6 bg-ink border border-line border-l-2 border-l-bone p-4">
      <p className="text-bone font-bold text-sm">
        You have {left} photo{left === 1 ? "" : "s"} not uploaded yet
      </p>
      <p className="text-mute text-sm mt-1">
        {summary.done} of {summary.total} already uploaded. Resume to send the rest.
      </p>
      <div className="flex gap-4 mt-3">
        <button onClick={onResume} className="btn-pri py-2 px-4 text-sm">Resume upload</button>
        <button onClick={onDiscard} className="hud hover:text-bone">Discard</button>
      </div>
    </div>
  );
}
