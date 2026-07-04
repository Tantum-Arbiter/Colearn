'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { smoothScrollTo, NavItem } from '@/utils/smoothScroll';
import { useLanguage } from '@/i18n/LanguageContext';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingScroll, setPendingScroll] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();

  // Navigation items with translations
  const navItems: NavItem[] = [
    { label: t.header.features, href: '/#features', sectionId: 'features' },
    { label: t.header.howItWorks, href: '/#about', sectionId: 'about' },
    { label: t.header.pricing, href: '/#pricing', sectionId: 'pricing' },
    { label: t.header.faq, href: '/#faq', sectionId: 'faq' },
  ];

  // Handle scroll after navigation completes
  useEffect(() => {
    if (pathname === '/' && pendingScroll) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        smoothScrollTo(pendingScroll);
        setPendingScroll(null);
      }, 100);
    }
  }, [pathname, pendingScroll]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, item: NavItem) => {
    setMobileMenuOpen(false);

    if (!item.sectionId) {
      // External page link (like /educators), let Next.js handle it
      return;
    }

    if (pathname === '/') {
      // Already on home page, just smooth scroll
      e.preventDefault();
      smoothScrollTo(item.sectionId);
    } else {
      // On another page, navigate to home then scroll
      e.preventDefault();
      setPendingScroll(item.sectionId);
      router.push('/');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-cream/90 backdrop-blur-md shadow-soft">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Early Roots"
              className="w-10 h-10 rounded-xl"
            />
            <span className="font-rounded font-semibold text-xl text-brand-deepBlue hidden sm:block">
              Early Roots
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(e, item)}
                className="font-semibold text-ink-soft hover:text-brand-blue transition"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/educators"
              className="text-primary hover:text-primary-dark font-semibold transition"
            >
              {t.header.educators}
            </Link>
            <Link
              href="/signup"
              className="font-rounded bg-gradient-brand text-white px-6 py-2.5 rounded-full font-medium hover:shadow-glow-blue hover:-translate-y-0.5 transition"
            >
              {t.header.startFreeTrial}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-cream-deep"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6 text-brand-text"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-cream-deep">
            <div className="flex flex-col gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item)}
                  className="font-semibold text-ink-soft hover:text-brand-blue py-2"
                >
                  {item.label}
                </Link>
              ))}
              <hr className="border-cream-deep" />
              <Link href="/educators" className="text-primary font-semibold py-2">
                {t.header.educators}
              </Link>
              <Link
                href="/signup"
                className="font-rounded bg-gradient-brand text-white px-6 py-3 rounded-full font-medium text-center"
              >
                {t.header.startFreeTrial}
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

