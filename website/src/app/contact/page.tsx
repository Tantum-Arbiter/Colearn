export default function ContactPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="bg-gradient-hero pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-rounded text-3xl sm:text-4xl font-bold text-white mb-2">
            Get in Touch
          </h1>
          <p className="text-white/80">
            Have a question or feedback? We'd love to hear from you.
          </p>
        </div>
      </section>

      {/* Contact Cards */}
      <section className="py-8 -mt-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-4">
            {/* General Enquiries */}
            <a
              href="mailto:hello@growwithfreya.com"
              className="group bg-white rounded-2xl p-6 shadow-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-rounded text-lg font-semibold text-brand-text mb-1">
                General Enquiries
              </h3>
              <p className="text-gray-500 mb-2 text-sm">
                Questions about Freya?
              </p>
              <span className="text-primary text-sm font-medium group-hover:underline">
                hello@growwithfreya.com
              </span>
            </a>

            {/* Support */}
            <a
              href="mailto:support@growwithfreya.com"
              className="group bg-white rounded-2xl p-6 shadow-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="font-rounded text-lg font-semibold text-brand-text mb-1">
                Technical Support
              </h3>
              <p className="text-gray-500 mb-2 text-sm">
                Need help with the app?
              </p>
              <span className="text-primary text-sm font-medium group-hover:underline">
                support@growwithfreya.com
              </span>
            </a>

            {/* Partnerships */}
            <a
              href="mailto:partnerships@growwithfreya.com"
              className="group bg-white rounded-2xl p-6 shadow-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-rounded text-lg font-semibold text-brand-text mb-1">
                Partnerships
              </h3>
              <p className="text-gray-500 mb-2 text-sm">
                Interested in working together?
              </p>
              <span className="text-primary text-sm font-medium group-hover:underline">
                partnerships@growwithfreya.com
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* Feedback Form */}
      <section className="py-8 bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <h2 className="font-rounded text-xl font-bold text-brand-text mb-1 text-center">
              Send Us a Message
            </h2>
            <p className="text-gray-500 text-sm text-center mb-6">
              Fill out the form below and we'll get back to you soon.
            </p>

            <form className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-brand-text mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-brand-text mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-brand-text mb-1">
                  Subject
                </label>
                <select
                  id="subject"
                  name="subject"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition bg-white"
                >
                  <option value="">Select a topic</option>
                  <option value="general">General Enquiry</option>
                  <option value="support">Technical Support</option>
                  <option value="feedback">App Feedback</option>
                  <option value="partnership">Partnership Opportunity</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-brand-text mb-1">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition resize-none"
                  placeholder="How can we help you?"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-brand text-white py-3 rounded-xl font-medium hover:shadow-glow transition"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* FAQ Banner - Compact */}
      <section className="py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl p-5 shadow-soft flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 text-center sm:text-left">
              <h2 className="font-rounded text-lg font-bold text-brand-text">
                Need a Quick Answer?
              </h2>
              <p className="text-gray-600 text-sm">
                Check out our FAQ section for common questions.
              </p>
            </div>
            <a
              href="/#faq"
              className="bg-gradient-brand text-white px-6 py-2.5 rounded-full text-sm font-medium hover:shadow-glow transition whitespace-nowrap"
            >
              View FAQs
            </a>
          </div>
        </div>
      </section>

      {/* Response Time - Compact */}
      <section className="py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-teal/10 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 bg-brand-teal rounded-full animate-pulse"></span>
            <span className="text-sm font-medium text-brand-deepBlue">We typically respond within 24 hours</span>
          </div>
        </div>
      </section>
    </main>
  );
}

