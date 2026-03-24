import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL || "CatchMyAction <noreply@catchmyactions.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailParams): Promise<boolean> {
  if (!resend) {
    console.log(`[Email] Would send to ${to}: ${subject}`);
    return true;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      ...(text && { text }),
    });
    return true;
  } catch (err) {
    console.error("Email send error:", err);
    return false;
  }
}

/** Send email verification link */
export async function sendVerificationEmail(email: string, token: string, name: string) {
  const link = `${APP_URL}/api/auth/verify?token=${token}`;
  return sendEmail({
    to: email,
    subject: "Verify your CatchMyActions account",
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #333; margin-bottom: 8px;">Welcome to CatchMyActions, ${name}!</h2>
        <p style="color: #666; line-height: 1.6;">Please verify your email address to activate your account.</p>
        <a href="${link}" style="display: inline-block; margin: 24px 0; padding: 14px 32px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Verify Email
        </a>
        <p style="color: #999; font-size: 13px;">Or copy this link: ${link}</p>
        <p style="color: #999; font-size: 13px; margin-top: 32px;">This link expires in 24 hours.</p>
      </div>
    `,
    text: `Welcome to CatchMyActions, ${name}! Verify your email: ${link}`,
  });
}

/** Send session notification (photos ready) */
export async function sendSessionNotification(email: string, sessionTitle: string, sessionId: string) {
  const link = `${APP_URL}/sessions/${sessionId}`;
  return sendEmail({
    to: email,
    subject: `Photos are ready: ${sessionTitle}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #333;">📸 Photos are ready!</h2>
        <p style="color: #666; line-height: 1.6;">The photos for <strong>${sessionTitle}</strong> have been uploaded. Find yourself and grab your shots!</p>
        <a href="${link}" style="display: inline-block; margin: 24px 0; padding: 14px 32px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          View Photos
        </a>
        <p style="color: #999; font-size: 13px; margin-top: 32px;">— CatchMyAction</p>
      </div>
    `,
    text: `Photos for ${sessionTitle} are ready! View them: ${link}`,
  });
}

/** Send password reset link */
export async function sendPasswordResetEmail(email: string, token: string) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  return sendEmail({
    to: email,
    subject: "Reset your CatchMyActions password",
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #333;">Reset your password</h2>
        <p style="color: #666; line-height: 1.6;">Click the button below to set a new password.</p>
        <a href="${link}" style="display: inline-block; margin: 24px 0; padding: 14px 32px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Reset Password
        </a>
        <p style="color: #999; font-size: 13px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `,
    text: `Reset your password: ${link}`,
  });
}
