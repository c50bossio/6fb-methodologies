import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { validateEmail } from '@/lib/utils';

// Verify webhook signature (security best practice)
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) return true; // Skip verification in development

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// In production, this would be stored in a database
const memberDatabase = new Map<
  string,
  {
    name: string;
    email: string;
    membershipType: string;
    groupId: string;
    joinDate: string;
    isActive: boolean;
  }
>();

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.ZAPIER_WEBHOOK_SECRET;
    const signature = request.headers.get('x-zapier-signature') || '';
    const payload = await request.text();

    // Verify webhook signature for security
    if (
      webhookSecret &&
      !verifyWebhookSignature(payload, signature, webhookSecret)
    ) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 401 }
      );
    }

    let webhookData;
    try {
      webhookData = JSON.parse(payload);
    } catch (parseError) {
      console.error('Invalid JSON payload:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Extract member data from Zapier webhook
    const {
      email,
      name,
      groupId,
      membershipQuestions,
      timestamp,
      action = 'member_added', // Default action
    } = webhookData;

    // Validate required fields
    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Handle different webhook actions
    switch (action) {
      case 'member_added':
      case 'member_joined':
        // Add new member to database
        memberDatabase.set(normalizedEmail, {
          name: name || 'Unknown Member',
          email: normalizedEmail,
          membershipType: membershipQuestions?.membership_type || 'Basic',
          groupId: groupId || '6fb-community',
          joinDate: timestamp || new Date().toISOString(),
          isActive: true,
        });

        console.log(`New 6FB member added: ${normalizedEmail}`);
        break;

      case 'member_removed':
      case 'member_left':
        // Remove member or mark as inactive
        if (memberDatabase.has(normalizedEmail)) {
          const member = memberDatabase.get(normalizedEmail)!;
          member.isActive = false;
          memberDatabase.set(normalizedEmail, member);
          console.log(`6FB member deactivated: ${normalizedEmail}`);
        }
        break;

      case 'member_updated':
        // Update existing member data
        if (memberDatabase.has(normalizedEmail)) {
          const existingMember = memberDatabase.get(normalizedEmail)!;
          memberDatabase.set(normalizedEmail, {
            ...existingMember,
            name: name || existingMember.name,
            membershipType:
              membershipQuestions?.membership_type ||
              existingMember.membershipType,
            // Keep other fields unchanged
          });
          console.log(`6FB member updated: ${normalizedEmail}`);
        }
        break;

      default:
        console.warn(`Unknown webhook action: ${action}`);
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: `Webhook processed successfully for ${action}`,
      memberCount: memberDatabase.size,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Zapier webhook processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error processing webhook' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve member statistics (for debugging/monitoring)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    if (email) {
      // Return specific member data
      const normalizedEmail = email.toLowerCase().trim();
      const member = memberDatabase.get(normalizedEmail);

      if (member) {
        return NextResponse.json({
          success: true,
          member: {
            ...member,
            // Don't expose sensitive data
            email: member.email,
          },
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'Member not found',
        });
      }
    }

    // Return general statistics
    const activeMembers = Array.from(memberDatabase.values()).filter(
      member => member.isActive
    );

    return NextResponse.json({
      success: true,
      statistics: {
        totalMembers: memberDatabase.size,
        activeMembers: activeMembers.length,
        membershipTypes: activeMembers.reduce(
          (acc, member) => {
            acc[member.membershipType] = (acc[member.membershipType] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
    });
  } catch (error) {
    console.error('Member statistics error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
