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
        <br />• Facial data is processed only with your explicit opt-in consent
        <br />• Data is used solely for matching you in session photos
        <br />• Facial data is not sold, shared, or used for advertising
        <br />• You can delete your biometric data at any time via Settings
        <br />• We comply with GDPR, CCPA, and BIPA requirements for biometric data
      </Section>

      <Section title="4. Data Sharing">
        We do not sell your personal data. We share data only with:
        <br />• <strong className="text-bone">Stripe</strong> — for payment processing
        <br />• <strong className="text-bone">AWS</strong> — for secure photo storage
        <br />• <strong className="text-bone">Law enforcement</strong> — only when legally required
      </Section>

      <Section title="5. Data Retention">
        Account data is retained while your account is active. Photos are retained as long as the photographer
        keeps them on the platform. Biometric data is deleted when you opt out or delete your account.
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
