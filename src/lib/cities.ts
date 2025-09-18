import type { CityWorkshop } from '@/types'
import { getPublicAvailableSpots, getActualAvailableSpots, checkInventoryStatus } from './inventory'

// 6FB Methodologies Multi-City Tour Data
export const CITY_WORKSHOPS: CityWorkshop[] = [
  {
    id: 'dallas-jan-2026',
    city: 'Dallas',
    state: 'TX',
    month: 'January 2026',
    year: 2026,
    dates: ['January 12-13', 'January 19-20'],
    location: 'Location TBA',
    climateAppeal: 'Escape winter weather - Perfect 65°F',
    status: 'upcoming',
    availableSpots: {
      ga: 35,
      vip: 15
    },
    registeredCount: {
      ga: 0,
      vip: 0
    },
    stripe: {
      gaPriceId: 'price_1S8SZWEzoIvSRPoDXIhMYWrV',
      vipPriceId: 'price_1S8SpKEzoIvSRPoD57u9Diyr'
    }
  },
  {
    id: 'atlanta-feb-2026',
    city: 'Atlanta',
    state: 'GA',
    month: 'February 2026',
    year: 2026,
    dates: ['February 16-17', 'February 23-24'],
    location: 'Location TBA',
    climateAppeal: 'Perfect February weather - 68°F ideal',
    status: 'upcoming',
    availableSpots: {
      ga: 35,
      vip: 15
    },
    registeredCount: {
      ga: 0,
      vip: 0
    },
    stripe: {
      gaPriceId: 'price_1S8Sb4EzoIvSRPoDXNmY1PZq',
      vipPriceId: 'price_1S8SbHEzoIvSRPoDRp1OaBIk'
    }
  },
  {
    id: 'la-mar-2026',
    city: 'Los Angeles',
    state: 'CA',
    month: 'March 2026',
    year: 2026,
    dates: ['March 29-30'],
    location: 'Location TBA',
    climateAppeal: 'Beautiful LA spring weather - 72°F',
    status: 'upcoming',
    availableSpots: {
      ga: 35,
      vip: 15
    },
    registeredCount: {
      ga: 0,
      vip: 0
    },
    stripe: {
      gaPriceId: 'price_1S8SbTEzoIvSPoD4tvEuw5G',
      vipPriceId: 'price_1S8SbfEzoIvSPoD8sPuB9zb'
    }
  },
  {
    id: 'sf-apr-2026',
    city: 'San Francisco',
    state: 'CA',
    month: 'April 2026',
    year: 2026,
    dates: ['April 13-14', 'April 20-21'],
    location: 'Location TBA',
    climateAppeal: 'Ideal SF spring climate - 66°F',
    status: 'upcoming',
    availableSpots: {
      ga: 35,
      vip: 15
    },
    registeredCount: {
      ga: 0,
      vip: 0
    },
    stripe: {
      gaPriceId: 'price_1S8SbuEzoIvSRPoDkH4q9yEx',
      vipPriceId: 'price_1S8Sc0EzoIvSRPoDEfGUMMSn'
    }
  },
  {
    id: 'chicago-may-2026',
    city: 'Chicago',
    state: 'IL',
    month: 'May 2026',
    year: 2026,
    dates: ['May 18-19', 'May 25-26'],
    location: 'Location TBA',
    climateAppeal: 'Perfect Chicago spring - 70°F',
    status: 'upcoming',
    availableSpots: {
      ga: 35,
      vip: 15
    },
    registeredCount: {
      ga: 0,
      vip: 0
    },
    stripe: {
      gaPriceId: 'price_1S8ScDEzoIvSPoD6d2IEFov',
      vipPriceId: 'price_1S8ScIEzoIvSRPoDcSAEWOGt'
    }
  },
  {
    id: 'nyc-jun-2026',
    city: 'New York City',
    state: 'NY',
    month: 'June 2026',
    year: 2026,
    dates: ['June 15-16', 'June 22-23'],
    location: 'Location TBA',
    climateAppeal: 'Amazing NYC summer - 75°F',
    status: 'upcoming',
    availableSpots: {
      ga: 35,
      vip: 15
    },
    registeredCount: {
      ga: 0,
      vip: 0
    },
    stripe: {
      gaPriceId: 'price_1S8ScUEzoIvSRPoDuWFvWWba',
      vipPriceId: 'price_1S8ScZEzoIvSRPoDhV6sRleF'
    }
  }
]

// Helper functions
export const getCityById = (id: string): CityWorkshop | undefined => {
  return CITY_WORKSHOPS.find(city => city.id === id)
}

export const getCityByName = (cityName: string): CityWorkshop | undefined => {
  return CITY_WORKSHOPS.find(city => city.city.toLowerCase() === cityName.toLowerCase())
}

export const getAvailableCities = (): CityWorkshop[] => {
  return CITY_WORKSHOPS.filter(city => city.status !== 'sold-out')
}

// New inventory-aware version
export const getAvailableCitiesAsync = async (): Promise<CityWorkshop[]> => {
  const availableCities: CityWorkshop[] = []

  for (const city of CITY_WORKSHOPS) {
    if (city.status !== 'sold-out') {
      const isAvailable = await isCityAvailable(city.id)
      if (isAvailable) {
        availableCities.push(city)
      }
    }
  }

  return availableCities
}

export const getNextAvailableCity = (): CityWorkshop | undefined => {
  const now = new Date()
  return CITY_WORKSHOPS
    .filter(city => city.status !== 'sold-out')
    .sort((a, b) => a.year - b.year)[0] // Return earliest available
}

export const getTotalAvailableSpots = async (cityId: string, ticketType: 'ga' | 'vip'): Promise<number> => {
  // Use new inventory system for real-time availability
  return await getPublicAvailableSpots(cityId, ticketType)
}

// Legacy synchronous version for backward compatibility
export const getTotalAvailableSpotsSync = (cityId: string, ticketType: 'ga' | 'vip'): number => {
  const city = getCityById(cityId)
  if (!city) return 0
  return city.availableSpots[ticketType] - city.registeredCount[ticketType]
}

export const isCityAvailable = async (cityId: string): Promise<boolean> => {
  const city = getCityById(cityId)
  if (!city) return false

  const gaAvailable = await getPublicAvailableSpots(cityId, 'ga') > 0
  const vipAvailable = await getPublicAvailableSpots(cityId, 'vip') > 0

  return gaAvailable || vipAvailable
}

// Legacy synchronous version for backward compatibility
export const isCityAvailableSync = (cityId: string): boolean => {
  const city = getCityById(cityId)
  if (!city) return false

  const gaAvailable = getTotalAvailableSpotsSync(cityId, 'ga') > 0
  const vipAvailable = getTotalAvailableSpotsSync(cityId, 'vip') > 0

  return gaAvailable || vipAvailable
}