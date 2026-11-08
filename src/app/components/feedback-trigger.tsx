"use client";

import { openFeedback } from "@/lib/feedback-types";
import type { OpenFeedbackDetail } from "@/lib/feedback-types";

/** A button that opens the Feedback dialog (mounted once in the layout). */
export default function FeedbackTrigger({
  className,
  children,
  detail,
}: {
  className?: string;
  children: React.ReactNode;
  detail?: OpenFeedbackDetail;
}) {
  return (
    <button type="button" onClick={() => openFeedback(detail)} className={className}>
      {children}
    </button>
  );
}
