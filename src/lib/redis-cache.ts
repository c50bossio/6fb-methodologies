/**
 * Redis Caching Layer for 6FB Workbook System
 * Provides high-performance caching for frequently accessed data
 */

import Redis from 'ioredis';

// Redis client configuration
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  enableOfflineQueue: true, // Enable offline queue for graceful Redis failures
  // Connection timeout
  connectTimeout: 5000,
  // Command timeout
  commandTimeout: 5000,
  // Retry strategy - exponential backoff with jitter
  retryStrategy: (times: number) => {
    if (times > 10) {
      console.error(`Redis retry attempts exceeded (${times}), giving up`);
      return null; // Stop retrying after 10 attempts
    }
    const delay = Math.min(times * 50 + Math.random() * 100, 2000);
    console.log(`Redis retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
  // Redis Cluster support (if using Redis Cluster)
  ...(process.env.REDIS_CLUSTER_NODES && {
    enableOfflineQueue: true, // Also enable for cluster mode
    redisOptions: {
      password: process.env.REDIS_PASSWORD,
    },
  }),
});

// Redis connection event handlers
redis.on('connect', () => {
  console.log('📡 Connected to Redis');
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});

redis.on('close', () => {
  console.log('📡 Redis connection closed');
});

// Cache key prefixes for organization
export const CACHE_PREFIXES = {
  USER_MODULES: 'user_modules',
  USER_PROGRESS: 'user_progress',
  MODULE_CONTENT: 'module_content',
  USER_ANALYTICS: 'user_analytics',
  SEARCH_RESULTS: 'search_results',
  RATE_LIMIT: 'rate_limit',
  SESSION_DATA: 'session_data',
  TRANSCRIPTION: 'transcription',
  USER_NOTES: 'user_notes',
  LIVE_SESSION: 'live_session',
} as const;

// Cache TTL values (in seconds)
export const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
  WEEK: 604800, // 7 days
} as const;

// Cache tags for invalidation
export const CACHE_TAGS = {
  USER_DATA: 'user_data',
  MODULE_DATA: 'module_data',
  PROGRESS_DATA: 'progress_data',
  CONTENT_DATA: 'content_data',
} as const;

/**
 * Generate cache key with prefix and optional parameters
 */
export function generateCacheKey(
  prefix: string,
  identifier: string,
  params?: Record<string, any>
): string {
  let key = `${prefix}:${identifier}`;

  if (params) {
    const sortedParams = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(':');

    if (sortedParams) {
      key += `:${sortedParams}`;
    }
  }

  return key;
}

/**
 * Cache wrapper with automatic serialization/deserialization
 */
export class CacheManager {
  private static instance: CacheManager;
  private redis: Redis;

  constructor() {
    this.redis = redis;
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Get cached data with automatic JSON parsing
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      if (!cached) return null;

      return JSON.parse(cached) as T;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached data with automatic JSON serialization
   */
  async set(
    key: string,
    value: any,
    ttl: number = CACHE_TTL.MEDIUM,
    tags: string[] = []
  ): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      const result = await this.redis.setex(key, ttl, serialized);

      // Add to tag sets for invalidation
      if (tags.length > 0) {
        const pipeline = this.redis.pipeline();
        tags.forEach(tag => {
          pipeline.sadd(`tag:${tag}`, key);
          pipeline.expire(`tag:${tag}`, ttl);
        });
        await pipeline.exec();
      }

      return result === 'OK';
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete cached data
   */
  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;

      const result = await this.redis.del(...keys);
      return result;
    } catch (error) {
      console.error(`Cache delete pattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    try {
      let totalDeleted = 0;

      for (const tag of tags) {
        const keys = await this.redis.smembers(`tag:${tag}`);
        if (keys.length > 0) {
          const deleted = await this.redis.del(...keys);
          totalDeleted += deleted;
        }
        // Clean up the tag set
        await this.redis.del(`tag:${tag}`);
      }

      return totalDeleted;
    } catch (error) {
      console.error(`Cache invalidate by tags error:`, error);
      return 0;
    }
  }

  /**
   * Get or set cached data with function
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl: number = CACHE_TTL.MEDIUM,
    tags: string[] = []
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // Fetch fresh data
      const freshData = await fetchFunction();

      // Cache the result
      await this.set(key, freshData, ttl, tags);

      return freshData;
    } catch (error) {
      console.error(`Cache getOrSet error for key ${key}:`, error);
      // Fallback to fetching without caching
      return await fetchFunction();
    }
  }

  /**
   * Increment counter with expiration
   */
  async increment(
    key: string,
    increment: number = 1,
    ttl?: number
  ): Promise<number> {
    try {
      // Check if Redis is available first
      if (!(await this.isAvailable())) {
        console.warn(`Redis unavailable for increment operation on key ${key}, returning fallback value`);
        return increment; // Return the increment value as fallback
      }

      const result = await this.redis.incrby(key, increment);

      if (ttl && result === increment) {
        // First time setting this key, set expiration
        await this.redis.expire(key, ttl);
      }

      return result;
    } catch (error) {
      console.error(`Cache increment error for key ${key}:`, error);
      // Return increment as fallback to avoid blocking operations
      return increment;
    }
  }

  /**
   * Check if cache is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Use a timeout to avoid hanging on connection issues
      const pingPromise = this.redis.ping();
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error('Redis ping timeout')), 1000);
      });

      const result = await Promise.race([pingPromise, timeoutPromise]);
      return result === 'PONG';
    } catch (error) {
      // Don't log every availability check failure to reduce noise
      if (process.env.NODE_ENV === 'development') {
        console.debug('Redis availability check failed:', error.message);
      }
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    memory: string;
    keys: number;
    hits: number;
    misses: number;
  }> {
    try {
      const info = await this.redis.info('memory');
      const dbInfo = await this.redis.info('keyspace');
      const stats = await this.redis.info('stats');

      // Parse memory usage
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memory = memoryMatch ? memoryMatch[1].trim() : 'unknown';

      // Parse key count
      const keysMatch = dbInfo.match(/keys=(\d+)/);
      const keys = keysMatch ? parseInt(keysMatch[1], 10) : 0;

      // Parse cache hits/misses
      const hitsMatch = stats.match(/keyspace_hits:(\d+)/);
      const missesMatch = stats.match(/keyspace_misses:(\d+)/);
      const hits = hitsMatch ? parseInt(hitsMatch[1], 10) : 0;
      const misses = missesMatch ? parseInt(missesMatch[1], 10) : 0;

      return {
        connected: true,
        memory,
        keys,
        hits,
        misses,
      };
    } catch (error) {
      console.error('Failed to get Redis stats:', error);
      return {
        connected: false,
        memory: 'unknown',
        keys: 0,
        hits: 0,
        misses: 0,
      };
    }
  }
}

// Singleton instance
export const cache = CacheManager.getInstance();

/**
 * Rate limiting using Redis
 */
export class RateLimiter {
  private cache: CacheManager;

  constructor() {
    this.cache = cache;
  }

  /**
   * Check and update rate limit
   */
  async checkLimit(
    identifier: string,
    limit: number,
    windowMs: number,
    operation: string = 'api'
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const key = generateCacheKey(CACHE_PREFIXES.RATE_LIMIT, `${operation}:${identifier}`);
    const windowSeconds = Math.ceil(windowMs / 1000);

    try {
      const current = await this.cache.increment(key, 1, windowSeconds);
      const remaining = Math.max(0, limit - current);
      const resetTime = Date.now() + windowMs;

      return {
        allowed: current <= limit,
        remaining,
        resetTime,
      };
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open - allow the request if Redis is down
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: Date.now() + windowMs,
      };
    }
  }

  /**
   * Reset rate limit for identifier
   */
  async resetLimit(identifier: string, operation: string = 'api'): Promise<boolean> {
    const key = generateCacheKey(CACHE_PREFIXES.RATE_LIMIT, `${operation}:${identifier}`);
    return await this.cache.delete(key);
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Cache invalidation helpers
 */
export class CacheInvalidator {
  private cache: CacheManager;

  constructor() {
    this.cache = cache;
  }

  /**
   * Invalidate user-related cache
   */
  async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      `${CACHE_PREFIXES.USER_MODULES}:${userId}:*`,
      `${CACHE_PREFIXES.USER_PROGRESS}:${userId}:*`,
      `${CACHE_PREFIXES.USER_ANALYTICS}:${userId}:*`,
      `${CACHE_PREFIXES.USER_NOTES}:${userId}:*`,
    ];

    for (const pattern of patterns) {
      await this.cache.deletePattern(pattern);
    }

    // Also invalidate by tags
    await this.cache.invalidateByTags([
      `${CACHE_TAGS.USER_DATA}:${userId}`,
      `${CACHE_TAGS.PROGRESS_DATA}:${userId}`,
    ]);
  }

  /**
   * Invalidate module-related cache
   */
  async invalidateModuleCache(moduleId: string): Promise<void> {
    const patterns = [
      `${CACHE_PREFIXES.MODULE_CONTENT}:${moduleId}:*`,
      `${CACHE_PREFIXES.USER_MODULES}:*:*:*:${moduleId}:*`,
    ];

    for (const pattern of patterns) {
      await this.cache.deletePattern(pattern);
    }

    await this.cache.invalidateByTags([
      `${CACHE_TAGS.MODULE_DATA}:${moduleId}`,
      `${CACHE_TAGS.CONTENT_DATA}:${moduleId}`,
    ]);
  }

  /**
   * Invalidate search cache
   */
  async invalidateSearchCache(): Promise<void> {
    await this.cache.deletePattern(`${CACHE_PREFIXES.SEARCH_RESULTS}:*`);
  }
}

export const cacheInvalidator = new CacheInvalidator();

// Export Redis instance for direct access if needed
export { redis };
export default cache;