// Skool Member Management Service
// This service manages verified 6FB Skool community members

export interface SkoolMember {
  email: string;
  firstName: string;
  lastName: string;
  transactionId: string;
  subscriptionDate: string;
  verifiedAt: string;
  isActive: boolean;
}

export interface SkoolMemberVerification {
  isVerified: boolean;
  member?: {
    email: string;
    name: string;
    membershipType: string;
    isActive: boolean;
    joinDate: string;
    transactionId: string;
  };
  source: 'skool';
}

// Global in-memory store for verified 6FB Skool members
// Using globalThis to ensure single instance across Next.js API routes
// In production, this should be replaced with a persistent database

declare global {
  var __verifiedSkoolMembers: Map<string, SkoolMember> | undefined;
}

const verifiedSkoolMembers =
  globalThis.__verifiedSkoolMembers ?? new Map<string, SkoolMember>();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__verifiedSkoolMembers = verifiedSkoolMembers;
}

// Add a verified Skool member
export function addVerifiedSkoolMember(member: SkoolMember): void {
  const normalizedEmail = member.email.toLowerCase().trim();
  verifiedSkoolMembers.set(normalizedEmail, {
    ...member,
    email: normalizedEmail,
  });

  console.log('✅ Skool member added to verification database:', {
    email: normalizedEmail,
    name: `${member.firstName} ${member.lastName}`,
    totalMembers: verifiedSkoolMembers.size,
  });
}

// Check if an email is a verified Skool member
export function verifySkoolMember(email: string): SkoolMemberVerification {
  const normalizedEmail = email.toLowerCase().trim();
  const member = verifiedSkoolMembers.get(normalizedEmail);

  if (member) {
    return {
      isVerified: true,
      member: {
        email: member.email,
        name: `${member.firstName} ${member.lastName}`,
        membershipType: 'Skool-Member',
        isActive: member.isActive,
        joinDate: member.subscriptionDate,
        transactionId: member.transactionId,
      },
      source: 'skool',
    };
  }

  return {
    isVerified: false,
    source: 'skool',
  };
}

// Get all verified Skool members
export function getAllVerifiedSkoolMembers(): SkoolMember[] {
  return Array.from(verifiedSkoolMembers.values());
}

// Remove a verified Skool member
export function removeVerifiedSkoolMember(email: string): boolean {
  const normalizedEmail = email.toLowerCase().trim();
  const existed = verifiedSkoolMembers.delete(normalizedEmail);

  if (existed) {
    console.log(
      '🗑️ Skool member removed from verification database:',
      normalizedEmail
    );
  }

  return existed;
}

// Get count of verified members
export function getVerifiedSkoolMemberCount(): number {
  return verifiedSkoolMembers.size;
}

// Check if member exists
export function hasVerifiedSkoolMember(email: string): boolean {
  const normalizedEmail = email.toLowerCase().trim();
  return verifiedSkoolMembers.has(normalizedEmail);
}

// Get specific member details
export function getSkoolMemberDetails(email: string): SkoolMember | null {
  const normalizedEmail = email.toLowerCase().trim();
  return verifiedSkoolMembers.get(normalizedEmail) || null;
}

// Bulk import members (for initial sync or testing)
export function bulkImportSkoolMembers(members: SkoolMember[]): number {
  let imported = 0;

  for (const member of members) {
    try {
      addVerifiedSkoolMember(member);
      imported++;
    } catch (error) {
      console.error('Failed to import Skool member:', member.email, error);
    }
  }

  console.log(`📊 Bulk import completed: ${imported} Skool members imported`);
  return imported;
}

// Export current state for debugging
export function getSkoolMemberStats() {
  const members = getAllVerifiedSkoolMembers();
  const activeMembers = members.filter(m => m.isActive);

  return {
    totalMembers: members.length,
    activeMembers: activeMembers.length,
    recentMembers: members
      .sort(
        (a, b) =>
          new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime()
      )
      .slice(0, 5),
    oldestMember:
      members.length > 0
        ? members.reduce((oldest, current) =>
            new Date(current.verifiedAt) < new Date(oldest.verifiedAt)
              ? current
              : oldest
          )
        : null,
  };
}
