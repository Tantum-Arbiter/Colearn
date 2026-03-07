'use client';

import Link from 'next/link';
import { useLanguage } from '@/i18n/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-brand-deepBlue text-white relative overflow-hidden">
      {/* Space stars/dots scattered throughout */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top area stars */}
        <div className="absolute top-[5%] left-[10%] w-1 h-1 bg-white rounded-full opacity-60" />
        <div className="absolute top-[8%] left-[25%] w-1.5 h-1.5 bg-white rounded-full opacity-40" />
        <div className="absolute top-[3%] left-[40%] w-1 h-1 bg-white rounded-full opacity-70" />
        <div className="absolute top-[12%] left-[55%] w-2 h-2 bg-white rounded-full opacity-30" />
        <div className="absolute top-[6%] left-[70%] w-1 h-1 bg-white rounded-full opacity-50" />
        <div className="absolute top-[10%] left-[85%] w-1.5 h-1.5 bg-white rounded-full opacity-45" />
        <div className="absolute top-[15%] left-[15%] w-1 h-1 bg-white rounded-full opacity-55" />
        <div className="absolute top-[18%] left-[78%] w-1 h-1 bg-white rounded-full opacity-65" />
        <div className="absolute top-[2%] left-[60%] w-1 h-1 bg-white rounded-full opacity-50" />
        <div className="absolute top-[7%] left-[3%] w-1.5 h-1.5 bg-white rounded-full opacity-45" />
        <div className="absolute top-[14%] left-[48%] w-1 h-1 bg-white rounded-full opacity-60" />
        <div className="absolute top-[4%] left-[95%] w-1 h-1 bg-white rounded-full opacity-55" />

        {/* Middle area stars */}
        <div className="absolute top-[30%] left-[5%] w-1.5 h-1.5 bg-white rounded-full opacity-35" />
        <div className="absolute top-[35%] left-[92%] w-1 h-1 bg-white rounded-full opacity-50" />
        <div className="absolute top-[45%] left-[8%] w-1 h-1 bg-white rounded-full opacity-60" />
        <div className="absolute top-[50%] left-[88%] w-2 h-2 bg-white rounded-full opacity-25" />
        <div className="absolute top-[40%] left-[95%] w-1 h-1 bg-white rounded-full opacity-55" />
        <div className="absolute top-[25%] left-[18%] w-1 h-1 bg-white rounded-full opacity-50" />
        <div className="absolute top-[32%] left-[75%] w-1.5 h-1.5 bg-white rounded-full opacity-40" />
        <div className="absolute top-[48%] left-[22%] w-1 h-1 bg-white rounded-full opacity-55" />
        <div className="absolute top-[38%] left-[58%] w-1 h-1 bg-white rounded-full opacity-45" />
        <div className="absolute top-[55%] left-[3%] w-1 h-1 bg-white rounded-full opacity-60" />
        <div className="absolute top-[42%] left-[35%] w-1.5 h-1.5 bg-white rounded-full opacity-35" />
        <div className="absolute top-[28%] left-[88%] w-1 h-1 bg-white rounded-full opacity-50" />

        {/* Bottom area stars */}
        <div className="absolute top-[70%] left-[12%] w-1 h-1 bg-white rounded-full opacity-45" />
        <div className="absolute top-[75%] left-[30%] w-1.5 h-1.5 bg-white rounded-full opacity-40" />
        <div className="absolute top-[80%] left-[50%] w-1 h-1 bg-white rounded-full opacity-60" />
        <div className="absolute top-[85%] left-[65%] w-2 h-2 bg-white rounded-full opacity-30" />
        <div className="absolute top-[78%] left-[82%] w-1 h-1 bg-white rounded-full opacity-50" />
        <div className="absolute top-[90%] left-[20%] w-1 h-1 bg-white rounded-full opacity-55" />
        <div className="absolute top-[88%] left-[90%] w-1.5 h-1.5 bg-white rounded-full opacity-35" />
        <div className="absolute top-[65%] left-[6%] w-1 h-1 bg-white rounded-full opacity-50" />
        <div className="absolute top-[72%] left-[45%] w-1 h-1 bg-white rounded-full opacity-55" />
        <div className="absolute top-[82%] left-[8%] w-1.5 h-1.5 bg-white rounded-full opacity-40" />
        <div className="absolute top-[92%] left-[55%] w-1 h-1 bg-white rounded-full opacity-60" />
        <div className="absolute top-[68%] left-[92%] w-1 h-1 bg-white rounded-full opacity-45" />
        <div className="absolute top-[95%] left-[75%] w-1 h-1 bg-white rounded-full opacity-50" />
        <div className="absolute top-[86%] left-[38%] w-1 h-1 bg-white rounded-full opacity-55" />
      </div>

      {/* Moon image - centered at top of footer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[15%] w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 pointer-events-none opacity-50">
        <img
          src="/moon-top.webp"
          alt=""
          className="w-full h-full object-contain"
        />
      </div>

      {/* Bear image - centered at bottom of footer */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[10%] w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 pointer-events-none opacity-60">
        <img
          src="/bear-bottom.webp"
          alt=""
          className="w-full h-full object-contain"
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <img
                src="/logo.png"
                alt="Grow with Freya"
                className="w-10 h-10 rounded-xl"
              />
              <span className="font-rounded font-bold text-xl">Grow with Freya</span>
            </Link>
            <p className="text-white/70 max-w-sm">
              {t.footer.tagline}
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-rounded font-semibold mb-4">{t.footer.product}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/#features" className="text-white/70 hover:text-white transition">
                  {t.footer.features}
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="text-white/70 hover:text-white transition">
                  {t.footer.pricing}
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="text-white/70 hover:text-white transition">
                  {t.footer.howItWorks}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-rounded font-semibold mb-4">{t.footer.legal}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/contact" className="text-white/70 hover:text-white transition">
                  {t.footer.contact}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-white/70 hover:text-white transition">
                  {t.footer.privacyPolicy}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-white/70 hover:text-white transition">
                  {t.footer.terms}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/50 text-sm">
            © {new Date().getFullYear()} Grow with Freya. All rights reserved.
          </p>
          <div className="flex gap-4">
            {/* Social Icons */}
            <a href="#" className="text-white/50 hover:text-white transition" aria-label="Instagram">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
            <a href="#" className="text-white/50 hover:text-white transition" aria-label="Facebook">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

