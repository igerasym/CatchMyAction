export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 md:py-16">
      <p className="hud mb-5">Legal / Privacy</p>
      <h1 className="disp text-[clamp(34px,5vw,60px)] text-bone mb-4">Privacy Policy<span className="text-rec">.</span></h1>
      <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-dim mb-10">Last updated: March 2026</p>

      <Section title="1. Information We Collect">
        <strong className="text-bone">Account data:</strong> name, email address, password (hashed), account type.
        <br /><strong className="text-bone">Photos:</strong> images uploaded by photographers, including metadata (dimensions, file size).
        <br /><strong className="text-bone">Biometric data:</strong> if you use facial recognition features, we process facial geometry data to match you in photos.
        <br /><strong className="text-bone">Payment data:</strong> processed by Stripe. We do not store card numbers.
        <br /><strong className="text-bone">Usage data:</strong> pages visited, searches performed, device information.
      </Section>

      <Section title="2. How We Use Your Information">
        • To provide and improve the platform
        <br />• To process purchases and deliver downloads
        <br />• To match your face in photos (only with your explicit consent)
        <br />• To communicate with you about your account
        <br />• To prevent fraud and ensure platform security
      </Section>

      <Section title="3. Biometric Data (Facial Recognition)">
        We take biometric data seriously. When you use our &quot;Find Me&quot; feature:
        <br />• You confirm consent each time before your selfie is compared — nothing is scanned without it
        <br />• Your selfie is used only for that one search and is not stored
        <br />• Matches are shown to you first; only the photos you confirm are marked as yours
        <br />• To find matches, faces in uploaded session photos are indexed by our face-matching provider (AWS Rekognition)
        <br />• Facial data is not sold, shared, or used for advertising
        <br />• To remove a photo of you, or your matches, use &quot;Report photo&quot; on the photo or contact us — we act within 48 hours
      </Section>

      <Section title="4. Data Sharing">
        We do not sell your personal data. We share data only with:
        <br />• <strong className="text-bone">Stripe</strong> — for payment processing
        <br />• <strong className="text-bone">AWS</strong> — for secure photo storage
        <br />• <strong className="text-bone">Resend</strong> — for sending our emails, including the messages you send us
        <br />• <strong className="text-bone">Telegram</strong> — we get a short notice of each message you send through
        the Feedback form: its type, the start of the text and the page. Your email address is not included
        <br />• <strong className="text-bone">Law enforcement</strong> — only when legally required
      </Section>

      <Section title="5. Data Retention">
        Account data is retained while your account is active. Photos are retained as long as the photographer
        keeps them on the platform. Selfies are never stored. Face index data for a session is deleted when the session is deleted, and on request.
        You can request full data deletion by contacting us.
      </Section>

      <Section title="6. Your Rights">
        You have the right to:
        <br />• Access your personal data
        <br />• Correct inaccurate data
        <br />• Delete your account and all associated data
        <br />• Opt out of facial recognition at any time
        <br />• Export your data in a portable format
        <br />• Object to processing of your data
      </Section>

      <Section title="7. Security">
        We use industry-standard security measures including encrypted storage, HTTPS, hashed passwords,
        and signed URLs for protected downloads. Photos are stored in private buckets with access controls.
      </Section>

      <Section title="8. Cookies">
        We use essential cookies for authentication and session management. We do not use tracking or
        advertising cookies.
      </Section>

      <Section title="9. Children">
        CatchMyAction is not intended for users under 16. We do not knowingly collect data from children.
      </Section>

      <Section title="10. Contact">
        For privacy inquiries or data requests: privacy@catchmyaction.com
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-6">
      <h2 className="text-lg font-bold text-bone mb-3">{title}</h2>
      <div className="text-mute text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}
