// CSV Member Management Service
// Simple file-based member verification using monthly CSV exports from Skool

import fs from 'fs';
import path from 'path';

export interface CSVMember {
  firstName: string;
  lastName: string;
  email: string;
  invitedBy: string;
  joinedDate: string;
  isActive: boolean;
}

export interface CSVMemberVerification {
  isVerified: boolean;
  member?: {
    email: string;
    name: string;
    membershipType: string;
    isActive: boolean;
    joinDate: string;
    invitedBy?: string;
  };
  source: 'csv';
}

// Global in-memory cache for CSV members
// Using globalThis to ensure single instance across Next.js API routes
declare global {
  var __csvMembers: Map<string, CSVMember> | undefined;
  var __csvLastModified: number | undefined;
}

const csvMembers = globalThis.__csvMembers ?? new Map<string, CSVMember>();
let csvLastModified = globalThis.__csvLastModified ?? 0;

if (process.env.NODE_ENV !== 'production') {
  globalThis.__csvMembers = csvMembers;
  globalThis.__csvLastModified = csvLastModified;
}

// CSV file path
const CSV_FILE_PATH = path.join(process.cwd(), 'data', 'skool-members.csv');

/**
 * Parse CSV line into member object
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Load CSV file and parse members
 */
export function loadCSVMembers(): {
  success: boolean;
  count: number;
  error?: string;
} {
  try {
    console.log('📄 Loading CSV member data...');

    // Check if file exists
    if (!fs.existsSync(CSV_FILE_PATH)) {
      console.warn('⚠️ CSV file not found:', CSV_FILE_PATH);
      return {
        success: false,
        count: 0,
        error:
          'CSV file not found. Please ensure skool-members.csv exists in /data directory.',
      };
    }

    // Check file modification time
    const stats = fs.statSync(CSV_FILE_PATH);
    const fileModified = stats.mtime.getTime();

    // Skip reload if file hasn't changed
    if (fileModified === csvLastModified && csvMembers.size > 0) {
      console.log('📄 CSV file unchanged, using cached data');
      return {
        success: true,
        count: csvMembers.size,
      };
    }

    // Read and parse CSV
    const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    const lines = csvContent.trim().split('\n');

    if (lines.length < 2) {
      return {
        success: false,
        count: 0,
        error: 'CSV file appears to be empty or has no data rows',
      };
    }

    // Parse header to understand structure
    const headers = parseCSVLine(lines[0].toLowerCase());
    console.log('📋 CSV Headers:', headers);

    // Find column indices
    const firstNameIdx = headers.findIndex(
      h => h.includes('firstname') || h.includes('first')
    );
    const lastNameIdx = headers.findIndex(
      h => h.includes('lastname') || h.includes('last')
    );
    const emailIdx = headers.findIndex(h => h.includes('email'));
    const invitedByIdx = headers.findIndex(h => h.includes('invited'));
    const joinedDateIdx = headers.findIndex(
      h => h.includes('joined') || h.includes('date')
    );

    if (emailIdx === -1) {
      return {
        success: false,
        count: 0,
        error: 'CSV file must contain an Email column',
      };
    }

    // Clear existing data
    csvMembers.clear();

    // Parse data rows
    let processed = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);

        if (values.length < headers.length - 2) {
          // Allow some missing columns
          skipped++;
          continue;
        }

        const email = values[emailIdx]?.toLowerCase().trim();

        if (!email || email === '') {
          skipped++;
          continue;
        }

        const member: CSVMember = {
          firstName: values[firstNameIdx] || 'Unknown',
          lastName: values[lastNameIdx] || 'Member',
          email,
          invitedBy: values[invitedByIdx] || '',
          joinedDate: values[joinedDateIdx] || '',
          isActive: true, // Assume all CSV members are active
        };

        csvMembers.set(email, member);
        processed++;
      } catch (error) {
        console.warn(`⚠️ Error parsing CSV line ${i + 1}:`, error);
        skipped++;
      }
    }

    // Update cache timestamp
    csvLastModified = fileModified;
    globalThis.__csvLastModified = csvLastModified;

    console.log(
      `✅ CSV loaded: ${processed} members processed, ${skipped} skipped`
    );

    return {
      success: true,
      count: processed,
    };
  } catch (error) {
    console.error('❌ Error loading CSV:', error);
    return {
      success: false,
      count: 0,
      error: `Failed to load CSV: ${(error as Error).message}`,
    };
  }
}

/**
 * Check if an email is a verified CSV member
 */
export function verifyCSVMember(email: string): CSVMemberVerification {
  // Ensure CSV is loaded
  const loadResult = loadCSVMembers();

  if (!loadResult.success) {
    console.warn('⚠️ CSV verification failed:', loadResult.error);
    return {
      isVerified: false,
      source: 'csv',
    };
  }

  const normalizedEmail = email.toLowerCase().trim();
  const member = csvMembers.get(normalizedEmail);

  if (member) {
    return {
      isVerified: true,
      member: {
        email: member.email,
        name: `${member.firstName} ${member.lastName}`,
        membershipType: 'CSV-Member',
        isActive: member.isActive,
        joinDate: member.joinedDate,
        invitedBy: member.invitedBy,
      },
      source: 'csv',
    };
  }

  return {
    isVerified: false,
    source: 'csv',
  };
}

/**
 * Get all CSV members
 */
export function getAllCSVMembers(): CSVMember[] {
  loadCSVMembers(); // Ensure loaded
  return Array.from(csvMembers.values());
}

/**
 * Get CSV member count
 */
export function getCSVMemberCount(): number {
  loadCSVMembers(); // Ensure loaded
  return csvMembers.size;
}

/**
 * Force reload CSV file (for monthly updates)
 */
export function reloadCSVMembers(): {
  success: boolean;
  count: number;
  previousCount: number;
  error?: string;
} {
  const previousCount = csvMembers.size;

  // Reset cache to force reload
  csvLastModified = 0;
  globalThis.__csvLastModified = 0;

  const result = loadCSVMembers();

  return {
    ...result,
    previousCount,
  };
}

/**
 * Get CSV file information
 */
export function getCSVInfo(): {
  exists: boolean;
  path: string;
  lastModified?: string;
  memberCount: number;
  error?: string;
} {
  try {
    const exists = fs.existsSync(CSV_FILE_PATH);

    if (!exists) {
      return {
        exists: false,
        path: CSV_FILE_PATH,
        memberCount: 0,
        error: 'CSV file not found',
      };
    }

    const stats = fs.statSync(CSV_FILE_PATH);

    return {
      exists: true,
      path: CSV_FILE_PATH,
      lastModified: stats.mtime.toISOString(),
      memberCount: csvMembers.size || 0,
    };
  } catch (error) {
    return {
      exists: false,
      path: CSV_FILE_PATH,
      memberCount: 0,
      error: `Error reading CSV info: ${(error as Error).message}`,
    };
  }
}

/**
 * Search for members (for debugging)
 */
export function searchCSVMembers(query: string): CSVMember[] {
  loadCSVMembers(); // Ensure loaded

  const normalizedQuery = query.toLowerCase();
  const results: CSVMember[] = [];

  for (const member of csvMembers.values()) {
    if (
      member.email.toLowerCase().includes(normalizedQuery) ||
      member.firstName.toLowerCase().includes(normalizedQuery) ||
      member.lastName.toLowerCase().includes(normalizedQuery)
    ) {
      results.push(member);
    }
  }

  return results.slice(0, 10); // Limit results
}

// Auto-load CSV on module import
if (typeof window === 'undefined') {
  // Server-side only
  loadCSVMembers();
}
