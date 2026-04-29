'use client';

import Link from 'next/link';
import { useLanguage } from '@/i18n/LanguageContext';

export default function EducatorsPage() {
  const { t } = useLanguage();

  const stats = [
    { value: t.educators.stat1Value, label: t.educators.stat1Label },
    { value: t.educators.stat2Value, label: t.educators.stat2Label },
    { value: t.educators.stat3Value, label: t.educators.stat3Label },
    { value: t.educators.stat4Value, label: t.educators.stat4Label },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-gradient-hero overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-10 w-64 h-64 bg-brand-teal/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          {/* Background texture */}
          <div
            className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage: 'url(/background-home.png)',
              backgroundSize: '600px',
              backgroundPosition: 'center',
              backgroundRepeat: 'repeat',
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-white text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-brand-teal/30 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/>
                </svg>
                {t.educators.forEducators}
              </div>
              <h1 className="font-rounded text-4xl sm:text-5xl font-bold leading-tight mb-6">
                {t.educators.heroTitle}{' '}
                <span className="text-brand-teal">{t.educators.heroTitleHighlight}</span>
              </h1>
              <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto lg:mx-0">
                {t.educators.heroSubtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="#contact"
                  className="bg-white text-primary-dark px-8 py-4 rounded-full font-semibold text-lg hover:bg-brand-teal hover:text-white transition shadow-lg"
                >
                  {t.educators.requestSchoolAccess}
                </Link>
                <Link
                  href="#how-it-works"
                  className="border-2 border-white/50 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/10 transition"
                >
                  {t.educators.howItWorks}
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-6">
              {stats.map((stat, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                  <div className="font-rounded text-3xl sm:text-4xl font-bold text-white mb-2">
                    {stat.value}
                  </div>
                  <div className="text-white/70 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-rounded text-3xl sm:text-4xl font-bold text-brand-text mb-4">
              {t.educators.whyEducatorsTitle} <span className="text-primary">{t.educators.whyEducatorsTitleHighlight}</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t.educators.whyEducatorsSubtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-10 h-10 text-primary" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/>
                  </svg>
                ),
                title: t.educators.curriculumAligned,
                description: t.educators.curriculumAlignedDesc,
              },
              {
                icon: (
                  <svg className="w-10 h-10 text-primary" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                ),
                title: t.educators.engagementAnalytics,
                description: t.educators.engagementAnalyticsDesc,
              },
              {
                icon: (
                  <svg className="w-10 h-10 text-primary" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                  </svg>
                ),
                title: t.educators.classroomReady,
                description: t.educators.classroomReadyDesc,
              },
              {
                icon: (
                  <svg className="w-10 h-10 text-primary" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                  </svg>
                ),
                title: t.educators.coppaCompliant,
                description: t.educators.coppaCompliantDesc,
              },
              {
                icon: (
                  <svg className="w-10 h-10 text-primary" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
                  </svg>
                ),
                title: t.educators.readAlongSupport,
                description: t.educators.readAlongSupportDesc,
              },
              {
                icon: (
                  <svg className="w-10 h-10 text-primary" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                ),
                title: t.educators.selIntegration,
                description: t.educators.selIntegrationDesc,
              },
            ].map((benefit, i) => (
              <div key={i} className="p-6 rounded-2xl bg-gray-50 hover:shadow-card transition">
                <div className="mb-4">{benefit.icon}</div>
                <h3 className="font-rounded font-semibold text-xl mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-16 bg-blue-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-6 flex justify-center">
            <svg className="w-12 h-12 text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
            </svg>
          </div>
          <blockquote className="text-xl sm:text-2xl text-gray-700 italic mb-6">
            &ldquo;{t.educators.testimonialQuote}&rdquo;
          </blockquote>
          <div className="font-semibold text-brand-text">{t.educators.testimonialAuthor}</div>
          <div className="text-gray-500">{t.educators.testimonialRole}</div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-rounded text-3xl sm:text-4xl font-bold text-brand-text mb-4">
              {t.educators.getStartedTitle} <span className="text-primary">{t.educators.getStartedTitleHighlight}</span>
            </h2>
            <p className="text-lg text-gray-600">
              {t.educators.getStartedSubtitle}
            </p>
          </div>
          <EducatorContactForm t={t} />
        </div>
      </section>
    </>
  );
}

function EducatorContactForm({ t }: { t: any }) {
  return (
    <form className="space-y-6 bg-gray-50 rounded-3xl p-8">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            {t.educators.formName}
          </label>
          <input
            type="text"
            id="name"
            name="name"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
            placeholder={t.educators.formNamePlaceholder}
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            {t.educators.formEmail}
          </label>
          <input
            type="email"
            id="email"
            name="email"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
            placeholder={t.educators.formEmailPlaceholder}
          />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="school" className="block text-sm font-medium text-gray-700 mb-2">
            {t.educators.formSchool}
          </label>
          <input
            type="text"
            id="school"
            name="school"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
            placeholder={t.educators.formSchoolPlaceholder}
          />
        </div>
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
            {t.educators.formRole}
          </label>
          <select
            id="role"
            name="role"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition bg-white"
          >
            <option value="">{t.educators.formRoleSelect}</option>
            <option value="teacher">{t.educators.formRoleTeacher}</option>
            <option value="librarian">{t.educators.formRoleLibrarian}</option>
            <option value="admin">{t.educators.formRoleAdmin}</option>
            <option value="other">{t.educators.formRoleOther}</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
          {t.educators.formMessage}
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition resize-none"
          placeholder={t.educators.formMessagePlaceholder}
        />
      </div>
      <button
        type="submit"
        className="w-full bg-gradient-brand text-white py-4 rounded-full font-semibold text-lg hover:shadow-glow transition"
      >
        {t.educators.formSubmit}
      </button>
      <p className="text-center text-sm text-gray-500">
        {t.educators.formResponseTime}
      </p>
    </form>
  );
}

