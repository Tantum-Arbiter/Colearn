export default function TermsPage() {
  return (
    <main className="pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-rounded text-4xl font-bold text-brand-text mb-4">
          Terms & Conditions
        </h1>
        <p className="text-gray-500 mb-8">Last updated: March 2026</p>
        
        <div className="prose prose-lg max-w-none text-gray-600">
          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using earlyroots, you agree to be bound by these Terms & Conditions.
              If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">
              2. Description of Service
            </h2>
            <p>
              earlyroots provides a subscription-based streaming platform featuring animated
              storybooks for children. Our service includes access to our library of stories,
              narration, and related educational content.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">
              3. Subscription & Payments
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Subscriptions are billed monthly or annually as selected</li>
              <li>Free trial periods may be offered to new subscribers</li>
              <li>Payments are processed securely through the App Store or Google Play</li>
              <li>Subscriptions automatically renew unless cancelled before the renewal date</li>
              <li>Refunds are handled according to the respective app store policies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">
              4. User Accounts
            </h2>
            <p className="mb-4">
              You are responsible for maintaining the confidentiality of your account credentials 
              and for all activities under your account. You agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate account information</li>
              <li>Keep your password secure</li>
              <li>Notify us of any unauthorised account access</li>
              <li>Not share your account with others outside your household</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">
              5. Content & Intellectual Property
            </h2>
            <p>
              All content in earlyroots, including stories, illustrations, narration, music,
              and software, is owned by or licensed to us and protected by copyright and intellectual
              property laws. You may not copy, distribute, or create derivative works without permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">
              6. Acceptable Use
            </h2>
            <p className="mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the service for any unlawful purpose</li>
              <li>Attempt to gain unauthorised access to our systems</li>
              <li>Interfere with the proper functioning of the service</li>
              <li>Record, download, or redistribute our content</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">
              7. Termination
            </h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate these terms. 
              You may cancel your subscription at any time through your account settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">
              8. Limitation of Liability
            </h2>
            <p>
              earlyroots is provided "as is" without warranties of any kind. We are not liable
              for any indirect, incidental, or consequential damages arising from your use of the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">
              9. Changes to Terms
            </h2>
            <p>
              We may update these terms from time to time. We will notify users of significant changes 
              via email or in-app notification. Continued use of the service constitutes acceptance 
              of the updated terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">
              10. Contact
            </h2>
            <p>
              For questions about these terms, please contact us at{' '}
              <a href="mailto:legal@growwithfreya.com" className="text-primary hover:underline">
                legal@growwithfreya.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

