export default function PrivacyPage() {
  return (
    <main className="pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-rounded text-4xl font-bold text-brand-text mb-4">
          Privacy Policy
        </h1>
        <p className="text-gray-500 mb-8">Last updated: March 2026</p>
        
        <div className="prose prose-lg max-w-none text-gray-600">
          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">
              Introduction
            </h2>
            <p>
              Grow with Freya ("we", "our", or "us") is committed to protecting the privacy of children 
              and families who use our app. This Privacy Policy explains how we collect, use, and safeguard 
              your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">
              Information We Collect
            </h2>
            <p className="mb-4">We collect minimal information necessary to provide our service:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Account information (email address, name)</li>
              <li>Subscription and payment details (processed securely via third-party providers)</li>
              <li>App usage data (stories viewed, time spent reading)</li>
              <li>Device information for troubleshooting purposes</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">
              Children's Privacy (COPPA Compliance)
            </h2>
            <p>
              We take children's privacy seriously. We do not collect personal information directly from 
              children. All account management is handled by parents or guardians. We comply with the 
              Children's Online Privacy Protection Act (COPPA) and similar international regulations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">
              How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and improve our storytelling service</li>
              <li>To process subscriptions and payments</li>
              <li>To send important service updates</li>
              <li>To provide customer support</li>
              <li>To generate anonymous usage analytics</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">
              Data Security
            </h2>
            <p>
              We implement industry-standard security measures to protect your data, including encryption, 
              secure servers, and regular security audits.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">
              Your Rights
            </h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt out of marketing communications</li>
              <li>Export your data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">
              Contact Us
            </h2>
            <p>
              For privacy-related questions or requests, please contact us at{' '}
              <a href="mailto:privacy@growwithfreya.com" className="text-primary hover:underline">
                privacy@growwithfreya.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

