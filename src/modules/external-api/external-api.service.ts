import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  CurrenciesResponse,
  RatesResponse,
  RequestParams,
} from './types/external-api.types';
import type { ExchangeRates } from '../../types/currency.types';

@Injectable()
export class ExternalApiService {
  private readonly logger = new Logger(ExternalApiService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('currencyApi.apiKey')!;
    this.baseUrl = this.configService.get<string>('currencyApi.baseUrl')!;
    this.timeout = this.configService.get<number>('currencyApi.timeoutMs')!;
    this.maxRetries = this.configService.get<number>('currencyApi.maxRetries')!;

    if (!this.apiKey) {
      this.logger.warn('CURRENCY_API_KEY is not set!');
    }
  }

  /**
   * Get list of supported currencies
   * @returns {Promise<string[]>} Array of currency codes
   */
  async getSupportedCurrencies(): Promise<string[]> {
    const url = `${this.baseUrl}/currencies`;

    const response = await this.makeRequest<CurrenciesResponse>(url);

    // Extract currency codes from response
    const currencies = Object.keys(response.data);

    this.logger.log(`Fetched ${currencies.length} currencies from API`);
    return currencies;
  }

  /**
   * Get exchange rates
   * @param {string} base - Base currency
   * @param {string[]} targets - Target currencies
   * @returns {Promise<ExchangeRates>} Exchange rates object
   */
  async getExchangeRates(
    base: string,
    targets: string[],
  ): Promise<ExchangeRates> {
    const url = `${this.baseUrl}/latest`;
    const params: RequestParams = {
      base_currency: base,
      currencies: targets.join(','),
    };

    const response = await this.makeRequest<RatesResponse>(url, params);

    // Transform response into simple object { EUR: 0.85, GBP: 0.73 }
    const rates: ExchangeRates = {};

    for (const currency of Object.keys(response.data)) {
      rates[currency] = response.data[currency].value;
    }

    this.logger.log(`Fetched rates for ${base} -> ${targets.join(', ')}`);
    return rates;
  }

  /**
   * Execute HTTP request with retry logic
   * @param {string} url - Request URL
   * @param {RequestParams} [params] - Optional request parameters
   * @returns {Promise<T>} Response data
   * @private
   */
  private async makeRequest<T>(
    url: string,
    params?: RequestParams,
  ): Promise<T> {
    // Try maxRetries times
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.get(url, {
          headers: {
            apikey: this.apiKey,
          },
          params,
          timeout: this.timeout,
        });

        return response.data;
      } catch (error) {
        this.logger.warn(
          `API request failed (attempt ${attempt}/${this.maxRetries}): ${error.message}`,
        );

        // Check error type
        if (error.response) {
          const status = error.response.status;

          // 401/403 - API key issue, don't retry
          if (status === 401 || status === 403) {
            throw new InternalServerErrorException('Invalid API key');
          }

          // 429 - rate limit, don't retry
          if (status === 429) {
            throw new ServiceUnavailableException('API rate limit exceeded');
          }
        }

        // Wait before next attempt (exponential backoff)
        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          await this.sleep(delay);
        }
      }
    }

    // All retry attempts exhausted
    this.logger.error('All API retry attempts failed');
    throw new ServiceUnavailableException('External API is unavailable');
  }

  /**
   * Delay execution
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise<void>}
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
