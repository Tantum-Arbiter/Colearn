'use client';

import Link from 'next/link';
import { useLanguage } from '@/i18n/LanguageContext';

const MapIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m0-15l6.75 1.875M9 15l6.75 1.875m0-12.75V18.75l-6.75 1.875M15.75 18.75l6.75 1.875V6.75L15.75 4.875M15.75 4.875L9 3M9 3v12" />
  </svg>
);

const UserGroupIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
  </svg>
);

const AdjustmentsIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
  </svg>
);

const ChatBubbleIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
  </svg>
);

const FoxIcon = () => (
  <svg className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
  </svg>
);

export default function About() {
  const { t } = useLanguage();

  const guidanceFeatures = [
    {
      icon: <MapIcon />,
      title: t.parentGuidance.activityGuides,
      description: t.parentGuidance.activityGuidesDesc,
    },
    {
      icon: <UserGroupIcon />,
      title: t.parentGuidance.coPlay,
      description: t.parentGuidance.coPlayDesc,
    },
    {
      icon: <AdjustmentsIcon />,
      title: t.parentGuidance.ageAppropriate,
      description: t.parentGuidance.ageAppropriateDesc,
    },
    {
      icon: <ChatBubbleIcon />,
      title: t.parentGuidance.discussionPrompts,
      description: t.parentGuidance.discussionPromptsDesc,
    },
  ];

  const storySteps = [
    {
      number: '1',
      title: t.parentGuidance.step1Title,
      description: t.parentGuidance.step1Desc,
    },
    {
      number: '2',
      title: t.parentGuidance.step2Title,
      description: t.parentGuidance.step2Desc,
    },
    {
      number: '3',
      title: t.parentGuidance.step3Title,
      description: t.parentGuidance.step3Desc,
    },
  ];

  return (
    <section id="about" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* What is a Freya Story */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          {/* Left Content */}
          <div>
            <h2 className="font-rounded text-3xl sm:text-4xl font-bold text-brand-text mb-6">
              {t.parentGuidance.whatsAFreyaStory} <span className="text-primary">{t.parentGuidance.freyaStory}</span>?
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              {t.parentGuidance.storyIntro}
            </p>

            <div className="space-y-6">
              {storySteps.map((step) => (
                <div key={step.number} className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-teal/20 flex items-center justify-center">
                    <span className="text-xl font-bold text-brand-teal">{step.number}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Visual Demo */}
          <div className="relative">
            <div className="bg-white rounded-3xl shadow-card p-8">
              {/* Simulated book preview */}
              <div className="aspect-video bg-gradient-to-br from-brand-blue to-brand-teal rounded-2xl flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="mb-4 flex justify-center animate-pulse"><FoxIcon /></div>
                    <p className="font-rounded font-bold text-xl">{t.parentGuidance.demoTitle}</p>
                  </div>
                </div>
                {/* Animation indicators */}
                <div className="absolute top-4 right-4 bg-white/20 px-3 py-1 rounded-full text-white text-sm flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {t.parentGuidance.playing}
                </div>
              </div>
              {/* Read-along text preview */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <p className="text-lg text-gray-800">
                  {t.parentGuidance.demoText}
                </p>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -z-10 -bottom-6 -right-6 w-full h-full bg-brand-teal/20 rounded-3xl" />
          </div>
        </div>

        {/* Parent Guidance Section */}
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-card">
          {/* Section Header */}
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
              {t.parentGuidance.parentGuidedPlay}
            </span>
            <h2 className="font-rounded text-3xl sm:text-4xl font-bold text-brand-text mb-4">
              {t.parentGuidance.guideTitle} <span className="text-primary">{t.parentGuidance.guideYou}</span>{t.parentGuidance.soYouCanGuide} <span className="text-secondary">{t.parentGuidance.guideThem}</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t.parentGuidance.guideSubtitle}
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {guidanceFeatures.map((feature, index) => (
              <div
                key={index}
                className="flex gap-4 p-6 bg-gray-50 rounded-2xl hover:bg-blue-50 transition-colors"
              >
                <div className="text-primary flex-shrink-0">{feature.icon}</div>
                <div>
                  <h3 className="font-rounded font-semibold text-lg text-brand-text mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Box */}
          <div className="bg-gradient-brand rounded-2xl p-8 text-center text-white relative overflow-hidden">
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
            <h3 className="font-rounded text-2xl md:text-3xl font-bold mb-4 relative">
              {t.parentGuidance.makeScreenTime}
            </h3>
            <p className="text-white/90 max-w-xl mx-auto mb-6">
              {t.parentGuidance.ctaSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 bg-white text-primary font-semibold px-8 py-3 rounded-full hover:bg-gray-100 transition-colors"
              >
                {t.parentGuidance.startFreeTrial}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center gap-2 bg-white/20 text-white font-semibold px-8 py-3 rounded-full hover:bg-white/30 transition-colors"
              >
                {t.parentGuidance.seeAllFeatures}
              </Link>
            </div>
            <p className="text-white/70 text-sm mt-4">
              {t.parentGuidance.noCreditCard}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

