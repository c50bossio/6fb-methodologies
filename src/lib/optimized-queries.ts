/**
 * Optimized Database Queries with Caching for 6FB Workbook System
 * High-performance query functions with Redis caching integration
 */

import db from './database';
import {
  cache,
  generateCacheKey,
  CACHE_PREFIXES,
  CACHE_TTL,
  CACHE_TAGS,
  cacheInvalidator,
} from './redis-cache';
import { ModuleListItem, UserProgress, ProgressSummary } from './validation/workbook-schemas';

// Simple performance monitoring utility
const logQueryPerformance = (operation: string, startTime: number, error?: Error) => {
  const duration = Date.now() - startTime;
  if (error) {
    console.error(`❌ Query failed: ${operation} after ${duration}ms`, error);
  } else if (duration > 1000) {
    console.warn(`🐌 Slow query detected: ${operation} took ${duration}ms`);
  }
};

/**
 * Optimized query service with caching
 */
export class OptimizedQueryService {
  private static instance: OptimizedQueryService;

  static getInstance(): OptimizedQueryService {
    if (!OptimizedQueryService.instance) {
      OptimizedQueryService.instance = new OptimizedQueryService();
    }
    return OptimizedQueryService.instance;
  }

  /**
   * Get user modules with progress in a single optimized query
   */
  // Performance monitoring: getUserModulesWithProgress
  async getUserModulesWithProgress(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      publishedOnly?: boolean;
      includeProgress?: boolean;
      tag?: string;
      difficulty?: string;
    } = {}
  ): Promise<{
    modules: ModuleListItem[];
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    const {
      page = 1,
      limit = 50,
      publishedOnly = true,
      includeProgress = true,
      tag,
      difficulty,
    } = options;

    // Generate cache key
    const cacheKey = generateCacheKey(
      CACHE_PREFIXES.USER_MODULES,
      userId,
      { page, limit, publishedOnly, includeProgress, tag, difficulty }
    );

    // Try to get from cache first
    const cached = await cache.get<{
      modules: ModuleListItem[];
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    // Use optimized database function
    const offset = (page - 1) * limit;

    try {
      // Get total count efficiently
      let countQuery = `
        SELECT COUNT(*) as total
        FROM workshop_modules wm
        WHERE ($1 = false OR wm.is_published = true)
      `;
      const countParams: any[] = [publishedOnly];
      let paramIndex = 2;

      // Add filters
      if (difficulty) {
        countQuery += ` AND wm.difficulty_level = $${paramIndex}`;
        countParams.push(difficulty);
        paramIndex++;
      }

      if (tag) {
        countQuery += ` AND wm.tags @> $${paramIndex}`;
        countParams.push(JSON.stringify([tag]));
        paramIndex++;
      }

      const countResult = await db.queryOne(countQuery, countParams);
      const total = parseInt(countResult?.total || '0', 10);
      const totalPages = Math.ceil(total / limit);

      // Get modules with progress using optimized function
      const modulesResult = await db.query(
        `SELECT * FROM get_user_modules_with_progress($1, $2, $3, $4)`,
        [userId, limit, offset, publishedOnly]
      );

      // Transform to response format
      const modules: ModuleListItem[] = modulesResult.map((row: any) => ({
        id: row.module_id,
        title: row.module_title,
        description: row.module_description,
        moduleOrder: row.module_order,
        durationMinutes: row.duration_minutes,
        difficultyLevel: row.difficulty_level,
        tags: row.tags || [],
        isPublished: row.is_published,
        prerequisitesMet: true, // This could be enhanced with prerequisite checking
        progressPercentage: row.progress_percentage || 0,
        progressStatus: row.completed
          ? 'completed'
          : row.progress_percentage > 0
            ? 'in_progress'
            : 'not_started',
        lastAccessedAt: row.last_accessed?.toISOString(),
        completedAt: row.completed_at?.toISOString(),
      }));

      const result = {
        modules,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };

      // Cache the result
      await cache.set(
        cacheKey,
        result,
        CACHE_TTL.MEDIUM,
        [
          `${CACHE_TAGS.USER_DATA}:${userId}`,
          CACHE_TAGS.MODULE_DATA,
        ]
      );

      return result;
    } catch (error) {
      console.error('Error in getUserModulesWithProgress:', error);
      throw error;
    }
  }

  /**
   * Get user progress summary with analytics
   */
  // Performance monitoring: getUserProgressSummary
  async getUserProgressSummary(userId: string): Promise<ProgressSummary> {
    const cacheKey = generateCacheKey(CACHE_PREFIXES.USER_ANALYTICS, userId);

    return await cache.getOrSet(
      cacheKey,
      async () => {
        // Use optimized database function
        const analyticsResult = await db.queryOne(
          `SELECT * FROM get_user_analytics($1)`,
          [userId]
        );

        // Get recent activity
        const recentActivity = await db.query(
          `
          SELECT
            up.module_id,
            wm.title as module_name,
            up.progress_percentage,
            up.last_accessed
          FROM user_progress up
          INNER JOIN workshop_modules wm ON up.module_id = wm.id
          WHERE up.user_id = $1
          ORDER BY up.last_accessed DESC NULLS LAST
          LIMIT 10
        `,
          [userId]
        );

        const summary: ProgressSummary = {
          userId,
          overallProgress: analyticsResult?.average_progress || 0,
          modulesStarted: analyticsResult?.modules_started || 0,
          modulesCompleted: analyticsResult?.modules_completed || 0,
          totalTimeSpent: analyticsResult?.total_time_spent_minutes || 0,
          lastActivityAt: analyticsResult?.last_activity_at,
          recentActivity: recentActivity.map((activity: any) => ({
            moduleId: activity.module_id,
            moduleName: activity.module_name,
            progressPercent: activity.progress_percentage || 0,
            lastAccessedAt: activity.last_accessed,
          })),
        };

        return summary;
      },
      CACHE_TTL.MEDIUM,
      [`${CACHE_TAGS.USER_DATA}:${userId}`, `${CACHE_TAGS.PROGRESS_DATA}:${userId}`]
    );
  }

  /**
   * Get module content with caching
   */
  // Performance monitoring: getModuleContent
  async getModuleContent(moduleId: string, userId?: string): Promise<any> {
    const cacheKey = generateCacheKey(
      CACHE_PREFIXES.MODULE_CONTENT,
      moduleId,
      userId ? { userId } : undefined
    );

    return await cache.getOrSet(
      cacheKey,
      async () => {
        const query = `
          SELECT
            wm.*,
            ${userId ? `
              up.progress_percentage,
              up.completed,
              up.last_accessed,
              up.completed_at
            ` : 'NULL as progress_percentage, NULL as completed, NULL as last_accessed, NULL as completed_at'}
          FROM workshop_modules wm
          ${userId ? 'LEFT JOIN user_progress up ON wm.id = up.module_id AND up.user_id = $2' : ''}
          WHERE wm.id = $1
        `;

        const params = userId ? [moduleId, userId] : [moduleId];
        const result = await db.queryOne(query, params);

        if (!result) {
          throw new Error('Module not found');
        }

        return result;
      },
      CACHE_TTL.LONG,
      [
        `${CACHE_TAGS.MODULE_DATA}:${moduleId}`,
        `${CACHE_TAGS.CONTENT_DATA}:${moduleId}`,
        ...(userId ? [`${CACHE_TAGS.USER_DATA}:${userId}`] : []),
      ]
    );
  }

  /**
   * Update user progress with cache invalidation
   */
  // Performance monitoring: updateUserProgress
  async updateUserProgress(
    userId: string,
    moduleId: string,
    progressData: {
      progressPercent: number;
      timeSpentMinutes?: number;
      completed?: boolean;
    }
  ): Promise<UserProgress> {
    const { progressPercent, timeSpentMinutes = 0, completed = false } = progressData;

    try {
      // Update in database using transaction
      const result = await db.transaction(async (client) => {
        const now = new Date();

        // Check if progress exists
        const existingProgress = await client.query(
          `
          SELECT id, progress_percentage, time_spent_seconds
          FROM user_progress
          WHERE user_id = $1 AND module_id = $2
        `,
          [userId, moduleId]
        );

        let progressRecord;

        if (existingProgress.rows.length > 0) {
          // Update existing progress
          progressRecord = await client.query(
            `
            UPDATE user_progress
            SET
              progress_percentage = $1,
              completed = COALESCE($2, completed),
              time_spent_seconds = time_spent_seconds + $3,
              last_accessed = $4,
              completed_at = CASE
                WHEN $2 = true AND completed_at IS NULL THEN $4
                ELSE completed_at
              END,
              updated_at = $4
            WHERE user_id = $5 AND module_id = $6
            RETURNING *
          `,
            [
              progressPercent,
              completed,
              timeSpentMinutes * 60,
              now,
              userId,
              moduleId,
            ]
          );
        } else {
          // Create new progress record
          const progressId = crypto.randomUUID();
          progressRecord = await client.query(
            `
            INSERT INTO user_progress (
              id, user_id, module_id, progress_percentage,
              completed, time_spent_seconds, last_accessed,
              completed_at, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $7, $7)
            RETURNING *
          `,
            [
              progressId,
              userId,
              moduleId,
              progressPercent,
              completed,
              timeSpentMinutes * 60,
              now,
              completed ? now : null,
            ]
          );
        }

        return progressRecord.rows[0];
      });

      // Invalidate relevant caches
      await Promise.all([
        cacheInvalidator.invalidateUserCache(userId),
        // Also invalidate module-specific caches that might include progress
        cache.deletePattern(`${CACHE_PREFIXES.MODULE_CONTENT}:${moduleId}:*${userId}*`),
      ]);

      // Transform to UserProgress format
      const userProgress: UserProgress = {
        id: result.id,
        userId: result.user_id,
        moduleId: result.module_id,
        progressPercent: result.progress_percentage,
        status: result.completed
          ? 'completed'
          : result.progress_percentage > 0
            ? 'in_progress'
            : 'not_started',
        timeSpentMinutes: Math.round((result.time_spent_seconds || 0) / 60),
        lastAccessedAt: result.last_accessed,
        completedAt: result.completed_at,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      };

      return userProgress;
    } catch (error) {
      console.error('Error updating user progress:', error);
      throw error;
    }
  }

  /**
   * Search content with caching
   */
  // Performance monitoring: searchContent
  async searchContent(
    query: string,
    userId: string,
    options: {
      type?: 'modules' | 'notes' | 'transcriptions' | 'all';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<any[]> {
    const { type = 'all', limit = 20, offset = 0 } = options;

    const cacheKey = generateCacheKey(
      CACHE_PREFIXES.SEARCH_RESULTS,
      `${query}:${type}`,
      { userId, limit, offset }
    );

    return await cache.getOrSet(
      cacheKey,
      async () => {
        let searchQuery = '';
        const params: any[] = [query, userId, limit, offset];

        switch (type) {
          case 'modules':
            searchQuery = `
              SELECT
                'module' as type,
                wm.id,
                wm.title,
                wm.description,
                ts_rank(wm.search_vector, plainto_tsquery($1)) as rank
              FROM workshop_modules wm
              WHERE wm.search_vector @@ plainto_tsquery($1)
                AND wm.is_published = true
              ORDER BY rank DESC
              LIMIT $3 OFFSET $4
            `;
            break;

          case 'notes':
            searchQuery = `
              SELECT
                'note' as type,
                sn.id,
                sn.title,
                sn.content,
                ts_rank(sn.search_vector, plainto_tsquery($1)) as rank
              FROM session_notes sn
              WHERE sn.search_vector @@ plainto_tsquery($1)
                AND sn.user_id = $2
              ORDER BY rank DESC
              LIMIT $3 OFFSET $4
            `;
            break;

          case 'transcriptions':
            searchQuery = `
              SELECT
                'transcription' as type,
                t.id,
                t.text,
                t.summary,
                ts_rank(t.search_vector, plainto_tsquery($1)) as rank
              FROM transcriptions t
              WHERE t.search_vector @@ plainto_tsquery($1)
                AND t.user_id = $2
                AND t.status = 'completed'
              ORDER BY rank DESC
              LIMIT $3 OFFSET $4
            `;
            break;

          default: // 'all'
            searchQuery = `
              (
                SELECT
                  'module' as type,
                  wm.id,
                  wm.title as title,
                  wm.description as content,
                  ts_rank(wm.search_vector, plainto_tsquery($1)) as rank
                FROM workshop_modules wm
                WHERE wm.search_vector @@ plainto_tsquery($1)
                  AND wm.is_published = true
              )
              UNION ALL
              (
                SELECT
                  'note' as type,
                  sn.id,
                  sn.title,
                  sn.content,
                  ts_rank(sn.search_vector, plainto_tsquery($1)) as rank
                FROM session_notes sn
                WHERE sn.search_vector @@ plainto_tsquery($1)
                  AND sn.user_id = $2
              )
              UNION ALL
              (
                SELECT
                  'transcription' as type,
                  t.id,
                  COALESCE(t.summary, t.text) as title,
                  t.text as content,
                  ts_rank(t.search_vector, plainto_tsquery($1)) as rank
                FROM transcriptions t
                WHERE t.search_vector @@ plainto_tsquery($1)
                  AND t.user_id = $2
                  AND t.status = 'completed'
              )
              ORDER BY rank DESC
              LIMIT $3 OFFSET $4
            `;
        }

        const results = await db.query(searchQuery, params);
        return results;
      },
      CACHE_TTL.SHORT, // Search results have shorter TTL
      [`${CACHE_TAGS.USER_DATA}:${userId}`]
    );
  }

  /**
   * Preload next module content for better UX
   */
  async preloadNextModule(currentModuleId: string, userId: string): Promise<void> {
    try {
      // Get next module in sequence
      const nextModule = await db.queryOne(
        `
        SELECT wm.id
        FROM workshop_modules wm
        INNER JOIN workshop_modules current ON current.id = $1
        WHERE wm.module_order > current.module_order
          AND wm.is_published = true
        ORDER BY wm.module_order ASC
        LIMIT 1
      `,
        [currentModuleId]
      );

      if (nextModule) {
        // Preload in background
        this.getModuleContent(nextModule.id, userId).catch(error => {
          console.log('Background preload failed (this is OK):', error.message);
        });
      }
    } catch (error) {
      // Preloading failures should not affect the main request
      console.log('Preload failed (this is OK):', error);
    }
  }
}

// Singleton instance
export const optimizedQueries = OptimizedQueryService.getInstance();
export default optimizedQueries;