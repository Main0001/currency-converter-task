import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { FirebaseService } from '../firebase/firebase.service';
import { ExternalApiService } from '../external-api/external-api.service';
import type { RatesResponse } from './dto/currency.dto';

/**
 * CurrencyService - сервис для работы с валютами
 *
 * Реализует двухуровневое кеширование:
 * 1. RAM кеш (CacheService) - 5 минут
 * 2. DB кеш (FirebaseService) - 24 часа
 * 3. Внешний API (ExternalApiService) - если кеш пустой
 */
@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly firebaseService: FirebaseService,
    private readonly externalApiService: ExternalApiService,
  ) {}

  //Получить список поддерживаемых валют
  async getSupportedCurrencies(): Promise<string[]> {
    const cacheKey = 'currencies';

    // 1. Проверяем RAM кеш
    const cached = this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug('Currencies from RAM cache');
      return cached as string[];
    }

    // 2. Запрос к внешнему API (для currencies не используем DB кеш)
    const currencies = await this.externalApiService.getSupportedCurrencies();

    // 3. Сохраняем в RAM кеш
    this.cacheService.set(cacheKey, currencies);

    return currencies;
  }

  //Получить курсы валют
  async getExchangeRates(
    base: string | undefined,
    targets: string[],
    userId?: string,
  ): Promise<RatesResponse> {
    
    // Если base не указан - получаем из настроек пользователя
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

    // 1. Проверяем RAM кеш
    const cached = this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug('Rates from RAM cache');
      return cached as RatesResponse;
    }

    // 2. Проверяем DB кеш (Firebase)
    const dbCached = await this.firebaseService.getRatesFromCache(actualBase, targets);
    if (dbCached) {
      this.logger.debug('Rates from DB cache');
      const response: RatesResponse = {
        base: actualBase,
        rates: dbCached,
        timestamp: new Date().toISOString(),
      };
      // Сохраняем в RAM кеш
      this.cacheService.set(cacheKey, response);
      return response;
    }

    // 3. Запрос к внешнему API
    this.logger.debug('Rates from external API');
    const rates = await this.externalApiService.getExchangeRates(actualBase, targets);

    const response: RatesResponse = {
      base: actualBase,
      rates,
      timestamp: new Date().toISOString(),
    };

    // 4. Сохраняем в DB кеш (24 часа)
    await this.firebaseService.saveRatesToCache(actualBase, targets, rates);

    // 5. Сохраняем в RAM кеш (5 минут)
    this.cacheService.set(cacheKey, response);

    return response;
  }
}
