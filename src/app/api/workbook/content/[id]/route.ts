// T030: Content Management API - Specific content item access
// GET /api/workbook/content/[id] - Get specific content item with access control
// PUT /api/workbook/content/[id] - Update content item (admin only)
// DELETE /api/workbook/content/[id] - Delete content item (admin only)

import { NextRequest, NextResponse } from 'next/server';
import {
  extractToken,
  verifyToken,
  validateSession,
  hasPermission,
  WORKBOOK_PERMISSIONS,
} from '@/lib/workbook-auth';
import db, { DatabaseError, ValidationError } from '@/lib/database';
import {
  validateUuidParam,
  validateModuleAccess,
  SuccessResponseSchema,
  WorkbookErrorResponseSchema,
  ContentItemSchema,
  type ContentItem,
  type SubscriptionTier,
} from '@/lib/validation/workbook-schemas';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check rate limit for content access
 */
function checkRateLimit(
  userId: string,
  operation: 'GET' | 'PUT' | 'DELETE',
  limit: number = operation === 'GET' ? 100 : 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const key = `content_${operation}_${userId}`;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Authenticate and validate request
 */
async function authenticateRequest(request: NextRequest) {
  const token = extractToken(request);
  if (!token) {
    return { error: 'Authentication token required', status: 401 };
  }

  const session = verifyToken(token);
  const validation = validateSession(session);

  if (!validation.isValid) {
    return { error: validation.error || 'Invalid session', status: 401 };
  }

  return { session: session! };
}

/**
 * Ensure workbook_user exists and return user info
 */
async function ensureWorkbookUser(session: any): Promise<{
  id: string;
  subscriptionTier: SubscriptionTier;
  workshopAccessGranted: boolean;
  email: string;
  firstName: string;
  lastName: string;
}> {
  let workbookUser = await db.queryOne(
    `
    SELECT id, subscription_tier, workshop_access_granted, email, first_name, last_name
    FROM workbook_users
    WHERE email = $1
  `,
    [session.email]
  );

  if (!workbookUser) {
    workbookUser = await db.queryOne(
      `
      INSERT INTO workbook_users (
        email, first_name, last_name, subscription_tier, workshop_access_granted
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, subscription_tier, workshop_access_granted, email, first_name, last_name
    `,
      [
        session.email,
        session.name?.split(' ')[0] || 'User',
        session.name?.split(' ').slice(1).join(' ') || '',
        'basic',
        true,
      ]
    );
  }

  return {
    id: workbookUser.id,
    subscriptionTier: workbookUser.subscription_tier,
    workshopAccessGranted: workbookUser.workshop_access_granted,
    email: workbookUser.email,
    firstName: workbookUser.first_name,
    lastName: workbookUser.last_name,
  };
}

/**
 * Find content item by ID across different content types
 */
async function findContentItem(
  contentId: string,
  userTier: SubscriptionTier,
  userId: string,
  isAdmin: boolean
): Promise<{
  found: boolean;
  item?: ContentItem;
  error?: string;
  code?: string;
}> {
  // First, try to find as a workshop module
  const module = await db.queryOne(
    `
    SELECT
      'module'::text as type,
      id::text as id,
      title,
      description,
      NULL::text as url,
      content::text as content,
      '{"source": "workshop_modules"}'::jsonb as metadata,
      NULL::uuid as module_id,
      NULL::text as lesson_id,
      tags,
      is_published,
      'basic'::subscription_tier as access_level,
      created_at,
      updated_at
    FROM workshop_modules
    WHERE id = $1
  `,
    [contentId]
  );

  if (module) {
    // Check if user has access
    if (!module.is_published && !isAdmin) {
      return {
        found: false,
        error: 'Content is not currently available',
        code: 'CONTENT_NOT_PUBLISHED',
      };
    }

    const hasAccess = validateModuleAccess(userTier, module.access_level);
    if (!hasAccess) {
      return {
        found: false,
        error: 'Insufficient subscription tier for this content',
        code: 'SUBSCRIPTION_REQUIRED',
      };
    }

    return {
      found: true,
      item: ContentItemSchema.parse(module),
    };
  }

  // Try to find as a workshop lesson
  const lesson = await db.queryOne(
    `
    SELECT
      'lesson'::text as type,
      wl.id::text as id,
      wl.title,
      NULL::text as description,
      NULL::text as url,
      wl.content::text as content,
      ('{"source": "workshop_lessons", "module_title": "' || wm.title || '"}')::jsonb as metadata,
      wl.module_id,
      wl.id::text as lesson_id,
      '[]'::jsonb as tags,
      wl.is_published,
      COALESCE(wm.access_level, 'basic'::subscription_tier) as access_level,
      wl.created_at,
      wl.updated_at
    FROM workshop_lessons wl
    INNER JOIN workshop_modules wm ON wl.module_id = wm.id
    WHERE wl.id = $1
  `,
    [contentId]
  );

  if (lesson) {
    // Check if user has access
    if (!lesson.is_published && !isAdmin) {
      return {
        found: false,
        error: 'Content is not currently available',
        code: 'CONTENT_NOT_PUBLISHED',
      };
    }

    const hasAccess = validateModuleAccess(userTier, lesson.access_level);
    if (!hasAccess) {
      return {
        found: false,
        error: 'Insufficient subscription tier for this content',
        code: 'SUBSCRIPTION_REQUIRED',
      };
    }

    return {
      found: true,
      item: ContentItemSchema.parse(lesson),
    };
  }

  // Try to find as a user note
  const note = await db.queryOne(
    `
    SELECT
      'note'::text as type,
      id::text as id,
      title,
      LEFT(content, 200) as description,
      NULL::text as url,
      content,
      metadata,
      module_id,
      lesson_id,
      tags,
      (NOT is_private) as is_published,
      'basic'::subscription_tier as access_level,
      created_at,
      updated_at,
      user_id
    FROM session_notes
    WHERE id = $1
  `,
    [contentId]
  );

  if (note) {
    // Check if user has access to the note
    if (note.user_id !== userId && !note.is_published && !isAdmin) {
      return {
        found: false,
        error: 'Note is private and not accessible',
        code: 'PRIVATE_CONTENT',
      };
    }

    // Remove user_id from response
    const { user_id, ...noteWithoutUserId } = note;

    return {
      found: true,
      item: ContentItemSchema.parse(noteWithoutUserId),
    };
  }

  // Content not found in any table
  return {
    found: false,
    error: 'Content item not found',
    code: 'CONTENT_NOT_FOUND',
  };
}

/**
 * Record content access for analytics
 */
async function recordContentAccess(
  userId: string,
  contentId: string,
  contentType: string
): Promise<void> {
  try {
    await db.query(
      `
      INSERT INTO content_access_log (
        user_id, content_id, content_type, accessed_at
      )
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, content_id, DATE(accessed_at))
      DO UPDATE SET access_count = content_access_log.access_count + 1
    `,
      [userId, contentId, contentType]
    );
  } catch (error) {
    // Log but don't fail the request if analytics logging fails
    console.warn('Failed to record content access:', error);
  }
}

/**
 * GET /api/workbook/content/[id] - Get specific content item
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();

  try {
    // Validate content ID parameter
    let validatedParams;
    try {
      validatedParams = validateUuidParam({ id: params.id });
    } catch (error) {
      // Content ID might not be UUID (for lessons), so try as string
      if (!params.id || params.id.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Content ID is required',
            timestamp: Date.now(),
          },
          { status: 400 }
        );
      }
      validatedParams = { id: params.id };
    }

    const contentId = validatedParams.id;

    // Authenticate request
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json(
        {
          success: false,
          error: auth.error,
          timestamp: Date.now()
        },
        { status: auth.status }
      );
    }

    // Check permissions
    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.VIEW_CONTENT)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient permissions to view content',
          timestamp: Date.now(),
        },
        { status: 403 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(auth.session.userId, 'GET')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          timestamp: Date.now(),
        },
        { status: 429 }
      );
    }

    // Ensure workbook_user exists and get user info
    const workbookUser = await ensureWorkbookUser(auth.session);

    // Check workshop access
    if (!workbookUser.workshopAccessGranted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Workshop access not granted. Please contact support.',
          timestamp: Date.now(),
        },
        { status: 403 }
      );
    }

    // Find content item
    const isAdmin = hasPermission(auth.session, WORKBOOK_PERMISSIONS.ADMIN);
    const contentResult = await findContentItem(
      contentId,
      workbookUser.subscriptionTier,
      workbookUser.id,
      isAdmin
    );

    if (!contentResult.found) {
      const statusCode = contentResult.code === 'CONTENT_NOT_FOUND' ? 404 : 403;
      return NextResponse.json(
        {
          success: false,
          error: contentResult.error || 'Content not accessible',
          code: contentResult.code,
          timestamp: Date.now(),
        },
        { status: statusCode }
      );
    }

    const contentItem = contentResult.item!;

    // Record access for analytics (async, don't wait)
    recordContentAccess(
      workbookUser.id,
      contentId,
      contentItem.type
    ).catch(console.warn);

    // Build successful response
    const response = {
      success: true as const,
      data: contentItem,
      message: 'Content retrieved successfully',
      timestamp: Date.now(),
    };

    // Add performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      const responseTime = Date.now() - startTime;
      console.log(`Content item API response time: ${responseTime}ms`);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Content item GET error:', error);

    // Handle specific error types
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: Date.now(),
        },
        { status: 400 }
      );
    }

    if (error instanceof DatabaseError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database error occurred',
          code: 'DATABASE_ERROR',
          timestamp: Date.now(),
        },
        { status: 500 }
      );
    }

    // Generic error handling
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch content',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/workbook/content/[id] - Update content item (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate content ID parameter
    let validatedParams;
    try {
      validatedParams = validateUuidParam({ id: params.id });
    } catch (error) {
      if (!params.id || params.id.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Content ID is required',
            timestamp: Date.now(),
          },
          { status: 400 }
        );
      }
      validatedParams = { id: params.id };
    }

    // Authenticate request
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json(
        {
          success: false,
          error: auth.error,
          timestamp: Date.now()
        },
        { status: auth.status }
      );
    }

    // Check admin permissions
    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.ADMIN)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Administrative permissions required to update content',
          timestamp: Date.now(),
        },
        { status: 403 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(auth.session.userId, 'PUT')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          timestamp: Date.now(),
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Content update endpoint not yet implemented',
        message: 'This feature is planned for future release. Content can be updated through specific module and lesson endpoints.',
        timestamp: Date.now(),
      },
      { status: 501 }
    );

  } catch (error) {
    console.error('Content PUT error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update content',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workbook/content/[id] - Delete content item (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate content ID parameter
    let validatedParams;
    try {
      validatedParams = validateUuidParam({ id: params.id });
    } catch (error) {
      if (!params.id || params.id.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Content ID is required',
            timestamp: Date.now(),
          },
          { status: 400 }
        );
      }
      validatedParams = { id: params.id };
    }

    // Authenticate request
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json(
        {
          success: false,
          error: auth.error,
          timestamp: Date.now()
        },
        { status: auth.status }
      );
    }

    // Check admin permissions
    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.ADMIN)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Administrative permissions required to delete content',
          timestamp: Date.now(),
        },
        { status: 403 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(auth.session.userId, 'DELETE')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          timestamp: Date.now(),
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Content deletion endpoint not yet implemented',
        message: 'This feature is planned for future release. Content can be deleted through specific module and lesson endpoints.',
        timestamp: Date.now(),
      },
      { status: 501 }
    );

  } catch (error) {
    console.error('Content DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete content',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}