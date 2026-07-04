'use client';

import Link from 'next/link';
import { useState, useEffect, ReactNode } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import Stars from '@/components/Stars';
import Moon from '@/components/Moon';

const BookStackIcon = ({ className = "w-16 h-16 lg:w-20 lg:h-20" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);

const MusicalNoteIcon = ({ className = "w-16 h-16 lg:w-20 lg:h-20" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V4.5A2.25 2.25 0 0016.5 2.25H15M3.75 21h16.5M3.75 21v-3.675a2.25 2.25 0 011.53-2.137l.217-.065M3.75 21h.008v.008H3.75V21zm.375-3.81a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

const SpellingIcon = ({ className = "w-16 h-16 lg:w-20 lg:h-20" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
  </svg>
);

const HeartIcon = ({ className = "w-16 h-16 lg:w-20 lg:h-20" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
);

const SunIcon = ({ className = "w-16 h-16 lg:w-20 lg:h-20" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
  </svg>
);

const CheckBadge = () => (
  <svg className="w-4 h-4 text-star" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

interface Screenshot {
  id: number;
  title: string;
  icon: (props: { className?: string }) => ReactNode;
  description: string;
  bgColor: string;
}

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { t } = useLanguage();

  const screenshots: Screenshot[] = [
    {
      id: 1,
      title: t.features.interactiveStories,
      icon: BookStackIcon,
      description: t.hero.slideStoriesDesc,
      bgColor: 'from-blue-400 to-purple-500',
    },
    {
      id: 2,
      title: t.features.musicInstruments,
      icon: MusicalNoteIcon,
      description: t.hero.slideMusicDesc,
      bgColor: 'from-brand-blue to-brand-teal',
    },
    {
      id: 3,
      title: t.features.spellingLiteracy,
      icon: SpellingIcon,
      description: t.hero.slideSpellingDesc,
      bgColor: 'from-teal-400 to-emerald-500',
    },
    {
      id: 4,
      title: t.features.emotionalLearning,
      icon: HeartIcon,
      description: t.hero.slideEmotionsDesc,
      bgColor: 'from-pink-400 to-rose-500',
    },
    {
      id: 5,
      title: t.features.realWorldBridge,
      icon: SunIcon,
      description: t.hero.slideBridgeDesc,
      bgColor: 'from-amber-400 to-orange-500',
    },
  ];

  const badges = [
    t.hero.badge5in1,
    t.hero.badgeBridge,
    t.hero.badgeSafe,
    t.hero.badgeCoEngagement,
    t.hero.badgeLanguages,
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % screenshots.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="hero" className="relative min-h-screen bg-gradient-hero overflow-hidden">
      {/* Night sky decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <Stars />

        <Moon className="hidden sm:block absolute top-24 right-[7%] w-28 h-28 sm:w-36 sm:h-36 pointer-events-none" />

        <div className="absolute top-20 left-10 w-64 h-64 bg-brand-teal/15 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-star/10 rounded-full blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'url(/background-home.png)',
            backgroundSize: '600px',
            backgroundPosition: 'center',
            backgroundRepeat: 'repeat',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
          {/* Left Content */}
          <div className="text-white text-center lg:text-left">
            <h1 className="font-rounded text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight mb-6">
              {t.hero.title1} {t.hero.title2}
              <span className="text-star"> {t.hero.title3}</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/85 mb-8 max-w-xl mx-auto lg:mx-0">
              {t.hero.subtitle}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/signup"
                className="font-rounded bg-gradient-sun text-night px-8 py-4 rounded-full font-semibold text-lg shadow-glow hover:-translate-y-1 hover:shadow-lift transition"
              >
                {t.hero.startFreeTrial}
              </Link>
              <Link
                href="#features"
                className="font-rounded border-2 border-white/40 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/10 hover:-translate-y-1 transition flex items-center justify-center gap-2"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {t.hero.exploreLibrary}
              </Link>
            </div>
            <p className="mt-4 text-sm text-white/60">{t.hero.noCreditCard}</p>

            {/* Trust badges */}
            <div className="mt-8 flex flex-wrap gap-3 justify-center lg:justify-start text-white/80 text-sm">
              {badges.map((badge) => (
                <div key={badge} className="flex items-center gap-2 bg-white/10 border border-white/10 px-3 py-1.5 rounded-full">
                  <CheckBadge />
                  {badge}
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Device Carousels */}
          <div className="relative">
            <div className="relative mx-auto w-full max-w-3xl flex items-end gap-8 justify-center lg:justify-end">

              {/* iPad frame mockup */}
              <div className="relative flex-shrink-0 w-full max-w-[400px] sm:w-[400px] lg:w-[480px] lg:max-w-none">
                <div className="bg-[#2B2F55] ring-1 ring-white/10 rounded-[2.5rem] p-3 sm:p-4 shadow-2xl w-full">
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white/20 rounded-full" />

                  <div className="bg-night-deep rounded-[1.5rem] aspect-[4/3] overflow-hidden relative">
                    {screenshots.map((screen, index) => (
                      <div
                        key={screen.id}
                        className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                          index === currentSlide
                            ? 'opacity-100 translate-x-0'
                            : index < currentSlide
                              ? 'opacity-0 -translate-x-full'
                              : 'opacity-0 translate-x-full'
                        }`}
                      >
                        <div className={`w-full h-full bg-gradient-to-br ${screen.bgColor} flex flex-col items-center justify-center text-white p-8`}>
                          <div className="mb-4"><screen.icon className="w-16 h-16 lg:w-20 lg:h-20" /></div>
                          <p className="font-rounded font-semibold text-2xl lg:text-3xl mb-2">{screen.title}</p>
                          <p className="text-white/80 text-lg">{screen.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* iPhone frame mockup */}
              <div className="relative flex-shrink-0 hidden sm:block">
                <div className="bg-[#2B2F55] ring-1 ring-white/10 rounded-[1.5rem] p-1.5 shadow-2xl w-[108px] lg:w-[132px]">
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-8 h-2.5 bg-black/60 rounded-full" />

                  <div className="bg-night-deep rounded-[1.25rem] aspect-[9/19] overflow-hidden relative">
                    {screenshots.map((screen, index) => (
                      <div
                        key={screen.id}
                        className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                          index === currentSlide
                            ? 'opacity-100 translate-x-0'
                            : index < currentSlide
                              ? 'opacity-0 -translate-x-full'
                              : 'opacity-0 translate-x-full'
                        }`}
                      >
                        <div className={`w-full h-full bg-gradient-to-br ${screen.bgColor} flex flex-col items-center justify-center text-white p-2 pt-5`}>
                          <div className="mb-1"><screen.icon className="w-6 h-6 lg:w-7 lg:h-7" /></div>
                          <p className="font-rounded font-semibold text-[9px] lg:text-[10px] mb-0.5">{screen.title}</p>
                          <p className="text-white/80 text-[7px] lg:text-[8px]">{screen.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating storybook cards */}
              <div
                className="absolute -left-6 lg:-left-10 top-1/4 w-16 h-20 bg-cream rounded-2xl shadow-card hidden sm:flex items-center justify-center animate-float"
                style={{ '--float-rotate': '-10deg', animationDuration: '5.5s' } as React.CSSProperties}
              >
                <svg className="w-8 h-8 text-star-deep" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="currentColor"/>
                  <circle cx="8.5" cy="9" r="1.5" fill="white"/>
                  <circle cx="15.5" cy="9" r="1.5" fill="white"/>
                  <path d="M12 17c2.5 0 4.5-1.5 4.5-3.5h-9c0 2 2 3.5 4.5 3.5z" fill="white"/>
                </svg>
              </div>
              <div
                className="absolute -right-2 lg:-right-6 top-1/3 w-16 h-20 bg-cream rounded-2xl shadow-card hidden sm:flex items-center justify-center animate-float"
                style={{ '--float-rotate': '10deg', animationDuration: '6.5s' } as React.CSSProperties}
              >
                <svg className="w-8 h-8 text-brand-teal" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
            </div>

            {/* Carousel indicators */}
            <div className="flex justify-center gap-2 mt-4">
              {screenshots.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlide
                      ? 'bg-star w-6'
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Wave separator */}
      <div className="absolute bottom-0 left-0 right-0 translate-y-px">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="block w-full h-[80px] sm:h-[120px]" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="#FDFAF2"
          />
        </svg>
      </div>
    </section>
  );
}
