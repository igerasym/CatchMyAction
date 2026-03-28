"use client";

import { useState } from "react";
import { Send, Heart, Camera, Waves } from "lucide-react";
import { toastSuccess, toastError } from "@/lib/toast";

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

  const inp = "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-ocean-500 focus:border-transparent placeholder-white/20 transition-colors";

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 min-h-[80vh]">
      {/* Header — built by riders */}
      <div className="text-center mb-12">
        <div className="flex justify-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-ocean-500/10 border border-ocean-500/20 flex items-center justify-center">
            <Waves className="w-5 h-5 text-ocean-400" />
          </div>
          <div className="w-10 h-10 rounded-xl bg-ocean-500/10 border border-ocean-500/20 flex items-center justify-center">
            <Camera className="w-5 h-5 text-ocean-400" />
          </div>
          <div className="w-10 h-10 rounded-xl bg-ocean-500/10 border border-ocean-500/20 flex items-center justify-center">
            <Heart className="w-5 h-5 text-ocean-400" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Get in Touch</h1>
        <p className="text-white/50 max-w-md mx-auto leading-relaxed">
          Built by riders, for riders. We're a small team of action sports enthusiasts 
          who believe every moment deserves to be captured and owned.
        </p>
        <p className="text-white/30 text-sm mt-3">
          Got a question, feedback, or just want to say hi? We'd love to hear from you.
        </p>
      </div>

      {sent ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
            <Send className="w-7 h-7 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Message Sent!</h2>
          <p className="text-white/40 mb-6">We'll get back to you as soon as possible.</p>
          <button onClick={() => { setSent(false); setName(""); setEmail(""); setSubject(""); setMessage(""); }}
            className="text-ocean-400 hover:underline text-sm">Send another message</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Your Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required
                placeholder="How should we call you?" className={inp} />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="your@email.com" className={inp} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Subject</label>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} required className={inp}>
              <option value="">What's this about?</option>
              <option value="general">General Question</option>
              <option value="photographer">I'm a Photographer</option>
              <option value="athlete">I'm an Athlete / Looking for Photos</option>
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="partnership">Partnership / Business</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} required
              rows={5} placeholder="Tell us what's on your mind..." className={inp} />
          </div>
          <button type="submit" disabled={sending}
            className="w-full py-3.5 bg-ocean-500 text-white font-medium rounded-xl hover:bg-ocean-400 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
            <Send className="w-4 h-4" />
            {sending ? "Sending..." : "Send Message"}
          </button>
          <p className="text-center text-[11px] text-white/20">
            Or email us directly at <a href="mailto:hello@catchmyactions.com" className="text-ocean-400 hover:underline">hello@catchmyactions.com</a>
          </p>
        </form>
      )}
    </div>
  );
}
