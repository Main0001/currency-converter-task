import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheStorage, CacheParams } from './dto/cache-entry.dto';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  // Объект для хранения кеша: { ключ: { data, expiresAt } }
  private cache: CacheStorage = {};

  // TTL по умолчанию (5 минут в миллисекундах)
  private readonly defaultTtlMs: number;

  constructor(private readonly configService: ConfigService) {
    const ttlMinutes =
      this.configService.get<number>('cache.memoryTtlMinutes') || 5;
    this.defaultTtlMs = ttlMinutes * 60 * 1000;

    this.logger.log(`CacheService initialized with TTL: ${ttlMinutes} minutes`);
  }

  //Сохранить данные в кеш
  set(key: string, data: unknown, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);

    this.cache[key] = { data, expiresAt };
    this.logger.debug(`Cache SET: ${key}`);
  }

  //Получить данные из кеша
  get(key: string): unknown {
    const entry = this.cache[key];

    if (!entry) {
      this.logger.debug(`Cache MISS: ${key}`);
      return null;
    }

    // Проверяем истечение
    if (Date.now() > entry.expiresAt) {
      delete this.cache[key];
      this.logger.debug(`Cache MISS (expired): ${key}`);
      return null;
    }

    this.logger.debug(`Cache HIT: ${key}`);
    return entry.data;
  }

  /**
   * Генерация ключа для кеша
   * Формат: endpoint:param1_param2 (отсортированные)
   */
  generateKey(endpoint: string, params: CacheParams): string {
    if (!params || Object.keys(params).length === 0) {
      return endpoint;
    }

    const parts: string[] = [];

    for (const key of Object.keys(params).sort()) {
      const value = params[key];

      if (value === undefined || value === null) {
        continue;
      }

      if (Array.isArray(value)) {
        parts.push([...value].sort().join('_'));
      } else {
        parts.push(String(value));
      }
    }

    return parts.length > 0 ? `${endpoint}:${parts.join('_')}` : endpoint;
  }
}
