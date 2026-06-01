'use client';

import Link from 'next/link';
import { useLanguage } from '@/i18n/LanguageContext';

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={`w-5 h-5 flex-shrink-0 ${className ?? ''}`} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

export default function Pricing() {
  const { t } = useLanguage();

  const plans = [
    {
      name: t.pricing.basicName,
      price: t.pricing.basicPrice,
      period: t.pricing.perMonth,
      description: t.pricing.billedMonthly,
      features: [
        t.pricing.basicFeature1,
        t.pricing.basicFeature2,
        t.pricing.basicFeature3,
        t.pricing.basicFeature4,
        t.pricing.basicFeature5,
      ],
      badge: null as string | null,
      highlighted: false,
    },
    {
      name: t.pricing.premiumName,
      price: t.pricing.premiumPrice,
      period: t.pricing.perMonth,
      description: t.pricing.billedMonthly,
      features: [
        t.pricing.premiumFeature1,
        t.pricing.premiumFeature2,
        t.pricing.premiumFeature3,
        t.pricing.premiumFeature4,
        t.pricing.premiumFeature5,
      ],
      badge: t.pricing.mostPopular,
      highlighted: true,
    },
    {
      name: t.pricing.annualName,
      price: t.pricing.annualPrice,
      period: t.pricing.perYear,
      equivPrice: t.pricing.annualEquiv,
      originalPrice: t.pricing.annualOriginal,
      description: t.pricing.billedAnnually,
      features: [
        t.pricing.annualFeature1,
        t.pricing.annualFeature2,
        t.pricing.annualFeature3,
        t.pricing.annualFeature4,
      ],
      badge: t.pricing.bestValue,
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-3xl p-8 overflow-hidden border-2 transition-all duration-300 ${
                plan.highlighted
                  ? 'bg-gradient-brand text-white shadow-2xl md:scale-105 border-transparent z-10'
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
              {plan.badge && (
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-md ${
                  plan.highlighted ? 'bg-white/20 text-white' : 'bg-brand-teal text-white'
                }`}>
                  {plan.badge}
                </div>
              )}
              <h3 className={`font-rounded text-2xl font-bold mb-3 ${plan.highlighted ? 'text-white' : ''}`}>
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-bold">£{plan.price}</span>
                <span className={plan.highlighted ? 'text-white/70' : 'text-gray-500'}>{plan.period}</span>
              </div>
              {'equivPrice' in plan && plan.equivPrice && (
                <div className={`text-sm mb-1 ${plan.highlighted ? 'text-white/70' : 'text-gray-500'}`}>
                  That&apos;s just £{plan.equivPrice}{t.pricing.perMonth}
                </div>
              )}
              {'originalPrice' in plan && plan.originalPrice && (
                <div className={`text-sm mb-1 ${plan.highlighted ? 'text-white/60' : 'text-gray-400'}`}>
                  <span className="line-through">£{plan.originalPrice}{t.pricing.perYear}</span>
                  {' '}{t.pricing.save}
                </div>
              )}
              <p className={`text-sm mb-6 ${plan.highlighted ? 'text-white/70' : 'text-gray-500'}`}>
                {plan.description}
              </p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckIcon className={plan.highlighted ? 'text-brand-teal mt-0.5' : 'text-brand-teal mt-0.5'} />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`block w-full py-3.5 rounded-full font-semibold text-center transition text-sm ${
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
        <p className="text-center text-gray-500 text-sm mt-10">
          {t.pricing.guarantee}
        </p>
      </div>
    </section>
  );
}
