export default function PrivacyPage() {
  return (
    <main className="pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-rounded text-4xl font-bold text-brand-text mb-4">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">
          UK/EU GDPR &amp; Child-Appropriate<br />
          App: earlyroots<br />
          Controller: Tantum Arbiter, United Kingdom<br />
          Contact (privacy): <a href="mailto:privacy@growwithfreya.com" className="text-primary hover:underline">privacy@growwithfreya.com</a><br />
          Effective date: September 24, 2026 &middot; Version 1.1
        </p>
        <div className="prose prose-lg max-w-none text-gray-600">
          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">1. What this policy covers</h2>
            <p>This explains what personal data we collect, why we collect it, how we use it, and your rights. The app is intended for children aged 0–6 used with a parent/guardian. The parent/guardian is the account holder.</p>
          </section>
          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">2. What data we collect</h2>
            <h3 className="font-rounded text-xl font-semibold text-brand-text mb-2">2.1 Data you provide</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Parent account sign-in: Your Apple/Google account identifier (token), not your password.</li>
              <li>Child profiles: an alias, an avatar, an age range (never a birth date), the app language and text size, favourite stories and songs, which books have been read and finished, badges earned, and screen-time and reminder settings, including any reminder text you write. We keep these so they are the same on every phone you sign in on. We do not keep a record of when your child used the app.</li>
              <li>Subscription: your plan (free, basic or premium) and when it renews or ends, as reported by the App Store or Google Play through RevenueCat, and which stories are downloaded, so we can honour your plan&apos;s limits.</li>
              <li>Consents: Records of parent/guardian consents (terms version, consent scope, timestamp).</li>
              <li>Device registration: Device identifier, platform, and model to keep profiles in sync.</li>
              <li>Support: Emails or messages you send us.</li>
            </ul>
            <h3 className="font-rounded text-xl font-semibold text-brand-text mb-2">2.2 Data we do not collect in MVP</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>No advertising identifiers, no third-party ads, no behavioral tracking.</li>
              <li>No payment data: we never see your card or bank details.</li>
              <li>No voice recordings on our servers. Recordings are made by grown-ups and stay on the device: the app asks a parents-only question before recording, and recordings are never sent to us.</li>
              <li>No precise location.</li>
            </ul>
            <h3 className="font-rounded text-xl font-semibold text-brand-text mb-2">2.3 Automatic data (app operations)</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Basic diagnostic logs (timestamp, route, status, duration).</li>
              <li>Crash reports, only if you turn them on in the app. They are sent to Sentry, our crash-reporting provider, without names or contact details.</li>
              <li>Pseudonymous device identifier (for security, abuse prevention, and secure access – cannot identify a person, not shared with third parties).</li>
            </ul>
          </section>
          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">3. Why we use your data (lawful bases)</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Contract:</strong> To provide the app, sign you in, sync content, and show your profiles.</li>
              <li><strong>Consent:</strong> To record parental consent and any optional features that require it.</li>
              <li><strong>Legal obligation:</strong> To respond to data subject requests, and to be able to show the consents you gave.</li>
              <li><strong>Legitimate interests (minimal, balanced):</strong> Security, fraud prevention, service analytics strictly necessary to operate the app.</li>
            </ul>
          </section>
          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">4. How we use the data</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Authenticate the parent/guardian account via Apple/Google.</li>
              <li>Create and manage child profiles and keep them in sync across your devices.</li>
              <li>Record and honour consent choices.</li>
              <li>Deliver stories and media from our content service/CMS.</li>
              <li>Provide support and maintain service security.</li>
            </ul>
          </section>
          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">5. Children&apos;s data &amp; parental consent</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>The app is used with a parent/guardian.</li>
              <li>We only process children&apos;s data (the child profile described in Section 2.1) with verifiable parental consent collected via the in-app parental gate.</li>
              <li>Parents can review, export, or delete children&apos;s data at any time (see Section 9).</li>
            </ul>
          </section>
          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">6. Data sharing</h2>
            <p className="mb-4">We use carefully chosen processors to run the app, for example:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Google Cloud: hosting, database and storage for content, accounts and child profiles.</li>
              <li>Apple/Google for sign-in.</li>
              <li>RevenueCat: subscription status from the App Store and Google Play, linked to your account.</li>
              <li>Sentry: crash reports, only if you turn them on.</li>
            </ul>
            <p>Processors act on our instructions and are bound by contracts and appropriate safeguards. We do not sell personal data. We do not share data with advertisers.</p>
          </section>
          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">7. International transfers</h2>
            <p>Your account and child profile data are stored in the European Union (Google Cloud), which the UK recognises as providing adequate protection. RevenueCat and Sentry are based in the United States; transfers to them are protected by the EU Standard Contractual Clauses with the UK Addendum in their data processing terms. Details are available on request.</p>
          </section>
          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">8. Data retention</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Account data, child profiles, subscription status and the list of downloaded stories: kept while your account is active, and deleted when you delete it.</li>
              <li>Consent records: kept while your account is active and for 3 years after you delete your account, as proof of the consents you gave. After deletion they hold only the policy version, the times, and a one-way coded form of your sign-in ID, never your name or your child&apos;s data.</li>
              <li>Diagnostics logs: up to 30 days, unless required to investigate issues.</li>
            </ul>
            <p className="mt-4">When you request erasure, we delete personal data without undue delay unless retention is required by law.</p>
          </section>
          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">9. Your rights (UK/EU)</h2>
            <p className="mb-4">You can exercise these rights by emailing{' '}
              <a href="mailto:privacy@growwithfreya.com" className="text-primary hover:underline">privacy@growwithfreya.com</a>:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access (a copy of your data, which we can send in a machine-readable format)</li>
              <li>Rectification (fix inaccuracies)</li>
              <li>Erasure (delete data)</li>
              <li>Restriction (limit processing)</li>
              <li>Portability (get data in a machine-readable format)</li>
              <li>Objection (where we rely on legitimate interests)</li>
              <li>Withdraw consent (for consent-based features)</li>
            </ul>
            <p className="mt-4">You can also delete your account and all associated data directly in the app via Account → Delete Account, or by emailing <a href="mailto:support@growwithfreya.com" className="text-primary hover:underline">support@growwithfreya.com</a>. Upon deletion, your profile, child profiles, reading history, subscription status and all other server-side data are permanently removed, except the consent records described in Section 8.</p>
            <p className="mt-4">You also have the right to complain to the{' '}
              <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">UK ICO</a>{' '}
              or your local data protection authority.</p>
          </section>
          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">10. Security</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encrypted transport (HTTPS) and secure storage for private data.</li>
              <li>Short-lived session tokens; verification on each API call.</li>
              <li>Principle of least privilege for staff and systems.</li>
            </ul>
            <p className="mt-4">No system is 100% secure. If we learn of a breach impacting your data, we will notify you and authorities where required.</p>
          </section>
          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">11. Cookies &amp; tracking</h2>
            <p>The mobile app does not use third-party tracking cookies. If a future web dashboard uses cookies, we will present a separate cookie notice and choices.</p>
          </section>
          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">12. Third-party sign-in (Apple/Google)</h2>
            <p>When you choose Apple/Google to sign in, they process your data under their own privacy policies. We receive only what&apos;s necessary to authenticate you (an ID token) and do not receive your password.</p>
          </section>
          <section className="mb-8">
            <h2 className="font-rounded text-2xl font-semibold text-brand-text mb-4">13. Changes to this policy</h2>
            <p>We may update this policy. We will post updates in-app and revise the Effective date. For significant changes, we will give you reasonable notice.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
