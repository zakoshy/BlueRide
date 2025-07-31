import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { PersonalizedHero } from '@/components/landing/personalized-hero';
import { Features } from '@/components/landing/features';
import { HowItWorks } from '@/components/landing/how-it-works';
import { Testimonials } from '@/components/landing/testimonials';
import { Cta } from '@/components/landing/cta';

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header />
      <main className="flex-1">
        <PersonalizedHero />
        <Features />
        <HowItWorks />
        <Testimonials />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
