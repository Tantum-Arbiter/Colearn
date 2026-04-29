'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';

const SparklesIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

const HeadphonesIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
  </svg>
);

const BookOpenIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const BeakerIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 5.96c.167.708-.28 1.427-.987 1.594a18.01 18.01 0 01-8.43 0c-.708-.167-1.154-.886-.987-1.594l1.402-5.96m12.6 0a18.138 18.138 0 00-12.6 0" />
  </svg>
);

const AcademicCapIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
  </svg>
);

const HeartIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
);

const MusicalNoteIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V4.5A2.25 2.25 0 0016.5 2.25H15M3.75 21h16.5M3.75 21v-3.675a2.25 2.25 0 011.53-2.137l.217-.065M3.75 21h.008v.008H3.75V21zm.375-3.81a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

const DevicePhoneMobileIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
  </svg>
);

// Index of the Original Music card
const MUSIC_CARD_INDEX = 7;

export default function Features() {
  const [flippedIndex, setFlippedIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { t } = useLanguage();

  const features = [
    {
      icon: <SparklesIcon />,
      title: t.features.gentleAnimation,
      description: t.features.gentleAnimationDesc,
      backContent: t.features.gentleAnimationBack,
    },
    {
      icon: <HeadphonesIcon />,
      title: t.features.professionalNarration,
      description: t.features.professionalNarrationDesc,
      backContent: t.features.professionalNarrationBack,
    },
    {
      icon: <BookOpenIcon />,
      title: t.features.readAlongText,
      description: t.features.readAlongTextDesc,
      backContent: t.features.readAlongTextBack,
    },
    {
      icon: <ClockIcon />,
      title: t.features.screenTimeControls,
      description: t.features.screenTimeControlsDesc,
      backContent: t.features.screenTimeControlsBack,
    },
    {
      icon: <BeakerIcon />,
      title: t.features.researchBacked,
      description: t.features.researchBackedDesc,
      backContent: t.features.researchBackedBack,
    },
    {
      icon: <AcademicCapIcon />,
      title: t.features.educatorInformed,
      description: t.features.educatorInformedDesc,
      backContent: t.features.educatorInformedBack,
    },
    {
      icon: <HeartIcon />,
      title: t.features.socialEmotional,
      description: t.features.socialEmotionalDesc,
      backContent: t.features.socialEmotionalBack,
    },
    {
      icon: <MusicalNoteIcon />,
      title: t.features.originalMusic,
      description: t.features.originalMusicDesc,
      backContent: t.features.originalMusicBack,
    },
    {
      icon: <DevicePhoneMobileIcon />,
      title: t.features.offlineAccess,
      description: t.features.offlineAccessDesc,
      backContent: t.features.offlineAccessBack,
    },
  ];

  // Initialize audio on mount
  useEffect(() => {
    audioRef.current = new Audio('/background-music-preview.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.5;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Stop audio when music card is flipped back
  useEffect(() => {
    if (flippedIndex !== MUSIC_CARD_INDEX && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [flippedIndex, isPlaying]);

  const handleCardClick = (index: number) => {
    setFlippedIndex(flippedIndex === index ? null : index);
  };

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card flip
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="font-rounded text-3xl sm:text-4xl font-bold text-brand-text mb-4">
            {t.features.title} <span className="text-primary">{t.features.titleHighlight}</span> {t.features.titleEnd}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            {t.features.subtitle}
          </p>

          {/* App Store Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {/* Apple App Store */}
            <a
              href="https://apps.apple.com/app/grow-with-freya"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors"
            >
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div className="text-left">
                <div className="text-xs">{t.features.downloadOn}</div>
                <div className="text-lg font-semibold -mt-1">App Store</div>
              </div>
            </a>

            {/* Google Play Store */}
            <a
              href="https://play.google.com/store/apps/details?id=com.growwithfreya"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors"
            >
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/>
              </svg>
              <div className="text-left">
                <div className="text-xs">{t.features.getItOn}</div>
                <div className="text-lg font-semibold -mt-1">Google Play</div>
              </div>
            </a>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const isFlipped = flippedIndex === index;
            return (
              <div
                key={index}
                className="perspective-1000 h-64 cursor-pointer"
                onClick={() => handleCardClick(index)}
              >
                <div
                  className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
                    isFlipped ? 'rotate-y-180' : ''
                  }`}
                >
                  {/* Front Face */}
                  <div
                    className={`absolute inset-0 backface-hidden rounded-3xl p-8 transition-colors duration-300 ${
                      isFlipped ? 'bg-gray-50' : 'bg-gray-50 hover:bg-gradient-brand group'
                    }`}
                  >
                    <div className={`mb-4 text-primary ${!isFlipped ? 'group-hover:text-white' : ''}`}>
                      {feature.icon}
                    </div>
                    <h3 className={`font-rounded font-semibold text-xl mb-3 ${!isFlipped ? 'group-hover:text-white' : ''}`}>
                      {feature.title}
                    </h3>
                    <p className={`text-gray-600 ${!isFlipped ? 'group-hover:text-white/80' : ''}`}>
                      {feature.description}
                    </p>
                    <div className={`absolute bottom-4 right-4 text-xs text-gray-400 ${!isFlipped ? 'group-hover:text-white/60' : ''}`}>
                      {t.features.tapToLearnMore}
                    </div>
                  </div>

                  {/* Back Face */}
                  <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl p-8 bg-gradient-brand text-white overflow-hidden">
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
                    <div className="relative h-full flex flex-col">
                      <div className="mb-3 text-white">{feature.icon}</div>
                      <h3 className="font-rounded font-semibold text-lg mb-3">
                        {feature.title}
                      </h3>

                      {/* Special content for Original Music card */}
                      {index === MUSIC_CARD_INDEX ? (
                        <>
                          <p className="text-white/90 text-sm mb-4">
                            {t.features.listenToSample}
                          </p>
                          <button
                            onClick={toggleAudio}
                            className="flex items-center justify-center gap-3 bg-white/20 hover:bg-white/30 transition-colors rounded-full py-3 px-6 mx-auto"
                          >
                            {isPlaying ? (
                              <>
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                </svg>
                                <span className="font-semibold">{t.features.pause}</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                                <span className="font-semibold">{t.features.playMusic}</span>
                              </>
                            )}
                          </button>
                          <p className="text-white/60 text-xs text-center mt-3">
                            {isPlaying ? t.features.nowPlaying : t.features.tapToPreview}
                          </p>
                        </>
                      ) : (
                        <p className="text-white/90 text-sm flex-grow">
                          {feature.backContent}
                        </p>
                      )}

                      <div className="text-xs text-white/60 mt-2">
                        {t.features.tapToFlipBack}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

