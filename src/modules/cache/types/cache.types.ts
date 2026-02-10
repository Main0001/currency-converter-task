//CacheEntry - структура записи в кеше
export interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

//CacheStorage - структура всего кеша
export type CacheStorage = Record<string, CacheEntry>;

//CacheParams - параметры для генерации ключа кеша
export type CacheParams = Record<string, unknown>;
