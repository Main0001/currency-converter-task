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
} from './dto/external-api.dto';
import type { ExchangeRates } from '../../types/currency.types';


@Injectable()
export class ExternalApiService {
  private readonly logger = new Logger(ExternalApiService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('currencyApi.apiKey') || '';
    this.baseUrl = this.configService.get<string>('currencyApi.baseUrl') || 'https://api.currencyapi.com/v3';
    this.timeout = this.configService.get<number>('currencyApi.timeout') || 10000;
    this.maxRetries = this.configService.get<number>('currencyApi.maxRetries') || 3;

    if (!this.apiKey) {
      this.logger.warn('CURRENCY_API_KEY is not set!');
    }
  }

  //Получить список поддерживаемых валют
  async getSupportedCurrencies(): Promise<string[]> {
    const url = `${this.baseUrl}/currencies`;

    const response = await this.makeRequest<CurrenciesResponse>(url);

    // Извлекаем коды валют из ответа
    const currencies = Object.keys(response.data);

    this.logger.log(`Fetched ${currencies.length} currencies from API`);
    return currencies;
  }

  //Получить курсы валют
  async getExchangeRates(base: string, targets: string[]): Promise<ExchangeRates> {
    const url = `${this.baseUrl}/latest`;
    const params: RequestParams = {
      base_currency: base,
      currencies: targets.join(','),
    };

    const response = await this.makeRequest<RatesResponse>(url, params);

    // Преобразуем ответ в простой объект { EUR: 0.85, GBP: 0.73 }
    const rates: ExchangeRates = {};

    for (const currency of Object.keys(response.data)) {
      rates[currency] = response.data[currency].value;
    }

    this.logger.log(`Fetched rates for ${base} -> ${targets.join(', ')}`);
    return rates;
  }

  //Выполнить HTTP запрос с retry логикой
  private async makeRequest<T>(url: string, params?: RequestParams): Promise<T> {
    // Пробуем maxRetries раз
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
        this.logger.warn(`API request failed (attempt ${attempt}/${this.maxRetries}): ${error.message}`);

        // Проверяем тип ошибки
        if (error.response) {
          const status = error.response.status;

          // 401/403 - проблема с ключом, не повторяем
          if (status === 401 || status === 403) {
            throw new InternalServerErrorException('Invalid API key');
          }

          // 429 - rate limit, не повторяем
          if (status === 429) {
            throw new ServiceUnavailableException('API rate limit exceeded');
          }
        }

        // Ждем перед следующей попыткой (экспоненциальная задержка)
        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2с, 4с, 8с
          await this.sleep(delay);
        }
      }
    }

    // Все попытки исчерпаны
    this.logger.error('All API retry attempts failed');
    throw new ServiceUnavailableException('External API is unavailable');
  }

  //адержка выполнения
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
