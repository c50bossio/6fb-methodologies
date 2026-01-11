import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import {
  ArrowRight,
  BookOpen,
  Users,
  GraduationCap,
  Calculator,
  BarChart3,
  FileText,
  CheckCircle,
  Star,
} from 'lucide-react';

export default function Home() {
  return (
    <main className='min-h-screen bg-background-primary'>
      <Header />

      {/* Hero Section */}
      <section className='relative min-h-screen flex items-center justify-center overflow-hidden pt-20'>
        <div className='absolute inset-0 bg-gradient-to-br from-background-primary via-background-secondary to-background-primary opacity-30' />
        <div className='container mx-auto px-4 relative z-10 text-center'>
          <h1 className='text-5xl md:text-7xl font-bold text-white mb-6'>
            The <span className='text-tomb45-green'>Chris Bossio</span>{' '}
            Ecosystem
          </h1>
          <p className='text-xl md:text-2xl text-zinc-300 mb-8 max-w-3xl mx-auto'>
            Transform your barbershop business with proven systems, powerful
            tools, and a thriving community of six-figure barbers.
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Link href='/app/signin'>
              <Button size='xl' className='group shadow-green-glow'>
                Get Started
                <ArrowRight className='ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform' />
              </Button>
            </Link>
            <Button
              variant='outline'
              size='xl'
              className='bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20'
            >
              Explore Offerings
            </Button>
          </div>
        </div>
      </section>

      {/* The Bossio Standard */}
      <section id='bossio-standard' className='py-20 bg-background-secondary'>
        <div className='container mx-auto px-4'>
          <div className='text-center mb-16'>
            <h2 className='text-4xl md:text-5xl font-bold text-white mb-4'>
              The Bossio Standard
            </h2>
            <p className='text-xl text-zinc-300 max-w-2xl mx-auto'>
              A proven methodology for building a six-figure barbershop business
              through systems, metrics, and accountability.
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto'>
            <div className='bg-background-primary border border-zinc-800 rounded-xl p-8 text-center'>
              <div className='w-16 h-16 bg-tomb45-green/20 rounded-full flex items-center justify-center mx-auto mb-4'>
                <BarChart3 className='w-8 h-8 text-tomb45-green' />
              </div>
              <h3 className='text-2xl font-semibold text-white mb-3'>
                Clear KPIs
              </h3>
              <p className='text-zinc-400'>
                Track the metrics that matter: revenue, rebooking rate, average
                ticket, and profit margins.
              </p>
            </div>

            <div className='bg-background-primary border border-zinc-800 rounded-xl p-8 text-center'>
              <div className='w-16 h-16 bg-tomb45-green/20 rounded-full flex items-center justify-center mx-auto mb-4'>
                <CheckCircle className='w-8 h-8 text-tomb45-green' />
              </div>
              <h3 className='text-2xl font-semibold text-white mb-3'>
                Proven Systems
              </h3>
              <p className='text-zinc-400'>
                Marketing, operations, and wealth-building strategies that have
                helped thousands of barbers succeed.
              </p>
            </div>

            <div className='bg-background-primary border border-zinc-800 rounded-xl p-8 text-center'>
              <div className='w-16 h-16 bg-tomb45-green/20 rounded-full flex items-center justify-center mx-auto mb-4'>
                <Users className='w-8 h-8 text-tomb45-green' />
              </div>
              <h3 className='text-2xl font-semibold text-white mb-3'>
                Community
              </h3>
              <p className='text-zinc-400'>
                Join a network of driven barbers committed to excellence and
                financial freedom.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Book */}
      <section id='book' className='py-20 bg-background-primary'>
        <div className='container mx-auto px-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto'>
            <div>
              <h2 className='text-4xl md:text-5xl font-bold text-white mb-6'>
                The Book
              </h2>
              <p className='text-xl text-zinc-300 mb-6'>
                Discover the complete framework for building a six-figure
                barbershop business in Chris Bossio&apos;s comprehensive guide.
              </p>
              <ul className='space-y-4 mb-8'>
                <li className='flex items-start gap-3'>
                  <CheckCircle className='w-6 h-6 text-tomb45-green mt-1 flex-shrink-0' />
                  <span className='text-zinc-300'>
                    Step-by-step systems for growth
                  </span>
                </li>
                <li className='flex items-start gap-3'>
                  <CheckCircle className='w-6 h-6 text-tomb45-green mt-1 flex-shrink-0' />
                  <span className='text-zinc-300'>
                    Marketing strategies that work
                  </span>
                </li>
                <li className='flex items-start gap-3'>
                  <CheckCircle className='w-6 h-6 text-tomb45-green mt-1 flex-shrink-0' />
                  <span className='text-zinc-300'>
                    Wealth-building principles
                  </span>
                </li>
                <li className='flex items-start gap-3'>
                  <CheckCircle className='w-6 h-6 text-tomb45-green mt-1 flex-shrink-0' />
                  <span className='text-zinc-300'>
                    Real success stories and case studies
                  </span>
                </li>
              </ul>
              <Button size='lg' className='group'>
                Get the Book
                <BookOpen className='ml-2 w-5 h-5' />
              </Button>
            </div>
            <div className='flex justify-center'>
              <div className='w-full max-w-sm bg-zinc-800 border border-zinc-700 rounded-lg p-8 text-center'>
                <BookOpen className='w-24 h-24 text-tomb45-green mx-auto mb-4' />
                <p className='text-zinc-400'>Book cover placeholder</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6FB Mentorship */}
      <section id='mentorship' className='py-20 bg-background-secondary'>
        <div className='container mx-auto px-4'>
          <div className='text-center mb-16'>
            <h2 className='text-4xl md:text-5xl font-bold text-white mb-4'>
              6FB Mentorship
            </h2>
            <p className='text-xl text-zinc-300 max-w-2xl mx-auto'>
              Join the elite community of six-figure barbers with access to
              coaching, accountability, and proven systems.
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12'>
            <div className='bg-background-primary border border-zinc-800 rounded-xl p-6'>
              <h3 className='text-xl font-semibold text-white mb-4'>
                What&apos;s Included
              </h3>
              <ul className='space-y-3'>
                <li className='flex items-start gap-3'>
                  <CheckCircle className='w-5 h-5 text-tomb45-green mt-0.5 flex-shrink-0' />
                  <span className='text-zinc-300'>Weekly coaching calls</span>
                </li>
                <li className='flex items-start gap-3'>
                  <CheckCircle className='w-5 h-5 text-tomb45-green mt-0.5 flex-shrink-0' />
                  <span className='text-zinc-300'>
                    Access to all productivity apps
                  </span>
                </li>
                <li className='flex items-start gap-3'>
                  <CheckCircle className='w-5 h-5 text-tomb45-green mt-0.5 flex-shrink-0' />
                  <span className='text-zinc-300'>Private Skool community</span>
                </li>
                <li className='flex items-start gap-3'>
                  <CheckCircle className='w-5 h-5 text-tomb45-green mt-0.5 flex-shrink-0' />
                  <span className='text-zinc-300'>
                    Exclusive workshops and events
                  </span>
                </li>
                <li className='flex items-start gap-3'>
                  <CheckCircle className='w-5 h-5 text-tomb45-green mt-0.5 flex-shrink-0' />
                  <span className='text-zinc-300'>
                    AI Coach for personalized guidance
                  </span>
                </li>
              </ul>
            </div>

            <div className='bg-background-primary border border-zinc-800 rounded-xl p-6'>
              <h3 className='text-xl font-semibold text-white mb-4'>
                Who It&apos;s For
              </h3>
              <ul className='space-y-3'>
                <li className='flex items-start gap-3'>
                  <ArrowRight className='w-5 h-5 text-tomb45-green mt-0.5 flex-shrink-0' />
                  <span className='text-zinc-300'>
                    Barbers ready to scale to 6 figures
                  </span>
                </li>
                <li className='flex items-start gap-3'>
                  <ArrowRight className='w-5 h-5 text-tomb45-green mt-0.5 flex-shrink-0' />
                  <span className='text-zinc-300'>
                    Shop owners wanting systems
                  </span>
                </li>
                <li className='flex items-start gap-3'>
                  <ArrowRight className='w-5 h-5 text-tomb45-green mt-0.5 flex-shrink-0' />
                  <span className='text-zinc-300'>
                    Entrepreneurs seeking accountability
                  </span>
                </li>
                <li className='flex items-start gap-3'>
                  <ArrowRight className='w-5 h-5 text-tomb45-green mt-0.5 flex-shrink-0' />
                  <span className='text-zinc-300'>
                    Anyone committed to excellence
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Skool Community */}
      <section id='skool' className='py-20 bg-background-primary'>
        <div className='container mx-auto px-4 text-center'>
          <h2 className='text-4xl md:text-5xl font-bold text-white mb-6'>
            Join the Skool Community
          </h2>
          <p className='text-xl text-zinc-300 mb-8 max-w-2xl mx-auto'>
            Connect with thousands of barbers in our private Skool community.
            Share wins, get support, and grow together.
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Button size='lg' className='group'>
              Join Skool Community
              <Users className='ml-2 w-5 h-5' />
            </Button>
          </div>
        </div>
      </section>

      {/* Free School */}
      <section id='free-school' className='py-20 bg-background-secondary'>
        <div className='container mx-auto px-4 text-center'>
          <h2 className='text-4xl md:text-5xl font-bold text-white mb-6'>
            The Free School
          </h2>
          <p className='text-xl text-zinc-300 mb-8 max-w-2xl mx-auto'>
            Access free educational resources, tutorials, and training to start
            your journey to six figures.
          </p>
          <Button
            size='lg'
            variant='outline'
            className='group border-tomb45-green text-tomb45-green hover:bg-tomb45-green hover:text-black'
          >
            Access Free Resources
            <GraduationCap className='ml-2 w-5 h-5' />
          </Button>
        </div>
      </section>

      {/* App Ecosystem */}
      <section id='apps' className='py-20 bg-background-primary'>
        <div className='container mx-auto px-4'>
          <div className='text-center mb-16'>
            <h2 className='text-4xl md:text-5xl font-bold text-white mb-4'>
              Powerful Apps for Your Business
            </h2>
            <p className='text-xl text-zinc-300 max-w-2xl mx-auto'>
              Choose individual apps or get full access with 6FB Membership
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto'>
            {/* Calculator */}
            <div className='bg-background-secondary border border-zinc-800 rounded-xl p-8 hover:border-tomb45-green transition-colors'>
              <div className='w-16 h-16 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4'>
                <Calculator className='w-8 h-8 text-blue-500' />
              </div>
              <h3 className='text-2xl font-semibold text-white mb-3'>
                Booth vs Suite Calculator
              </h3>
              <p className='text-zinc-400 mb-6'>
                Make informed decisions about booth rental vs suite ownership
                with detailed financial projections.
              </p>
              <Link href='/app/dashboard'>
                <Button variant='outline' className='w-full'>
                  Learn More
                </Button>
              </Link>
            </div>

            {/* Command Center */}
            <div className='bg-background-secondary border border-zinc-800 rounded-xl p-8 hover:border-tomb45-green transition-colors'>
              <div className='w-16 h-16 bg-tomb45-green/20 rounded-lg flex items-center justify-center mb-4'>
                <BarChart3 className='w-8 h-8 text-tomb45-green' />
              </div>
              <h3 className='text-2xl font-semibold text-white mb-3'>
                6FB Command Center
              </h3>
              <p className='text-zinc-400 mb-6'>
                Track KPIs, get AI coaching, compete on the leaderboard, and
                manage your business with powerful analytics.
              </p>
              <Link href='/app/dashboard'>
                <Button variant='outline' className='w-full'>
                  Learn More
                </Button>
              </Link>
            </div>

            {/* Content Generator */}
            <div className='bg-background-secondary border border-zinc-800 rounded-xl p-8 hover:border-tomb45-green transition-colors'>
              <div className='w-16 h-16 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4'>
                <FileText className='w-8 h-8 text-purple-500' />
              </div>
              <h3 className='text-2xl font-semibold text-white mb-3'>
                Content Generator
              </h3>
              <p className='text-zinc-400 mb-6'>
                AI-powered content creation for social media, marketing, and
                client communication.
              </p>
              <div className='bg-tomb45-green/20 border border-tomb45-green/40 rounded-lg px-3 py-2 text-sm text-tomb45-green text-center'>
                6FB Members Only
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id='pricing' className='py-20 bg-background-secondary'>
        <div className='container mx-auto px-4'>
          <div className='text-center mb-16'>
            <h2 className='text-4xl md:text-5xl font-bold text-white mb-4'>
              Choose Your Plan
            </h2>
            <p className='text-xl text-zinc-300'>
              Select the option that fits your needs
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-4 gap-6 max-w-7xl mx-auto'>
            {/* Single App */}
            <div className='bg-background-primary border border-zinc-800 rounded-xl p-6'>
              <h3 className='text-xl font-semibold text-white mb-2'>
                Single App
              </h3>
              <div className='text-3xl font-bold text-white mb-4'>
                $10<span className='text-lg text-zinc-400'>/mo</span>
              </div>
              <ul className='space-y-3 mb-6'>
                <li className='flex items-start gap-2'>
                  <CheckCircle className='w-5 h-5 text-tomb45-green mt-0.5' />
                  <span className='text-zinc-300 text-sm'>Access to 1 app</span>
                </li>
                <li className='flex items-start gap-2'>
                  <CheckCircle className='w-5 h-5 text-tomb45-green mt-0.5' />
                  <span className='text-zinc-300 text-sm'>Basic support</span>
                </li>
              </ul>
              <Link href='/app/signin'>
                <Button variant='outline' className='w-full'>
                  Choose App
                </Button>
              </Link>
            </div>

            {/* 2-App Bundle */}
            <div className='bg-background-primary border border-zinc-800 rounded-xl p-6'>
              <h3 className='text-xl font-semibold text-white mb-2'>
                2-App Bundle
              </h3>
              <div className='text-3xl font-bold text-white mb-4'>
                $18<span className='text-lg text-zinc-400'>/mo</span>
              </div>
              <ul className='space-y-3 mb-6'>
                <li className='flex items-start gap-2'>
                  <CheckCircle className='w-5 h-5 text-tomb45-green mt-0.5' />
                  <span className='text-zinc-300 text-sm'>
                    Access to 2 apps
                  </span>
                </li>
                <li className='flex items-start gap-2'>
                  <CheckCircle className='w-5 h-5 text-tomb45-green mt-0.5' />
                  <span className='text-zinc-300 text-sm'>
                    Priority support
                  </span>
                </li>
              </ul>
              <Link href='/app/signin'>
                <Button variant='outline' className='w-full'>
                  Get Bundle
                </Button>
              </Link>
            </div>

            {/* 3-App Bundle */}
            <div className='bg-background-primary border border-zinc-800 rounded-xl p-6'>
              <h3 className='text-xl font-semibold text-white mb-2'>
                3-App Bundle
              </h3>
              <div className='text-3xl font-bold text-white mb-4'>
                $25<span className='text-lg text-zinc-400'>/mo</span>
              </div>
              <ul className='space-y-3 mb-6'>
                <li className='flex items-start gap-2'>
                  <CheckCircle className='w-5 h-5 text-tomb45-green mt-0.5' />
                  <span className='text-zinc-300 text-sm'>
                    Access to all 3 apps
                  </span>
                </li>
                <li className='flex items-start gap-2'>
                  <CheckCircle className='w-5 h-5 text-tomb45-green mt-0.5' />
                  <span className='text-zinc-300 text-sm'>
                    Priority support
                  </span>
                </li>
              </ul>
              <Link href='/app/signin'>
                <Button variant='outline' className='w-full'>
                  Get Bundle
                </Button>
              </Link>
            </div>

            {/* 6FB Membership */}
            <div className='bg-tomb45-green/10 border-2 border-tomb45-green rounded-xl p-6 relative'>
              <div className='absolute -top-4 left-1/2 transform -translate-x-1/2 bg-tomb45-green text-black px-4 py-1 rounded-full text-sm font-semibold'>
                BEST VALUE
              </div>
              <h3 className='text-xl font-semibold text-white mb-2'>
                6FB Membership
              </h3>
              <div className='text-3xl font-bold text-white mb-4'>
                $197<span className='text-lg text-zinc-400'>/mo</span>
              </div>
              <ul className='space-y-3 mb-6'>
                <li className='flex items-start gap-2'>
                  <CheckCircle className='w-5 h-5 text-tomb45-green mt-0.5' />
                  <span className='text-zinc-300 text-sm'>
                    All 3 apps included
                  </span>
                </li>
                <li className='flex items-start gap-2'>
                  <CheckCircle className='w-5 h-5 text-tomb45-green mt-0.5' />
                  <span className='text-zinc-300 text-sm'>
                    Skool community access
                  </span>
                </li>
                <li className='flex items-start gap-2'>
                  <CheckCircle className='w-5 h-5 text-tomb45-green mt-0.5' />
                  <span className='text-zinc-300 text-sm'>
                    Weekly coaching calls
                  </span>
                </li>
                <li className='flex items-start gap-2'>
                  <CheckCircle className='w-5 h-5 text-tomb45-green mt-0.5' />
                  <span className='text-zinc-300 text-sm'>
                    Exclusive workshops
                  </span>
                </li>
              </ul>
              <Link href='/app/signin'>
                <Button className='w-full bg-tomb45-green hover:bg-tomb45-green/90 text-black'>
                  Join 6FB
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id='testimonials' className='py-20 bg-background-primary'>
        <div className='container mx-auto px-4'>
          <div className='text-center mb-16'>
            <h2 className='text-4xl md:text-5xl font-bold text-white mb-4'>
              Success Stories
            </h2>
            <p className='text-xl text-zinc-300'>
              Hear from barbers who transformed their businesses
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto'>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className='bg-background-secondary border border-zinc-800 rounded-xl p-6'
              >
                <div className='flex gap-1 mb-4'>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className='w-5 h-5 fill-tomb45-green text-tomb45-green'
                    />
                  ))}
                </div>
                <p className='text-zinc-300 mb-6'>
                  &ldquo;The Bossio Standard completely changed how I run my shop. I
                  went from struggling to hit $5k/month to consistently doing
                  $15k+.&rdquo;
                </p>
                <div className='flex items-center gap-3'>
                  <div className='w-12 h-12 bg-zinc-700 rounded-full' />
                  <div>
                    <div className='font-semibold text-white'>Barber Name</div>
                    <div className='text-sm text-zinc-400'>City, State</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='py-20 bg-tomb45-green/10'>
        <div className='container mx-auto px-4 text-center'>
          <h2 className='text-4xl md:text-5xl font-bold text-white mb-6'>
            Ready to Transform Your Business?
          </h2>
          <p className='text-xl text-zinc-300 mb-8 max-w-2xl mx-auto'>
            Join thousands of barbers who have built six-figure businesses with
            the Bossio Standard.
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Link href='/app/signin'>
              <Button size='xl' className='group shadow-green-glow'>
                Get Started Now
                <ArrowRight className='ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform' />
              </Button>
            </Link>
            <Button
              variant='outline'
              size='xl'
              className='border-white text-white hover:bg-white hover:text-black'
            >
              Schedule a Call
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
