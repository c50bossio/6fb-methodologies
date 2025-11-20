import type { CityWorkshop } from '@/types';
import { getPublicAvailableSpots, checkInventoryStatus } from './inventory';

// 6FB Methodologies Tampa Workshop
export const CITY_WORKSHOPS: CityWorkshop[] = [
  {
    id: 'tampa-jul-2025',
    city: 'Tampa',
    state: 'FL',
    month: 'July 2025',
    year: 2025,
    dates: ['July 19-20'],
    location: 'Location TBA',
    climateAppeal: 'Summer workshop in sunny Tampa',
    status: 'upcoming',
    availableSpots: {
      ga: 999, // No capacity limits - manual control
      vip: 999,
      vipElite: 999,
    },
    registeredCount: {
      ga: 0,
      vip: 0,
      vipElite: 0,
    },
    stripe: {
      gaPriceId: 'TBD_TAMPA_GA', // Set this after creating Stripe price
      vipPriceId: 'TBD_TAMPA_VIP', // Set this after creating Stripe price
      vipElitePriceId: 'TBD_TAMPA_VIP_ELITE', // Set this after creating Stripe price
    },
  },
];

// Helper functions
export const getCityById = (id: string): CityWorkshop | undefined => {
  return CITY_WORKSHOPS.find(city => city.id === id);
};

export const getCityByName = (cityName: string): CityWorkshop | undefined => {
  return CITY_WORKSHOPS.find(
    city => city.city.toLowerCase() === cityName.toLowerCase()
  );
};

export const getAvailableCities = (): CityWorkshop[] => {
  return CITY_WORKSHOPS.filter(city => city.status !== 'sold-out');
};

// New inventory-aware version
export const getAvailableCitiesAsync = async (): Promise<CityWorkshop[]> => {
  const availableCities: CityWorkshop[] = [];

  for (const city of CITY_WORKSHOPS) {
    if (city.status !== 'sold-out') {
      const isAvailable = await isCityAvailable(city.id);
      if (isAvailable) {
        availableCities.push(city);
      }
    }
  }

  return availableCities;
};

export const getNextAvailableCity = (): CityWorkshop | undefined => {
  return CITY_WORKSHOPS.filter(city => city.status !== 'sold-out').sort(
    (a, b) => a.year - b.year
  )[0]; // Return earliest available
};

export const getTotalAvailableSpots = async (
  cityId: string,
  ticketType: 'ga' | 'vip' | 'vipElite'
): Promise<number> => {
  // Use new inventory system for real-time availability
  return await getPublicAvailableSpots(cityId, ticketType);
};

// Legacy synchronous version for backward compatibility
export const getTotalAvailableSpotsSync = (
  cityId: string,
  ticketType: 'ga' | 'vip' | 'vipElite'
): number => {
  const city = getCityById(cityId);
  if (!city) return 0;
  return city.availableSpots[ticketType] - city.registeredCount[ticketType];
};

export const isCityAvailable = async (cityId: string): Promise<boolean> => {
  const city = getCityById(cityId);
  if (!city) return false;

  const gaAvailable = (await getPublicAvailableSpots(cityId, 'ga')) > 0;
  const vipAvailable = (await getPublicAvailableSpots(cityId, 'vip')) > 0;
  const vipEliteAvailable =
    (await getPublicAvailableSpots(cityId, 'vipElite')) > 0;

  return gaAvailable || vipAvailable || vipEliteAvailable;
};

// Legacy synchronous version for backward compatibility
export const isCityAvailableSync = (cityId: string): boolean => {
  const city = getCityById(cityId);
  if (!city) return false;

  const gaAvailable = getTotalAvailableSpotsSync(cityId, 'ga') > 0;
  const vipAvailable = getTotalAvailableSpotsSync(cityId, 'vip') > 0;
  const vipEliteAvailable = getTotalAvailableSpotsSync(cityId, 'vipElite') > 0;

  return gaAvailable || vipAvailable || vipEliteAvailable;
};

/**
 * Get real registered counts from inventory system
 * This provides accurate data that reflects actual sales
 */
export const getRegisteredCountFromInventory = async (
  cityId: string
): Promise<{ ga: number; vip: number; vipElite: number }> => {
  try {
    const status = await checkInventoryStatus(cityId);
    if (!status) {
      console.warn(`Could not get inventory status for city: ${cityId}`);
      return { ga: 0, vip: 0, vipElite: 0 };
    }

    return {
      ga: status.sold.ga,
      vip: status.sold.vip,
      vipElite: status.sold.vipElite,
    };
  } catch (error) {
    console.error(`Error getting registered count for ${cityId}:`, error);
    return { ga: 0, vip: 0, vipElite: 0 };
  }
};

/**
 * Synchronous version that gets registered counts from inventory
 * Uses the inventory store directly for immediate access
 */
export const getRegisteredCountFromInventorySync = (
  cityId: string
): { ga: number; vip: number; vipElite: number } => {
  try {
    // Access the inventory store directly for sync operation
    // This is a simplified version that works with the current in-memory store
    const city = getCityById(cityId);
    if (!city) {
      return { ga: 0, vip: 0, vipElite: 0 };
    }

    // For now, we'll use the static data but this will be replaced
    // when we have real-time inventory tracking in place
    return {
      ga: city.registeredCount.ga,
      vip: city.registeredCount.vip,
      vipElite: city.registeredCount.vipElite,
    };
  } catch (error) {
    console.error(`Error getting registered count sync for ${cityId}:`, error);
    return { ga: 0, vip: 0, vipElite: 0 };
  }
};

/**
 * Get total registered count across all cities from real inventory data
 */
export const getTotalRegisteredCountFromInventory =
  async (): Promise<number> => {
    try {
      let total = 0;

      for (const city of CITY_WORKSHOPS) {
        const registered = await getRegisteredCountFromInventory(city.id);
        total += registered.ga + registered.vip + registered.vipElite;
      }

      return total;
    } catch (error) {
      console.error('Error getting total registered count:', error);
      return 0;
    }
  };
