import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { FirebaseService } from '../firebase/firebase.service';
import { ExternalApiService } from '../external-api/external-api.service';
import type { RatesResponse } from './dto/currency.dto';

/**
 * CurrencyService - service for working with currencies
 *
 * Implements two-level caching:
 * 1. RAM cache (CacheService) - 5 minutes
 * 2. DB cache (FirebaseService) - 24 hours
 * 3. External API (ExternalApiService) - if cache is empty
 */
@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly firebaseService: FirebaseService,
    private readonly externalApiService: ExternalApiService,
  ) {}

  /**
   * Get list of supported currencies
   * @returns {Promise<string[]>} Array of currency codes
   */
  async getSupportedCurrencies(): Promise<string[]> {
    const cacheKey = 'currencies';

    // 1. Check RAM cache
    const cached = this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug('Currencies from RAM cache');
      return cached as string[];
    }

    // 2. Request from external API (DB cache not used for currencies)
    const currencies = await this.externalApiService.getSupportedCurrencies();

    // 3. Save to RAM cache
    this.cacheService.set(cacheKey, currencies);

    return currencies;
  }

  /**
   * Get exchange rates
   * @param {string | undefined} base - Base currency
   * @param {string[]} targets - Target currencies
   * @param {string} [userId] - Optional user ID to get default base currency
   * @returns {Promise<RatesResponse>} Exchange rates response
   */
  async getExchangeRates(
    base: string | undefined,
    targets: string[],
    userId?: string,
  ): Promise<RatesResponse> {

    // If base not specified - get from user settings
    let actualBase = base;
    if (!actualBase && userId) {
      const user = await this.firebaseService.getUser(userId);
      actualBase = user?.base_currency;
    }
    if (!actualBase) {
      actualBase = 'USD';
    }

    const cacheKey = this.cacheService.generateKey('rates', {
      base: actualBase,
      targets,
    });

    // 1. Check RAM cache
    const cached = this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug('Rates from RAM cache');
      return cached as RatesResponse;
    }

    // 2. Check DB cache (Firebase)
    const dbCached = await this.firebaseService.getRatesFromCache(actualBase, targets);
    if (dbCached) {
      this.logger.debug('Rates from DB cache');
      const response: RatesResponse = {
        base: actualBase,
        rates: dbCached,
        timestamp: new Date().toISOString(),
      };
      // Save to RAM cache
      this.cacheService.set(cacheKey, response);
      return response;
    }

    // 3. Request from external API
    this.logger.debug('Rates from external API');
    const rates = await this.externalApiService.getExchangeRates(actualBase, targets);

    const response: RatesResponse = {
      base: actualBase,
      rates,
      timestamp: new Date().toISOString(),
    };

    // 4. Save to DB cache (24 hours)
    await this.firebaseService.saveRatesToCache(actualBase, targets, rates);

    // 5. Save to RAM cache (5 minutes)
    this.cacheService.set(cacheKey, response);

    return response;
  }
}
