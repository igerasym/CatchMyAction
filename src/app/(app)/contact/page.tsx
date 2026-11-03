"use client";

import { useState } from "react";
import { Send, Heart, Camera, Waves } from "lucide-react";
import { toastSuccess, toastError } from "@/lib/toast";
import { INPUT, LABEL, LINK } from "../ui";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      if (res.ok) {
        setSent(true);
        toastSuccess("Message sent!");
      } else {
        const data = await res.json();
        toastError(data.error || "Failed to send");
      }
    } catch {
      toastError("Something went wrong");
    } finally {
      setSending(false);
    }
  }

  const inp = INPUT;

  return (
    <div className="max-w-2xl mx-auto py-12 md:py-16 min-h-[80vh]">
      {/* Header — built by riders */}
      <div className="mb-12">
        <div className="flex gap-2 mb-8" aria-hidden="true">
          {[Waves, Camera, Heart].map((Icon, i) => (
            <div key={i} className="w-10 h-10 border border-line bg-char-2 flex items-center justify-center">
              <Icon className="w-5 h-5 text-bone" />
            </div>
          ))}
        </div>
        <p className="hud mb-5">Contact / Say hi</p>
        <h1 className="disp text-[clamp(34px,5vw,60px)] text-bone mb-4">Get in touch<span className="text-rec">.</span></h1>
        <p className="text-mute max-w-md leading-relaxed">
          Built by riders, for riders. We&apos;re a small team of action sports enthusiasts
          who believe every moment deserves to be captured and owned.
        </p>
        <p className="text-dim text-sm mt-3">
          Got a question, feedback, or just want to say hi? We&apos;d love to hear from you.
        </p>
      </div>

      {sent ? (
        <div className="relative bg-char-2 border border-line px-7 py-12" role="status">
          <div className="brk brk-sm" aria-hidden="true" />
          <Send className="w-7 h-7 text-rec mb-5" aria-hidden="true" />
          <h2 className="text-xl font-bold text-bone mb-2">Message sent</h2>
          <p className="text-mute mb-6">We&apos;ll get back to you as soon as possible.</p>
          <button onClick={() => { setSent(false); setName(""); setEmail(""); setSubject(""); setMessage(""); }}
            className="btn-sec">Send another message</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 border-t border-line pt-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="contact-name" className={LABEL}>Your name</label>
              <input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name"
                placeholder="How should we call you?" className={inp} />
            </div>
            <div>
              <label htmlFor="contact-email" className={LABEL}>Email</label>
              <input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
                placeholder="your@email.com" className={inp} />
            </div>
          </div>
          <div>
            <label htmlFor="contact-subject" className={LABEL}>Subject</label>
            <select id="contact-subject" value={subject} onChange={(e) => setSubject(e.target.value)} required className={inp}>
              <option value="">What&apos;s this about?</option>
              <option value="general">General Question</option>
              <option value="photographer">I&apos;m a Photographer</option>
              <option value="athlete">I&apos;m an Athlete / Looking for Photos</option>
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="partnership">Partnership / Business</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="contact-message" className={LABEL}>Message</label>
            <textarea id="contact-message" value={message} onChange={(e) => setMessage(e.target.value)} required
              rows={5} placeholder="Tell us what's on your mind..." className={inp} />
          </div>
          <button type="submit" disabled={sending} className="btn-pri w-full justify-center disabled:opacity-50">
            <Send className="w-4 h-4" aria-hidden="true" />
            {sending ? "Sending..." : "Send message"}
          </button>
          <p className="text-sm text-dim">
            Or email us directly at <a href="mailto:hello@catchmyactions.com" className={LINK}>hello@catchmyactions.com</a>
          </p>
        </form>
      )}
    </div>
  );
}
