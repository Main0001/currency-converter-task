import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheStorage, CacheParams } from './dto/cache-entry.dto';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  // Cache storage object: { key: { data, expiresAt } }
  private cache: CacheStorage = {};

  // Default TTL (5 minutes in milliseconds)
  private readonly defaultTtlMs: number;

  constructor(private readonly configService: ConfigService) {
    const ttlMinutes =
      this.configService.get<number>('cache.memoryTtlMinutes') || 5;
    this.defaultTtlMs = ttlMinutes * 60 * 1000;

    this.logger.log(`CacheService initialized with TTL: ${ttlMinutes} minutes`);
  }

  /**
   * Save data to cache
   * @param {string} key - Cache key
   * @param {unknown} data - Data to cache
   * @param {number} [ttlMs] - Optional TTL in milliseconds
   */
  set(key: string, data: unknown, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);

    this.cache[key] = { data, expiresAt };
    this.logger.debug(`Cache SET: ${key}`);
  }

  /**
   * Get data from cache
   * @param {string} key - Cache key
   * @returns {unknown} Cached data or null if not found/expired
   */
  get(key: string): unknown {
    const entry = this.cache[key];

    if (!entry) {
      this.logger.debug(`Cache MISS: ${key}`);
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      delete this.cache[key];
      this.logger.debug(`Cache MISS (expired): ${key}`);
      return null;
    }

    this.logger.debug(`Cache HIT: ${key}`);
    return entry.data;
  }

  /**
   * Generate cache key
   * Format: endpoint:param1_param2 (sorted)
   * @param {string} endpoint - Endpoint name
   * @param {CacheParams} params - Parameters object
   * @returns {string} Generated cache key
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
