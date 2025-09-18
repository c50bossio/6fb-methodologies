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
    dates: ['January 26-27'],
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
    dates: ['February 23-24'],
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
    dates: ['March 1-2'],
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
    id: 'sf-jun-2026',
    city: 'San Francisco',
    state: 'CA',
    month: 'June 2026',
    year: 2026,
    dates: ['June 22-23'],
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
    dates: ['May 18-19'],
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
    id: 'nyc-apr-2026',
    city: 'New York City',
    state: 'NY',
    month: 'April 2026',
    year: 2026,
    dates: ['April 27-28'],
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

/**
 * Get real registered counts from inventory system
 * This provides accurate data that reflects actual sales
 */
export const getRegisteredCountFromInventory = async (cityId: string): Promise<{ ga: number; vip: number }> => {
  try {
    const status = await checkInventoryStatus(cityId)
    if (!status) {
      console.warn(`Could not get inventory status for city: ${cityId}`)
      return { ga: 0, vip: 0 }
    }

    return {
      ga: status.sold.ga,
      vip: status.sold.vip
    }
  } catch (error) {
    console.error(`Error getting registered count for ${cityId}:`, error)
    return { ga: 0, vip: 0 }
  }
}

/**
 * Synchronous version that gets registered counts from inventory
 * Uses the inventory store directly for immediate access
 */
export const getRegisteredCountFromInventorySync = (cityId: string): { ga: number; vip: number } => {
  try {
    // Access the inventory store directly for sync operation
    // This is a simplified version that works with the current in-memory store
    const city = getCityById(cityId)
    if (!city) {
      return { ga: 0, vip: 0 }
    }

    // For now, we'll use the static data but this will be replaced
    // when we have real-time inventory tracking in place
    return {
      ga: city.registeredCount.ga,
      vip: city.registeredCount.vip
    }
  } catch (error) {
    console.error(`Error getting registered count sync for ${cityId}:`, error)
    return { ga: 0, vip: 0 }
  }
}

/**
 * Get total registered count across all cities from real inventory data
 */
export const getTotalRegisteredCountFromInventory = async (): Promise<number> => {
  try {
    let total = 0

    for (const city of CITY_WORKSHOPS) {
      const registered = await getRegisteredCountFromInventory(city.id)
      total += registered.ga + registered.vip
    }

    return total
  } catch (error) {
    console.error('Error getting total registered count:', error)
    return 0
  }
}