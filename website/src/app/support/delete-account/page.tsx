export default function DeleteAccountPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="bg-gradient-hero pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-rounded text-3xl sm:text-4xl font-bold text-white mb-2">
            Delete My Account
          </h1>
          <p className="text-white/80">
            Permanently remove your earlyroots account and all associated data.
          </p>
        </div>
      </section>

      <section className="py-10 -mt-6">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl p-8 shadow-card">
            <p className="text-gray-600 mb-6">
              We&apos;re sorry to see you go. You can delete your earlyroots account using either of the methods below. Account deletion is permanent and cannot be undone.
            </p>

            {/* Method 1: In-App */}
            <div className="mb-6">
              <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center mt-0.5">1</span>
                <div>
                  <h2 className="font-rounded text-lg font-semibold text-brand-text mb-1">Delete via the app</h2>
                  <p className="text-sm text-gray-600 mb-2">
                    The quickest way to delete your account:
                  </p>
                  <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                    <li>Open the earlyroots app</li>
                    <li>Go to <strong>Account</strong> (tap the profile icon)</li>
                    <li>Scroll down and tap <strong>Delete Account</strong></li>
                    <li>Follow the confirmation steps</li>
                  </ol>
                  <p className="text-xs text-gray-400 mt-2">Your account and all data will be deleted immediately.</p>
                </div>
              </div>
            </div>

            {/* Method 2: Email */}
            <div className="mb-6">
              <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center mt-0.5">2</span>
                <div>
                  <h2 className="font-rounded text-lg font-semibold text-brand-text mb-1">Email us</h2>
                  <p className="text-sm text-gray-600 mb-2">
                    If you no longer have access to the app, you can request deletion by email:
                  </p>
                  <p className="text-sm text-gray-600">
                    Send an email to{' '}
                    <a
                      href="mailto:support@growwithfreya.com?subject=Delete%20My%20Account"
                      className="text-primary font-medium hover:underline"
                    >
                      support@growwithfreya.com
                    </a>
                    {' '}with the subject <strong>&ldquo;Delete My Account&rdquo;</strong>.
                  </p>
                  <p className="text-xs text-gray-400 mt-2">We&apos;ll process your request within 48 hours.</p>
                </div>
              </div>
            </div>

            {/* What gets deleted */}
            <div className="bg-amber-50 rounded-xl p-4 mb-6">
              <h3 className="font-rounded text-sm font-semibold text-amber-800 mb-2">What gets deleted</h3>
              <ul className="text-xs text-amber-700 space-y-1">
                <li>• Your user profile (nickname, avatar, preferences)</li>
                <li>• All session and authentication data</li>
                <li>• Reading history and screen time records</li>
                <li>• Any data synced across devices</li>
                <li>• Downloaded stories cached on your device</li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-rounded text-sm font-semibold text-brand-text mb-1">Subscriptions</h3>
              <p className="text-xs text-gray-500">
                Deleting your account does not automatically cancel an active subscription. To avoid future charges, please cancel your subscription in your{' '}
                <a href="https://support.apple.com/en-gb/118428" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Apple App Store</a>
                {' '}or{' '}
                <a href="https://support.google.com/googleplay/answer/7018481" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Play Store</a>
                {' '}settings before deleting your account.
              </p>
            </div>
          </div>

          {/* Back to contact */}
          <div className="text-center mt-6">
            <a href="/contact" className="text-sm text-primary hover:underline">
              ← Back to Contact
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
