// Centralized Workshop Date Management
// Single source of truth for all workshop date information

import { CITY_WORKSHOPS } from './cities';
import type { CityWorkshop } from './cities';

export interface WorkshopDateInfo {
  dateString: string; // "January 25-26, 2026"
  startDate: string; // ISO string for calendar invites
  endDate: string; // ISO string for calendar invites
  city: string; // Official city name
  state: string; // State abbreviation
  timeZone: string; // IANA timezone
}

// City name aliases for robust matching
const CITY_ALIASES: Record<string, string> = {
  // New York variations
  'NYC': 'New York City',
  'New York': 'New York City',
  'NY': 'New York City',
  'new-york-city': 'New York City',
  'new-york': 'New York City',
  'nyc': 'New York City',

  // Las Vegas variations
  'Vegas': 'Las Vegas',
  'LV': 'Las Vegas',
  'las-vegas': 'Las Vegas',
  'vegas': 'Las Vegas',

  // San Francisco variations
  'SF': 'San Francisco',
  'San Fran': 'San Francisco',
  'san-francisco': 'San Francisco',
  'sf': 'San Francisco',

  // Dallas variations
  'dallas': 'Dallas',

  // Atlanta variations
  'atlanta': 'Atlanta',
  'ATL': 'Atlanta',
  'atl': 'Atlanta',

  // Chicago variations
  'chicago': 'Chicago',
  'CHI': 'Chicago',
  'chi': 'Chicago',
};

// Timezone mappings for proper calendar invite generation
const CITY_TIMEZONES: Record<string, string> = {
  'Dallas': 'America/Chicago',
  'Atlanta': 'America/New_York',
  'Las Vegas': 'America/Los_Angeles',
  'New York City': 'America/New_York',
  'Chicago': 'America/Chicago',
  'San Francisco': 'America/Los_Angeles',
};

// Workshop start times (in local timezone)
const WORKSHOP_START_HOUR = 9; // 9:00 AM
const WORKSHOP_END_HOUR = 17; // 5:00 PM (Day 1), Day 2 ends at 4:00 PM

/**
 * Normalize city name using aliases
 */
export function normalizeCityName(cityInput: string): string | null {
  if (!cityInput) return null;

  // First try exact match with CITY_WORKSHOPS
  const exactMatch = CITY_WORKSHOPS.find(
    workshop => workshop.city.toLowerCase() === cityInput.toLowerCase()
  );
  if (exactMatch) return exactMatch.city;

  // Try alias lookup
  const aliasMatch = CITY_ALIASES[cityInput];
  if (aliasMatch) return aliasMatch;

  // Try case-insensitive alias lookup
  const lowerInput = cityInput.toLowerCase();
  for (const [alias, canonical] of Object.entries(CITY_ALIASES)) {
    if (alias.toLowerCase() === lowerInput) {
      return canonical;
    }
  }

  return null;
}

/**
 * Get workshop information for a city
 */
export function getWorkshopInfo(cityInput: string): CityWorkshop | null {
  const normalizedCity = normalizeCityName(cityInput);
  if (!normalizedCity) return null;

  return CITY_WORKSHOPS.find(workshop => workshop.city === normalizedCity) || null;
}

/**
 * Get workshop date string for email/SMS
 * Example: "January 25-26, 2026"
 */
export function getWorkshopDateString(cityInput: string): string {
  const workshop = getWorkshopInfo(cityInput);
  if (!workshop) {
    console.warn(`No workshop date found for city: ${cityInput}, using Dallas default`);
    return 'January 25-26, 2026'; // Default to Dallas
  }

  return `${workshop.dates[0]}, ${workshop.year}`;
}

/**
 * Get workshop start date as ISO string for calendar invites
 */
export function getWorkshopStartDate(cityInput: string): string {
  const workshop = getWorkshopInfo(cityInput);
  if (!workshop) {
    console.warn(`No workshop start date found for city: ${cityInput}, using Dallas default`);
    return '2026-01-25T15:00:00.000Z'; // Dallas default in UTC
  }

  const timezone = CITY_TIMEZONES[workshop.city] || 'America/Chicago';

  // Parse the date string (e.g., "January 25-26" -> January 25)
  const dateStr = workshop.dates[0]; // "January 25-26"
  const firstDate = dateStr.split('-')[0].trim(); // "January 25"
  const year = workshop.year;

  // Create date in local timezone, then convert to UTC
  const localDate = new Date(`${firstDate}, ${year} ${WORKSHOP_START_HOUR}:00:00`);

  // For proper timezone handling, we'll use a simpler approach
  // This creates the date in the workshop's local timezone
  const startDate = getLocalWorkshopDate(workshop, 1, WORKSHOP_START_HOUR);

  return startDate.toISOString();
}

/**
 * Get workshop end date as ISO string for calendar invites
 */
export function getWorkshopEndDate(cityInput: string): string {
  const workshop = getWorkshopInfo(cityInput);
  if (!workshop) {
    console.warn(`No workshop end date found for city: ${cityInput}, using Dallas default`);
    return '2026-01-26T22:00:00.000Z'; // Dallas default in UTC
  }

  // Workshop is 2 days, Day 2 ends at 4:00 PM (16:00)
  const endDate = getLocalWorkshopDate(workshop, 2, 16);

  return endDate.toISOString();
}

/**
 * Get all supported cities
 */
export function getSupportedCities(): string[] {
  return CITY_WORKSHOPS.map(workshop => workshop.city);
}

/**
 * Check if a city is supported
 */
export function isCitySupported(cityInput: string): boolean {
  return normalizeCityName(cityInput) !== null;
}

/**
 * Get complete workshop date information
 */
export function getWorkshopDateInfo(cityInput: string): WorkshopDateInfo | null {
  const workshop = getWorkshopInfo(cityInput);
  if (!workshop) return null;

  return {
    dateString: getWorkshopDateString(cityInput),
    startDate: getWorkshopStartDate(cityInput),
    endDate: getWorkshopEndDate(cityInput),
    city: workshop.city,
    state: workshop.state,
    timeZone: CITY_TIMEZONES[workshop.city] || 'America/Chicago',
  };
}

/**
 * Helper function to create a date in the workshop's local timezone
 */
function getLocalWorkshopDate(workshop: CityWorkshop, day: 1 | 2, hour: number): Date {
  // Parse the date range (e.g., "January 25-26" -> ["January 25", "26"])
  const dateStr = workshop.dates[0]; // "January 25-26"
  const parts = dateStr.split('-');

  let targetDate: string;
  if (day === 1) {
    targetDate = parts[0].trim(); // "January 25"
  } else {
    // Day 2: combine month from first part with day from second part
    const monthFromFirst = parts[0].trim().split(' ')[0]; // "January"
    const dayNumber = parts[1].trim(); // "26"
    targetDate = `${monthFromFirst} ${dayNumber}`;
  }

  // Create date in UTC first, then adjust for timezone
  const utcDate = new Date(`${targetDate}, ${workshop.year} ${hour}:00:00 UTC`);

  // Apply timezone offset
  const timezone = CITY_TIMEZONES[workshop.city];
  if (timezone) {
    // Get timezone offset for the specific date
    const offsetMinutes = getTimezoneOffset(utcDate, timezone);
    utcDate.setMinutes(utcDate.getMinutes() + offsetMinutes);
  }

  return utcDate;
}

/**
 * Get timezone offset in minutes for a specific date and timezone
 * Positive values mean ahead of UTC, negative means behind
 */
function getTimezoneOffset(date: Date, timezone: string): number {
  try {
    // Create formatter for the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    // Get the local time in target timezone
    const parts = formatter.formatToParts(date);
    const localTime = new Date(
      parseInt(parts.find(p => p.type === 'year')!.value, 10),
      parseInt(parts.find(p => p.type === 'month')!.value, 10) - 1,
      parseInt(parts.find(p => p.type === 'day')!.value, 10),
      parseInt(parts.find(p => p.type === 'hour')!.value, 10),
      parseInt(parts.find(p => p.type === 'minute')!.value, 10),
      parseInt(parts.find(p => p.type === 'second')!.value, 10)
    );

    // Calculate offset
    return (date.getTime() - localTime.getTime()) / (1000 * 60);
  } catch (error) {
    console.warn(`Failed to calculate timezone offset for ${timezone}:`, error);
    return 0; // Default to UTC
  }
}

// Re-export city workshops for convenience
export { CITY_WORKSHOPS } from './cities';
export type { CityWorkshop } from './cities';