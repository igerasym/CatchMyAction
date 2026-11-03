import { prisma } from "@/lib/db";
import { sendSessionNotification } from "@/lib/email";

/**
 * Email everyone who asked to be notified about this session — once each.
 * Safe to call repeatedly: only subscribers with notified=false are emailed, and only when the
 * session is published and actually has photos. Returns how many people will be notified.
 * Sending happens in the background so callers don't wait on the mail provider.
 */
export async function notifySubscribers(sessionId: string): Promise<number> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { title: true, published: true, photoCount: true },
  });
  if (!session || !session.published || session.photoCount === 0) return 0;

  const subscribers = await prisma.sessionNotification.findMany({
    where: { sessionId, notified: false },
    select: { id: true, email: true },
  });
  if (subscribers.length === 0) return 0;

  // Mark first so concurrent calls (parallel uploads) don't double-send
  await prisma.sessionNotification.updateMany({
    where: { id: { in: subscribers.map((s) => s.id) }, notified: false },
    data: { notified: true },
  });

  (async () => {
    for (const sub of subscribers) {
      try {
        await sendSessionNotification(sub.email, session.title, sessionId);
      } catch (err) {
        console.error("Notification send error:", err);
      }
    }
  })();

  return subscribers.length;
}
