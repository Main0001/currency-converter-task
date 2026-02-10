/**
 * Object with currency codes and their exchange rates
 */
export interface ExchangeRates {
  [currency: string]: number;
}

/**
 * RatesCache - exchange rates cache structure in Firestore
 */
export interface RatesCache {
  base: string;              // Base currency (USD, EUR, etc)
  rates: ExchangeRates;      // Exchange rates
  cached_at: number;         // When cached (timestamp)
  expires_at: number;        // When cache expires (timestamp)
}
