import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/i18n/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LanguageSelector from '@/components/LanguageSelector';

export const metadata: Metadata = {
  title: 'earlyroots | Stories, Music & Early Learning for Ages 0–6',
  description: 'The all-in-one early learning app for ages 0–6. Interactive stories, musical instruments, spelling games, emotional intelligence — safe, ad-free, and designed for parent-child co-engagement.',
  keywords: ['early learning app', 'children stories', 'kids music instruments', 'spelling games for kids', 'emotional learning', 'educational app', 'screen time management', 'parent child app'],
  openGraph: {
    title: 'earlyroots | Stories, Music & Early Learning for Ages 0–6',
    description: 'Five learning experiences in one calm, beautiful app. Stories, music, spelling, emotions, and numbers — designed for families.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <LanguageProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <LanguageSelector />
        </LanguageProvider>
      </body>
    </html>
  );
}

