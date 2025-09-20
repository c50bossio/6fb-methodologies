import { Metadata } from 'next';

export interface WorkshopSEOData {
  title: string;
  description: string;
  keywords: string[];
  location: string;
  date: string;
  instructors: string[];
  price: {
    currency: string;
    amount: number;
    priceSuffix?: string;
  };
  images: {
    url: string;
    alt: string;
    width?: number;
    height?: number;
  }[];
}

// Core SEO metadata for the workshop
export const WORKSHOP_SEO_DATA: WorkshopSEOData = {
  title: '6FB Methodologies Workshop - Transform Your Barber Business',
  description:
    'Join Dre, Nate, and Bossio for an intensive 2-day workshop designed to take your barbering business to the next level. Learn proven systems, marketing strategies, and wealth-building techniques used by the most successful barbers in the industry.',
  keywords: [
    'barbering workshop',
    'barber business growth',
    'barbershop marketing',
    'barber entrepreneur',
    '6 figure barber',
    'barbering business systems',
    'barber coaching',
    'barbershop profit',
    'barber education',
    'professional development barber',
    'barbering seminar',
    'barber training workshop',
    'business growth barbering',
    'barbershop management',
    'barber success strategies',
  ],
  location: 'Professional Conference Center, Atlanta, GA',
  date: '2026-01-26',
  instructors: ['Dre Baldwin', 'Nate Green', 'Bossio Martinez'],
  price: {
    currency: 'USD',
    amount: 1000,
    priceSuffix: ' (Starting Price)',
  },
  images: [
    {
      url: '/images/workshop-hero.jpg',
      alt: '6FB Methodologies Workshop - Professional barber business training event',
      width: 1200,
      height: 630,
    },
    {
      url: '/images/instructors-team.jpg',
      alt: 'Expert barber business coaches and instructors',
      width: 800,
      height: 600,
    },
  ],
};

// Generate structured data for Google
export function generateWorkshopStructuredData(data: WorkshopSEOData) {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || 'https://6fbmethodologies.com';

  return {
    '@context': 'https://schema.org',
    '@graph': [
      // Main Event
      {
        '@type': 'Event',
        '@id': `${baseUrl}#event`,
        name: data.title,
        description: data.description,
        startDate: `${data.date}T09:00:00-05:00`,
        endDate: `${data.date}T17:00:00-05:00`,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
          '@type': 'Place',
          name: data.location,
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Atlanta',
            addressRegion: 'GA',
            addressCountry: 'US',
          },
        },
        organizer: {
          '@type': 'Organization',
          '@id': `${baseUrl}#organization`,
          name: '6 Figure Barber',
          url: baseUrl,
          logo: `${baseUrl}/images/6fb-logo.png`,
        },
        performer: data.instructors.map(instructor => ({
          '@type': 'Person',
          name: instructor,
        })),
        offers: [
          {
            '@type': 'Offer',
            name: 'General Admission',
            price: data.price.amount,
            priceCurrency: data.price.currency,
            availability: 'https://schema.org/InStock',
            url: `${baseUrl}/register?type=GA`,
            validFrom: new Date().toISOString(),
          },
          {
            '@type': 'Offer',
            name: 'VIP Experience',
            price: data.price.amount * 1.5,
            priceCurrency: data.price.currency,
            availability: 'https://schema.org/InStock',
            url: `${baseUrl}/register?type=VIP`,
            validFrom: new Date().toISOString(),
          },
        ],
        image: data.images.map(img => `${baseUrl}${img.url}`),
        keywords: data.keywords.join(', '),
        audience: {
          '@type': 'Audience',
          audienceType:
            'Professional Barbers, Barbershop Owners, Barber Entrepreneurs',
        },
        educationalLevel: 'Professional Development',
        teaches: [
          'Business Systems and Operations',
          'Marketing and Customer Acquisition',
          'Financial Management and Wealth Building',
          'Leadership and Team Management',
          'Digital Marketing for Barbershops',
        ],
      },

      // Organization
      {
        '@type': 'Organization',
        '@id': `${baseUrl}#organization`,
        name: '6 Figure Barber',
        url: baseUrl,
        logo: {
          '@type': 'ImageObject',
          url: `${baseUrl}/images/6fb-logo.png`,
          width: 200,
          height: 60,
        },
        sameAs: [
          'https://www.instagram.com/6figurebarber',
          'https://www.youtube.com/6figurebarber',
          'https://www.facebook.com/6figurebarber',
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer service',
          email: 'support@6figurebarber.com',
        },
      },

      // Course/Educational Event
      {
        '@type': 'Course',
        '@id': `${baseUrl}#course`,
        name: '6FB Methodologies Workshop',
        description:
          'Comprehensive 2-day business training for barber professionals',
        provider: {
          '@type': 'Organization',
          '@id': `${baseUrl}#organization`,
        },
        courseCode: '6FB-METH-2026',
        educationalCredentialAwarded: 'Certificate of Completion',
        timeRequired: 'P2D',
        coursePrerequisites: 'Active barber license or barbershop ownership',
        syllabus: [
          'Day 1: Business Systems & Marketing Fundamentals',
          'Day 2: Financial Management & Scaling Strategies',
        ],
        teaches: [
          'Barbershop Business Management',
          'Customer Retention Strategies',
          'Revenue Optimization',
          'Digital Marketing',
          'Financial Planning',
        ],
      },

      // FAQ Page (if exists)
      {
        '@type': 'FAQPage',
        '@id': `${baseUrl}#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is included in the workshop?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'The workshop includes 2 full days of training, workbook materials, certificate of completion, networking opportunities, and follow-up resources.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is there a refund policy?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes, we offer refunds within 30 days of purchase AND more than 7 days before the workshop. No refunds available after 30 days of purchase OR 7 days or less before the workshop.',
            },
          },
          {
            '@type': 'Question',
            name: 'What is the difference between GA and VIP tickets?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'VIP tickets include everything in General Admission plus a private dinner with coaches, priority seating, extended Q&A access, and exclusive networking opportunities.',
            },
          },
        ],
      },

      // WebSite
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}#website`,
        url: baseUrl,
        name: '6FB Methodologies Workshop',
        description: data.description,
        publisher: {
          '@type': 'Organization',
          '@id': `${baseUrl}#organization`,
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${baseUrl}/search?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };
}

// Generate OpenGraph metadata
export function generateOpenGraphMetadata(
  data: WorkshopSEOData
): Metadata['openGraph'] {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || 'https://6fbmethodologies.com';

  return {
    title: data.title,
    description: data.description,
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: '6FB Methodologies Workshop',
    images: data.images.map(img => ({
      url: `${baseUrl}${img.url}`,
      alt: img.alt,
      width: img.width,
      height: img.height,
      type: 'image/jpeg',
    })),
    videos: [
      {
        url: `${baseUrl}/videos/workshop-preview.mp4`,
        width: 1280,
        height: 720,
        type: 'video/mp4',
      },
    ],
  };
}

// Generate Twitter Card metadata
export function generateTwitterMetadata(
  data: WorkshopSEOData
): Metadata['twitter'] {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || 'https://6fbmethodologies.com';

  return {
    card: 'summary_large_image',
    title: data.title,
    description: data.description,
    site: '@6figurebarber',
    creator: '@6figurebarber',
    images: [`${baseUrl}${data.images[0].url}`],
  };
}

// Generate canonical and hreflang tags
export function generateCanonicalAndHreflang(pathname: string = '') {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || 'https://6fbmethodologies.com';
  const canonicalUrl = `${baseUrl}${pathname}`;

  return {
    canonical: canonicalUrl,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en-US': canonicalUrl,
        'en-CA': `${canonicalUrl}?region=ca`,
        'en-GB': `${canonicalUrl}?region=uk`,
        'en-AU': `${canonicalUrl}?region=au`,
      },
    },
  };
}

// Local Business SEO for workshop location
export function generateLocalBusinessStructuredData() {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || 'https://6fbmethodologies.com';

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${baseUrl}#localbusiness`,
    name: '6FB Methodologies Workshop Venue',
    image: `${baseUrl}/images/venue.jpg`,
    telephone: '+1-555-6FB-METH',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '123 Conference Center Dr',
      addressLocality: 'Atlanta',
      addressRegion: 'GA',
      postalCode: '30309',
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 33.749,
      longitude: -84.388,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Saturday', 'Sunday'],
        opens: '08:00',
        closes: '18:00',
      },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '247',
    },
  };
}

// SEO-optimized meta tags for different pages
export const PAGE_METADATA = {
  home: {
    title: '6FB Methodologies Workshop 2026 | Transform Your Barber Business',
    description:
      'Join 200+ successful barbers at the premier business growth workshop. Learn systems, marketing, and wealth-building strategies. Multiple cities - 2026 tour dates available.',
    keywords:
      'barbering workshop 2026, barber business training, barbershop growth, 6 figure barber, business coaching barbers',
  },

  register: {
    title: 'Register for 6FB Methodologies Workshop | Secure Your Spot',
    description:
      'Register now for the 6FB Methodologies Workshop. Choose General Admission or VIP Experience. Limited seats available. 100% money-back guarantee.',
    keywords:
      'register barber workshop, barber training registration, 6fb workshop tickets, barbering seminar signup',
  },

  success: {
    title: 'Registration Confirmed | 6FB Methodologies Workshop',
    description:
      "Your registration is confirmed! You'll receive a confirmation email with workshop details, location, and what to bring.",
    keywords:
      'workshop confirmation, registration success, barber training confirmed',
  },

  speakers: {
    title: 'Meet Your Instructors | 6FB Methodologies Workshop',
    description:
      'Learn from industry experts Dre, Nate, and Bossio - successful barber entrepreneurs who have built million-dollar businesses.',
    keywords:
      'barber coaches, barbering instructors, successful barber entrepreneurs, business mentors',
  },
};

// Performance optimization for SEO
export const SEO_PERFORMANCE_CONFIG = {
  // Preload only essential critical resources used immediately
  preloadResources: [
    // Fonts are handled by Next.js Google Fonts - no manual preload needed
  ],

  // DNS prefetch for external resources
  dnsPrefetch: [
    'https://js.stripe.com',
    'https://fonts.googleapis.com',
    'https://www.google-analytics.com',
    'https://hooks.zapier.com',
  ],

  // Resource hints
  resourceHints: {
    preconnect: [
      { href: 'https://js.stripe.com', crossOrigin: 'anonymous' },
      { href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
    ],
  },

  // Conditional preloads (load only when needed)
  conditionalPreloads: {
    hero: { href: '/images/workshop-hero.jpg', as: 'image' },
    criticalCSS: { href: '/css/critical.css', as: 'style' },
  },
};

// Generate meta tags for social sharing
export function generateSocialMetaTags(
  pageType: keyof typeof PAGE_METADATA = 'home'
) {
  const metadata = PAGE_METADATA[pageType];
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || 'https://6fbmethodologies.com';

  return {
    // Facebook Meta Tags
    'og:title': metadata.title,
    'og:description': metadata.description,
    'og:image': `${baseUrl}/images/social-share-${pageType}.jpg`,
    'og:url': baseUrl,
    'og:type': 'website',
    'og:site_name': '6FB Methodologies Workshop',

    // Twitter Meta Tags
    'twitter:title': metadata.title,
    'twitter:description': metadata.description,
    'twitter:image': `${baseUrl}/images/social-share-${pageType}.jpg`,
    'twitter:card': 'summary_large_image',
    'twitter:site': '@6figurebarber',

    // Additional Meta Tags
    description: metadata.description,
    keywords: metadata.keywords,
    author: '6 Figure Barber',
    robots:
      'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    googlebot: 'index, follow',

    // Mobile optimization
    viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
    'theme-color': '#00C851',
    'msapplication-TileColor': '#00C851',

    // Apple specific
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': '6FB Workshop',
  };
}
