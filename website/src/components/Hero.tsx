'use client';

import Link from 'next/link';
import { useState, useEffect, ReactNode } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';

const BookStackIcon = ({ className = "w-16 h-16 lg:w-20 lg:h-20" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);

const BookOpenIcon = ({ className = "w-16 h-16 lg:w-20 lg:h-20" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const ChartBarIcon = ({ className = "w-16 h-16 lg:w-20 lg:h-20" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const MoonIcon = ({ className = "w-16 h-16 lg:w-20 lg:h-20" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
  </svg>
);

interface Screenshot {
  id: number;
  title: string;
  icon: (props: { className?: string }) => ReactNode;
  description: string;
  bgColor: string;
}

const screenshots: Screenshot[] = [
  {
    id: 1,
    title: 'Story Library',
    icon: BookStackIcon,
    description: 'Browse our collection',
    bgColor: 'from-blue-400 to-purple-500',
  },
  {
    id: 2,
    title: 'Reading Mode',
    icon: BookOpenIcon,
    description: 'Immersive storytelling',
    bgColor: 'from-brand-blue to-brand-teal',
  },
  {
    id: 3,
    title: 'Parent Dashboard',
    icon: ChartBarIcon,
    description: 'Track screen time',
    bgColor: 'from-teal-400 to-emerald-500',
  },
  {
    id: 4,
    title: 'Bedtime Stories',
    icon: MoonIcon,
    description: 'Calm wind-down mode',
    bgColor: 'from-indigo-500 to-purple-600',
  },
];

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { t } = useLanguage();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % screenshots.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="hero" className="relative min-h-screen bg-gradient-hero overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-64 h-64 bg-brand-teal/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl" />

        {/* Children's toys texture background image - covers entire hero */}
        <div
          className="absolute inset-0 opacity-[0.09] pointer-events-none"
          style={{
            backgroundImage: 'url(/background-home.png)',
            backgroundSize: '600px',
            backgroundPosition: 'center',
            backgroundRepeat: 'repeat',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
          {/* Left Content */}
          <div className="text-white text-center lg:text-left">
            <h1 className="font-rounded text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              {t.hero.title1} {t.hero.title2}
              <span className="text-brand-teal"> {t.hero.title3}</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/80 mb-8 max-w-xl mx-auto lg:mx-0">
              {t.hero.subtitle}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/signup"
                className="bg-white text-primary-dark px-8 py-4 rounded-full font-semibold text-lg hover:bg-brand-teal hover:text-white transition shadow-lg hover:shadow-xl"
              >
                {t.hero.startFreeTrial}
              </Link>
              <Link
                href="#demo"
                className="border-2 border-white/50 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/10 transition flex items-center justify-center gap-2"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {t.hero.exploreLibrary}
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-10 flex flex-wrap gap-4 justify-center lg:justify-start text-white/70 text-sm">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Research-Backed
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Screen Time Controls
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Ad-free & Safe
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Educator-Informed
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Parent-Guided Play
              </div>
            </div>
          </div>

          {/* Right Content - Device Carousels */}
          <div className="relative lg:translate-x-12 xl:translate-x-16">
            <div className="relative mx-auto w-full max-w-3xl flex items-end gap-8 justify-center lg:justify-end">

              {/* iPad frame mockup - larger */}
              <div className="relative flex-shrink-0">
                <div className="bg-gray-800 rounded-[2.5rem] p-4 shadow-2xl w-[400px] lg:w-[480px]">
                  {/* Camera notch */}
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-gray-600 rounded-full" />

                  {/* Screen */}
                  <div className="bg-gray-900 rounded-[1.5rem] aspect-[4/3] overflow-hidden relative">
                    {/* Carousel slides */}
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
                          <p className="font-rounded font-bold text-2xl lg:text-3xl mb-2">{screen.title}</p>
                          <p className="text-white/70 text-lg">{screen.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* iPhone frame mockup - 25% smaller */}
              <div className="relative flex-shrink-0">
                <div className="bg-gray-800 rounded-[1.5rem] p-1.5 shadow-2xl w-[108px] lg:w-[132px]">
                  {/* Dynamic Island */}
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-8 h-2.5 bg-black rounded-full" />

                  {/* Screen */}
                  <div className="bg-gray-900 rounded-[1.25rem] aspect-[9/19] overflow-hidden relative">
                    {/* Carousel slides */}
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
                          <p className="font-rounded font-bold text-[9px] lg:text-[10px] mb-0.5">{screen.title}</p>
                          <p className="text-white/70 text-[7px] lg:text-[8px]">{screen.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Floating book cards */}
              <div className="absolute -left-16 lg:-left-20 top-1/4 w-16 h-20 bg-white rounded-lg shadow-lg transform -rotate-12 flex items-center justify-center animate-bounce" style={{ animationDuration: '3s' }}>
                <svg className="w-8 h-8 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="currentColor"/>
                  <circle cx="8.5" cy="9" r="1.5" fill="white"/>
                  <circle cx="15.5" cy="9" r="1.5" fill="white"/>
                  <path d="M12 17c2.5 0 4.5-1.5 4.5-3.5h-9c0 2 2 3.5 4.5 3.5z" fill="white"/>
                </svg>
              </div>
              <div className="absolute -right-16 lg:-right-20 top-1/3 w-16 h-20 bg-white rounded-lg shadow-lg transform rotate-12 flex items-center justify-center animate-bounce" style={{ animationDuration: '3.5s' }}>
                <svg className="w-8 h-8 text-brand-teal" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
            </div>

            {/* Carousel indicators - centered below devices */}
            <div className="flex justify-center gap-2 mt-4">
              {screenshots.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlide
                      ? 'bg-white w-6'
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
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="white"
          />
        </svg>
      </div>
    </section>
  );
}

