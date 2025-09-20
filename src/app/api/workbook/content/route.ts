// T030: Content Management API - Unified content access and management
// GET /api/workbook/content - List and search content items with filtering
// POST /api/workbook/content - Create new content items (admin only)

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  extractToken,
  verifyToken,
  validateSession,
  hasPermission,
  WORKBOOK_PERMISSIONS,
} from '@/lib/workbook-auth';
import db, { DatabaseError, ValidationError } from '@/lib/database';
import {
  validateModuleAccess,
  sanitizeSearchInput,
  validatePagination,
  PaginatedResponseSchema,
  SuccessResponseSchema,
  WorkbookErrorResponseSchema,
  ContentItemSchema,
  type ContentItem,
  type ContentType,
  type SubscriptionTier,
} from '@/lib/validation/workbook-schemas';

// Rate limiting configuration
const RATE_LIMITS = {
  LIST_CONTENT: { limit: 100, windowMs: 60000 }, // 100 requests per minute
  CREATE_CONTENT: { limit: 10, windowMs: 60000 }, // 10 creates per minute (admin only)
  SEARCH_CONTENT: { limit: 50, windowMs: 60000 }, // 50 searches per minute
};

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check rate limit for a specific operation
 */
function checkRateLimit(
  userId: string,
  operation: keyof typeof RATE_LIMITS
): boolean {
  const config = RATE_LIMITS[operation];
  const now = Date.now();
  const key = `${operation}_${userId}`;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return true;
  }

  if (record.count >= config.limit) {
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
 * Parse and validate query parameters for content listing
 */
function parseContentQuery(url: URL): {
  page: number;
  limit: number;
  type?: ContentType;
  moduleId?: string;
  lessonId?: string;
  tag?: string;
  search?: string;
  published?: boolean;
  accessLevel?: SubscriptionTier;
} {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const type = url.searchParams.get('type') as ContentType;
  const moduleId = url.searchParams.get('moduleId') || undefined;
  const lessonId = url.searchParams.get('lessonId') || undefined;
  const tag = url.searchParams.get('tag') || undefined;
  const search = url.searchParams.get('search') || undefined;
  const publishedParam = url.searchParams.get('published');
  const published = publishedParam ? publishedParam === 'true' : undefined;
  const accessLevel = url.searchParams.get('accessLevel') as SubscriptionTier;

  return {
    page,
    limit,
    type,
    moduleId,
    lessonId,
    tag,
    search,
    published,
    accessLevel,
  };
}

/**
 * Build content query with filters
 */
function buildContentQuery(
  filters: ReturnType<typeof parseContentQuery>,
  userTier: SubscriptionTier,
  isAdmin: boolean
): { query: string; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  // Base query - we'll create a virtual content table from multiple sources
  let baseQuery = `
    WITH content_items AS (
      -- Workshop modules as content
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
      WHERE is_published = true

      UNION ALL

      -- Workshop lessons as content
      SELECT
        'lesson'::text as type,
        id::text as id,
        title,
        NULL::text as description,
        NULL::text as url,
        content::text as content,
        '{"source": "workshop_lessons"}'::jsonb as metadata,
        module_id,
        id::text as lesson_id,
        '[]'::jsonb as tags,
        is_published,
        'basic'::subscription_tier as access_level,
        created_at,
        updated_at
      FROM workshop_lessons
      WHERE is_published = true

      UNION ALL

      -- User session notes as content (public ones only)
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
        updated_at
      FROM session_notes
      WHERE is_public = true
    )
    SELECT * FROM content_items
  `;

  // Apply filters
  if (filters.type) {
    conditions.push(`type = $${paramIndex}`);
    params.push(filters.type);
    paramIndex++;
  }

  if (filters.moduleId) {
    conditions.push(`module_id = $${paramIndex}`);
    params.push(filters.moduleId);
    paramIndex++;
  }

  if (filters.lessonId) {
    conditions.push(`lesson_id = $${paramIndex}`);
    params.push(filters.lessonId);
    paramIndex++;
  }

  if (filters.tag) {
    const sanitizedTag = sanitizeSearchInput(filters.tag);
    conditions.push(`tags @> $${paramIndex}`);
    params.push(JSON.stringify([sanitizedTag]));
    paramIndex++;
  }

  if (filters.search) {
    const sanitizedSearch = sanitizeSearchInput(filters.search);
    conditions.push(`(
      title ILIKE $${paramIndex} OR
      description ILIKE $${paramIndex} OR
      content ILIKE $${paramIndex}
    )`);
    params.push(`%${sanitizedSearch}%`);
    paramIndex++;
  }

  if (filters.published !== undefined) {
    conditions.push(`is_published = $${paramIndex}`);
    params.push(filters.published);
    paramIndex++;
  } else if (!isAdmin) {
    // Non-admin users only see published content
    conditions.push(`is_published = true`);
  }

  if (filters.accessLevel) {
    conditions.push(`access_level = $${paramIndex}`);
    params.push(filters.accessLevel);
    paramIndex++;
  }

  // Add WHERE clause if there are conditions
  if (conditions.length > 0) {
    baseQuery += ` WHERE ${conditions.join(' AND ')}`;
  }

  return { query: baseQuery, params };
}

/**
 * Get accessible content for user
 */
async function getAccessibleContent(
  filters: ReturnType<typeof parseContentQuery>,
  userTier: SubscriptionTier,
  isAdmin: boolean
): Promise<{
  items: ContentItem[];
  total: number;
  totalPages: number;
}> {
  const { page, limit } = validatePagination(filters.page, filters.limit);
  const offset = (page - 1) * limit;

  // Build query
  const { query: baseQuery, params } = buildContentQuery(filters, userTier, isAdmin);

  // Get total count
  const countQuery = `
    WITH content_query AS (${baseQuery})
    SELECT COUNT(*) as total FROM content_query
  `;

  const countResult = await db.queryOne(countQuery, params);
  const total = parseInt(countResult?.total || '0');
  const totalPages = Math.ceil(total / limit);

  // Get paginated results
  const itemsQuery = `
    WITH content_query AS (${baseQuery})
    SELECT * FROM content_query
    ORDER BY created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  params.push(limit, offset);
  const items = await db.query(itemsQuery, params);

  // Transform and validate items
  const validatedItems: ContentItem[] = items.map((item: any) => {
    // Check if user has access based on subscription tier
    const hasAccess = validateModuleAccess(userTier, item.access_level);

    return ContentItemSchema.parse({
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      url: item.url,
      content: hasAccess ? item.content : null,
      metadata: item.metadata || {},
      moduleId: item.module_id,
      lessonId: item.lesson_id,
      tags: item.tags || [],
      isPublished: item.is_published,
      accessLevel: item.access_level,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  });

  return {
    items: validatedItems,
    total,
    totalPages,
  };
}

/**
 * GET /api/workbook/content - List and search content items
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
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

    // Determine rate limit operation
    const url = new URL(request.url);
    const isSearch = url.searchParams.has('search');
    const operation = isSearch ? 'SEARCH_CONTENT' : 'LIST_CONTENT';

    // Rate limiting
    if (!checkRateLimit(auth.session.userId, operation)) {
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

    // Parse query parameters
    const filters = parseContentQuery(url);
    const isAdmin = hasPermission(auth.session, WORKBOOK_PERMISSIONS.ADMIN);

    // Get accessible content
    const contentResult = await getAccessibleContent(
      filters,
      workbookUser.subscriptionTier,
      isAdmin
    );

    // Build pagination metadata
    const pagination = {
      page: filters.page,
      limit: filters.limit,
      total: contentResult.total,
      totalPages: contentResult.totalPages,
      hasNext: filters.page < contentResult.totalPages,
      hasPrev: filters.page > 1,
    };

    // Build successful response
    const response = {
      success: true as const,
      data: contentResult.items,
      pagination,
      filters: {
        type: filters.type,
        moduleId: filters.moduleId,
        lessonId: filters.lessonId,
        tag: filters.tag,
        search: filters.search,
        published: filters.published,
        accessLevel: filters.accessLevel,
      },
      message: `Found ${contentResult.items.length} content items`,
      timestamp: Date.now(),
    };

    // Validate response schema
    try {
      const validatedResponse = PaginatedResponseSchema(ContentItemSchema).parse(response);

      // Add performance metrics in development
      if (process.env.NODE_ENV === 'development') {
        const responseTime = Date.now() - startTime;
        console.log(`Content API response time: ${responseTime}ms`);
      }

      return NextResponse.json(validatedResponse);
    } catch (error) {
      console.error('Content response validation error:', error);
      throw new Error('Failed to validate response format');
    }

  } catch (error) {
    console.error('Content GET error:', error);

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
 * POST /api/workbook/content - Create new content item (admin only)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
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
          error: 'Administrative permissions required to create content',
          timestamp: Date.now(),
        },
        { status: 403 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(auth.session.userId, 'CREATE_CONTENT')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          timestamp: Date.now(),
        },
        { status: 429 }
      );
    }

    // For now, return not implemented
    // In a full implementation, this would:
    // 1. Parse and validate the request body
    // 2. Create content in appropriate table based on type
    // 3. Handle file uploads for documents/images
    // 4. Update search indexes
    // 5. Return the created content item

    return NextResponse.json(
      {
        success: false,
        error: 'Content creation endpoint not yet implemented',
        message: 'This feature is planned for future release. Content can be created through module and lesson management interfaces.',
        timestamp: Date.now(),
      },
      { status: 501 }
    );

  } catch (error) {
    console.error('Content POST error:', error);

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
        error: 'Failed to create content',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}