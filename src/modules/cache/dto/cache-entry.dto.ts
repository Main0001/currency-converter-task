//CacheEntry - структура записи в кеше
export interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

//CacheStorage - структура всего кеша
export interface CacheStorage {
  [key: string]: CacheEntry;
}

//CacheParams - параметры для генерации ключа кеша
export interface CacheParams {
  [key: string]: unknown;
}
