import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

let redisClient: RedisClient | null = null;
let isConnecting = false;

/**
 * Initialize Redis connection
 */
export async function initRedis(): Promise<RedisClient | null> {
  if (redisClient) {
    return redisClient;
  }

  if (isConnecting) {
    // Wait for existing connection attempt
    return new Promise((resolve) => {
      const checkConnection = setInterval(() => {
        if (redisClient || !isConnecting) {
          clearInterval(checkConnection);
          resolve(redisClient);
        }
      }, 100);
    });
  }

  isConnecting = true;

  try {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';

    redisClient = createClient({
      url,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis: Max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis: Connected');
    });

    redisClient.on('reconnecting', () => {
      console.log('Redis: Reconnecting...');
    });

    await redisClient.connect();
    isConnecting = false;
    return redisClient;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    isConnecting = false;
    redisClient = null;
    return null;
  }
}

/**
 * Get Redis client (may be null if not connected)
 */
export function getRedisClient(): RedisClient | null {
  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

/**
 * Cache helper functions
 */
export const cache = {
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!redisClient) return null;

    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },

  /**
   * Set value in cache with optional TTL (seconds)
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    if (!redisClient) return false;

    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await redisClient.setEx(key, ttlSeconds, serialized);
      } else {
        await redisClient.set(key, serialized);
      }
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<boolean> {
    if (!redisClient) return false;

    try {
      await redisClient.del(key);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Delete all keys matching pattern
   */
  async delPattern(pattern: string): Promise<boolean> {
    if (!redisClient) return false;

    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!redisClient) return false;

    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch {
      return false;
    }
  },

  /**
   * Set TTL on existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (!redisClient) return false;

    try {
      await redisClient.expire(key, ttlSeconds);
      return true;
    } catch {
      return false;
    }
  },
};

// Initialize Redis on module load (non-blocking)
initRedis().catch(console.error);
