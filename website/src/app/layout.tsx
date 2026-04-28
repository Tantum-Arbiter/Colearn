import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/i18n/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LanguageSelector from '@/components/LanguageSelector';

export const metadata: Metadata = {
  title: 'earlyroots | Animated Storybooks for Children',
  description: 'Animated storybooks that bring reading to life. Discover safe, ad-free stories children love and parents trust. Start storytime today.',
  keywords: ['children stories', 'animated storybooks', 'kids reading app', 'bedtime stories', 'educational stories'],
  openGraph: {
    title: 'earlyroots | Animated Storybooks for Children',
    description: 'Animated storybooks that bring reading to life.',
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

