import { Header } from '@/components/layout/Header';
import { HeroSection } from '@/components/sections/HeroSection';
import { CityGrid } from '@/components/sections/CityGrid';
import { WorkshopOverview } from '@/components/sections/WorkshopOverview';
import { SpeakerProfiles } from '@/components/sections/SpeakerProfiles';
import { WorkshopAgenda } from '@/components/sections/WorkshopAgenda';
import { PricingSection } from '@/components/sections/PricingSection';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection';
import { FAQSection } from '@/components/sections/FAQSection';
import { CTASection } from '@/components/sections/CTASection';
import { Footer } from '@/components/layout/Footer';

export default function Home() {
  return (
    <main className='min-h-screen bg-background-primary'>
      <Header />
      <HeroSection />
      <CityGrid />
      <WorkshopOverview />
      <SpeakerProfiles />
      <WorkshopAgenda />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  );
}
