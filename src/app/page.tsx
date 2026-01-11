import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { EcosystemHero } from '@/components/sections/ecosystem/EcosystemHero';
import { BossioStandardCards } from '@/components/sections/ecosystem/BossioStandardCards';
import { AppsGrid } from '@/components/sections/ecosystem/AppsGrid';
import { PricingCards } from '@/components/sections/ecosystem/PricingCards';
import { CommunityCards } from '@/components/sections/ecosystem/CommunityCards';
import { SuccessStories } from '@/components/sections/ecosystem/SuccessStories';
import { FinalCTA } from '@/components/sections/ecosystem/FinalCTA';

export const metadata = {
  title: 'Chris Bossio Ecosystem | Transform Your Barber Business',
  description:
    'Build a six-figure barbershop business with proven systems, AI-powered tools, and community support. Join 2,000+ successful barbers in the 6FB ecosystem.',
  keywords:
    'barber business, six figure barber, barbershop management, barber coaching, barber apps, Chris Bossio',
  openGraph: {
    title: 'Chris Bossio Ecosystem | Transform Your Barber Business',
    description:
      'Build a six-figure barbershop business with proven systems, AI-powered tools, and community support.',
    type: 'website',
  },
};

export default function Home() {
  return (
    <main id='main-content' className='min-h-screen bg-black'>
      <Header />
      <EcosystemHero />
      <BossioStandardCards />
      <AppsGrid />
      <PricingCards />
      <CommunityCards />
      <SuccessStories />
      <FinalCTA />
      <Footer />
    </main>
  );
}
