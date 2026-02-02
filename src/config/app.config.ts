export default () => ({
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Firebase
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  },

  // CurrencyAPI
  currencyApi: {
    apiKey: process.env.CURRENCY_API_KEY || '',
    baseUrl: process.env.CURRENCY_API_BASE_URL || 'https://api.currencyapi.com/v3',
    timeout: parseInt(process.env.CURRENCY_API_TIMEOUT || '10000', 10),
    maxRetries: parseInt(process.env.CURRENCY_API_MAX_RETRIES || '3', 10),
  },

  // Cache
  cache: {
    memoryTtlMinutes: parseInt(process.env.MEMORY_CACHE_TTL_MINUTES || '5', 10),
    dbTtlHours: parseInt(process.env.DB_CACHE_TTL_HOURS || '24', 10),
  },

  // Cookie
  cookie: {
    secret: process.env.COOKIE_SECRET || '',
    maxAgeDays: parseInt(process.env.COOKIE_MAX_AGE_DAYS || '365', 10),
  },
});
