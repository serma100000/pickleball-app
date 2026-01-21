declare namespace NodeJS {
  interface ProcessEnv {
    PORT?: string;
    NODE_ENV: 'development' | 'production' | 'test';
    DATABASE_URL: string;
    CLERK_SECRET_KEY: string;
    CLERK_PUBLISHABLE_KEY: string;
    REDIS_URL: string;
    CORS_ORIGIN: string;
    RATE_LIMIT_MAX?: string;
    RATE_LIMIT_WINDOW_MS?: string;
    WS_PORT?: string;
    ENABLE_WEBSOCKETS?: string;
    ENABLE_RATE_LIMITING?: string;
  }
}

export {};
