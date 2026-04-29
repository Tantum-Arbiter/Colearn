'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { locales, languageNames, Locale } from '@/i18n/config';

export default function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const { locale, setLocale } = useLanguage();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLanguage = (newLocale: Locale) => {
    setLocale(newLocale);
    setIsOpen(false);
  };

  const currentLanguage = languageNames[locale];

  return (
    <div
      ref={dropdownRef}
      className="fixed bottom-6 right-6 z-50"
    >
      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden min-w-[180px] animate-fade-in">
          <div className="py-2">
            {locales.map((localeCode) => {
              const lang = languageNames[localeCode];
              return (
                <button
                  key={localeCode}
                  onClick={() => handleSelectLanguage(localeCode)}
                  className={`w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                    locale === localeCode ? 'bg-primary/5 text-primary' : 'text-gray-700'
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="text-sm font-medium">{lang.name}</span>
                  {locale === localeCode && (
                    <svg className="w-4 h-4 ml-auto text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-full shadow-lg border border-gray-200 hover:shadow-xl hover:border-primary/30 transition-all duration-200 group"
        aria-label="Select language"
      >
        <svg
          className="w-5 h-5 text-gray-500 group-hover:text-primary transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        <span className="text-sm font-medium text-gray-700">{currentLanguage.flag} {currentLanguage.name}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
}

