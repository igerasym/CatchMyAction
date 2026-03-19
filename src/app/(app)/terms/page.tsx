export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 prose-invert">
      <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
      <p className="text-white/40 text-sm mb-8">Last updated: March 2026</p>

      <Section title="1. Acceptance of Terms">
        By creating an account or using CatchMyAction, you agree to these Terms of Service and our Privacy Policy.
        If you do not agree, do not use the platform.
      </Section>

      <Section title="2. Platform Description">
        CatchMyAction is a marketplace connecting action sports photographers with athletes and enthusiasts.
        Photographers upload session photos; users browse, find themselves, and purchase high-resolution downloads.
      </Section>

      <Section title="3. User Accounts">
        You must provide accurate information when registering. You are responsible for maintaining the security
        of your account credentials. You must be at least 16 years old to create an account.
      </Section>

      <Section title="4. Photographer Responsibilities">
        By uploading photos, photographers represent that they own or have the right to distribute the content.
        Photographers grant CatchMyAction a non-exclusive license to display watermarked previews and thumbnails.
        Original high-resolution files are only delivered to paying customers.
      </Section>

      <Section title="5. Facial Recognition & Biometric Data">
        CatchMyAction may offer optional facial recognition features to help users find photos of themselves.
        By using this feature, you consent to the processing of your facial data. This data is used solely for
        photo matching and is not sold to third parties. You may request deletion of your biometric data at any
        time through your account settings or by contacting us.
      </Section>

      <Section title="6. Purchases & Payments">
        All purchases are final. Prices are set by photographers and displayed in USD. CatchMyAction processes
        payments through Stripe. We do not store your payment card details. Download links are valid for a
        limited number of downloads as specified at purchase time.
      </Section>

      <Section title="7. Intellectual Property">
        Photographers retain full copyright of their photos. Buyers receive a personal, non-commercial license
        to use purchased photos. Redistribution, resale, or commercial use of purchased photos is prohibited
        without explicit permission from the photographer.
      </Section>

      <Section title="8. Prohibited Content">
        Users may not upload content that is illegal, harmful, threatening, abusive, defamatory, or that
        violates the rights of others. CatchMyAction reserves the right to remove content and suspend accounts
        that violate these terms.
      </Section>

      <Section title="9. Limitation of Liability">
        CatchMyAction is provided &quot;as is&quot; without warranties. We are not liable for any indirect,
        incidental, or consequential damages arising from your use of the platform.
      </Section>

      <Section title="10. Changes to Terms">
        We may update these terms at any time. Continued use of the platform after changes constitutes
        acceptance of the new terms. We will notify users of material changes via email.
      </Section>

      <Section title="11. Contact">
        For questions about these terms, contact us at legal@catchmyaction.com.
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-white mb-2">{title}</h2>
      <p className="text-white/50 text-sm leading-relaxed">{children}</p>
    </div>
  );
}
