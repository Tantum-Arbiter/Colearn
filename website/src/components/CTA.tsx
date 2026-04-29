'use client';

import Link from 'next/link';
import { useLanguage } from '@/i18n/LanguageContext';

export default function CTA() {
  const { t } = useLanguage();

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-gradient-brand rounded-3xl p-12 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-brand-teal/20 rounded-full translate-x-1/4 translate-y-1/4" />
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
            <h2 className="font-rounded text-3xl sm:text-4xl font-bold text-white mb-4">
              {t.cta.title} <span className="text-brand-teal">{t.cta.titleHighlight}</span>
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
              {t.cta.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="bg-white text-primary-dark px-8 py-4 rounded-full font-semibold text-lg hover:bg-brand-teal hover:text-white transition shadow-lg"
              >
                {t.cta.startFreeTrial}
              </Link>
              <Link
                href="#pricing"
                className="border-2 border-white/50 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/10 transition"
              >
                {t.pricing.pricing}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

