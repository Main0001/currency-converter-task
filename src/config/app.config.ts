import env from 'env-var';

export default () => ({
  // Server
  port: env.get('PORT').default('3000').asPortNumber(),
  nodeEnv: env.get('NODE_ENV').default('development').asString(),

  // Firebase
  firebase: {
    projectId: env.get('FIREBASE_PROJECT_ID').required().asString(),
    clientEmail: env.get('FIREBASE_CLIENT_EMAIL').required().asString(),
    privateKey: env
      .get('FIREBASE_PRIVATE_KEY')
      .required()
      .asString()
      .replace(/\\n/g, '\n'),
  },

  // CurrencyAPI
  currencyApi: {
    apiKey: env.get('CURRENCY_API_KEY').required().asString(),
    baseUrl: env
      .get('CURRENCY_API_BASE_URL')
      .default('https://api.currencyapi.com/v3')
      .asString(),
    timeoutMs: env.get('CURRENCY_API_TIMEOUT_MS').default('10000').asInt(), // ms
    maxRetries: env.get('CURRENCY_API_MAX_RETRIES').default('3').asInt(),
  },

  // Cache
  cache: {
    memoryCacheTtlMs: env.get('MEMORY_CACHE_TTL_MS').default('300000').asInt(), // ms (5 minutes)
    dbCacheTtlMs: env.get('DB_CACHE_TTL_MS').default('86400000').asInt(), // ms (24 hours)
  },

  // Cookie
  cookie: {
    secret: env.get('COOKIE_SECRET').required().asString(),
    maxAgeDays: env.get('COOKIE_MAX_AGE_DAYS').default('365').asInt(),
  },
});
