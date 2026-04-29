'use client';

import Link from 'next/link';
import { useLanguage } from '@/i18n/LanguageContext';

export default function Pricing() {
  const { t } = useLanguage();

  const plans = [
    {
      name: t.pricing.monthly,
      price: '5.99',
      period: t.pricing.month,
      description: t.pricing.billedMonthly,
      features: [
        t.pricing.fullLibrary,
        t.pricing.unlimitedStreaming,
        t.pricing.offlineDownloads,
        t.pricing.adFree,
        t.pricing.cancelAnytime,
      ],
      highlighted: false,
    },
    {
      name: t.pricing.annual,
      price: '4.49',
      period: t.pricing.month,
      annualPrice: '53.91',
      description: `${t.pricing.billedAnnually} £53.91`,
      savings: t.pricing.save,
      features: [
        t.pricing.fullLibrary,
        t.pricing.unlimitedStreaming,
        t.pricing.offlineDownloads,
        t.pricing.adFree,
        t.pricing.cancelAnytime,
        t.pricing.prioritySupport,
      ],
      highlighted: true,
    },
  ];

  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="font-rounded text-3xl sm:text-4xl font-bold text-brand-text mb-4">
            {t.pricing.title} <span className="text-primary">{t.pricing.titleHighlight}</span> {t.pricing.titleEnd}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t.pricing.subtitle}
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-start">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-3xl p-8 overflow-hidden border-2 transition-all duration-300 ${
                plan.highlighted
                  ? 'bg-gradient-brand text-white shadow-2xl scale-105 border-transparent'
                  : 'bg-white text-brand-text shadow-lg border-gray-100 hover:border-primary/20 hover:shadow-xl'
              }`}
            >
              {/* Background texture for highlighted card */}
              {plan.highlighted && (
                <div
                  className="absolute inset-0 opacity-[0.05] pointer-events-none"
                  style={{
                    backgroundImage: 'url(/background-home.png)',
                    backgroundSize: '600px',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'repeat',
                  }}
                />
              )}
              {plan.savings && (
                <div className="absolute top-4 right-4 bg-brand-teal text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-md">
                  {plan.savings}
                </div>
              )}
              <h3 className={`font-rounded text-2xl font-bold mb-2 ${plan.highlighted ? 'text-white' : ''}`}>
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold">£{plan.price}</span>
                <span className={plan.highlighted ? 'text-white/70' : 'text-gray-500'}>/{plan.period}</span>
              </div>
              <p className={`text-sm mb-6 ${plan.highlighted ? 'text-white/70' : 'text-gray-500'}`}>
                {plan.description}
              </p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <svg
                      className={`w-5 h-5 ${plan.highlighted ? 'text-brand-teal' : 'text-brand-teal'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`block w-full py-4 rounded-full font-semibold text-center transition ${
                  plan.highlighted
                    ? 'bg-white text-primary-dark hover:bg-brand-teal hover:text-white'
                    : 'bg-gradient-brand text-white hover:shadow-glow'
                }`}
              >
                {t.pricing.startFreeTrial}
              </Link>
            </div>
          ))}
        </div>

        {/* Guarantee */}
        <p className="text-center text-gray-500 text-sm mt-8">
          {t.pricing.guarantee}
        </p>
      </div>
    </section>
  );
}

