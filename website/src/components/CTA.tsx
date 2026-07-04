'use client';

import Link from 'next/link';
import { useLanguage } from '@/i18n/LanguageContext';
import Stars from '@/components/Stars';
import Moon from '@/components/Moon';

export default function CTA() {
  const { t } = useLanguage();

  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-gradient-night rounded-4xl p-12 relative overflow-hidden shadow-card">
          <Stars className="opacity-80" />
          <Moon className="absolute top-4 right-6 w-16 h-16 sm:w-20 sm:h-20 pointer-events-none" />
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

          <div className="relative">
            <h2 className="font-rounded text-3xl sm:text-4xl font-semibold text-white mb-4">
              {t.cta.title} <span className="text-star">{t.cta.titleHighlight}</span>
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
              {t.cta.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="font-rounded bg-gradient-sun text-night px-8 py-4 rounded-full font-semibold text-lg shadow-glow hover:-translate-y-1 transition"
              >
                {t.cta.startFreeTrial}
              </Link>
              <Link
                href="#pricing"
                className="font-rounded border-2 border-white/40 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/10 hover:-translate-y-1 transition"
              >
                {t.pricing.pricing}
              </Link>
            </div>
            <p className="text-white/60 text-sm mt-6">{t.cta.noCreditCard}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

