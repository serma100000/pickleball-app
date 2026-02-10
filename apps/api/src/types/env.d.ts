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

    // DUPR Integration
    DUPR_CLIENT_ID?: string;
    DUPR_CLIENT_KEY?: string;
    DUPR_CLIENT_SECRET?: string;
    DUPR_ENVIRONMENT?: 'uat' | 'production';
    DUPR_WEBHOOK_SECRET?: string;

    // Stripe Payments
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
  }
}

export {};
