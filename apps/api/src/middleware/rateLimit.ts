import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getRedisClient } from '../lib/redis.js';

interface RateLimitConfig {
  max: number;
  windowMs: number;
  keyGenerator?: (c: Context) => string;
  skip?: (c: Context) => boolean;
}

const defaultConfig: RateLimitConfig = {
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
};

// In-memory fallback when Redis is unavailable
const memoryStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting middleware with Redis backend (memory fallback)
 */
export async function rateLimiter(c: Context, next: Next) {
  const config = defaultConfig;

  // Skip rate limiting for health checks
  if (c.req.path === '/health') {
    await next();
    return;
  }

  // Generate rate limit key
  const key = config.keyGenerator
    ? config.keyGenerator(c)
    : `ratelimit:${getClientIdentifier(c)}`;

  const windowSeconds = Math.ceil(config.windowMs / 1000);
  const now = Date.now();

  try {
    const redis = getRedisClient();

    if (redis) {
      // Use Redis for distributed rate limiting
      const result = await redis.multi()
        .incr(key)
        .expire(key, windowSeconds)
        .exec();

      const count = result?.[0] as number || 1;
      const remaining = Math.max(0, config.max - count);
      const resetTime = now + config.windowMs;

      setRateLimitHeaders(c, config.max, remaining, resetTime);

      if (count > config.max) {
        throw new HTTPException(429, {
          message: 'Too many requests, please try again later',
        });
      }
    } else {
      // Fallback to in-memory rate limiting
      const entry = memoryStore.get(key);

      if (!entry || now > entry.resetTime) {
        memoryStore.set(key, { count: 1, resetTime: now + config.windowMs });
        setRateLimitHeaders(c, config.max, config.max - 1, now + config.windowMs);
      } else {
        entry.count++;
        const remaining = Math.max(0, config.max - entry.count);
        setRateLimitHeaders(c, config.max, remaining, entry.resetTime);

        if (entry.count > config.max) {
          throw new HTTPException(429, {
            message: 'Too many requests, please try again later',
          });
        }
      }
    }
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    // If rate limiting fails, allow request through
    console.error('Rate limiting error:', error);
  }

  await next();
}

/**
 * Create a custom rate limiter with specific config
 */
export function createRateLimiter(config: Partial<RateLimitConfig>) {
  const mergedConfig = { ...defaultConfig, ...config };

  return async (c: Context, next: Next) => {
    if (mergedConfig.skip?.(c)) {
      await next();
      return;
    }

    const key = mergedConfig.keyGenerator
      ? mergedConfig.keyGenerator(c)
      : `ratelimit:${getClientIdentifier(c)}`;

    const windowSeconds = Math.ceil(mergedConfig.windowMs / 1000);
    const now = Date.now();

    try {
      const redis = getRedisClient();

      if (redis) {
        const result = await redis.multi()
          .incr(key)
          .expire(key, windowSeconds)
          .exec();

        const count = result?.[0] as number || 1;
        const remaining = Math.max(0, mergedConfig.max - count);
        const resetTime = now + mergedConfig.windowMs;

        setRateLimitHeaders(c, mergedConfig.max, remaining, resetTime);

        if (count > mergedConfig.max) {
          throw new HTTPException(429, {
            message: 'Too many requests, please try again later',
          });
        }
      }
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      console.error('Rate limiting error:', error);
    }

    await next();
  };
}

function getClientIdentifier(c: Context): string {
  // Try to get user ID if authenticated
  const user = c.get('user');
  if (user?.userId) {
    return `user:${user.userId}`;
  }

  // Fall back to IP address
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    return `ip:${forwarded.split(',')[0].trim()}`;
  }

  return `ip:${c.req.header('x-real-ip') || 'unknown'}`;
}

function setRateLimitHeaders(
  c: Context,
  limit: number,
  remaining: number,
  resetTime: number
) {
  c.header('X-RateLimit-Limit', limit.toString());
  c.header('X-RateLimit-Remaining', remaining.toString());
  c.header('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
}

// Cleanup memory store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (now > entry.resetTime) {
      memoryStore.delete(key);
    }
  }
}, 60000);
