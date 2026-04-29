import Hero from '@/components/Hero';
import Features from '@/components/Features';
import About from '@/components/ParentGuidance';
import ResearchBacked from '@/components/ResearchBacked';
import Pricing from '@/components/Pricing';
import Testimonials from '@/components/Testimonials';
import FAQ from '@/components/FAQ';
import CTA from '@/components/CTA';

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <About />
      <ResearchBacked />
      <Pricing />
      <Testimonials />
      <FAQ />
      <CTA />
    </>
  );
}

