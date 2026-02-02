import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { UpdateUserDto, FirestoreUpdateData } from '../user/dto/user.dto';
import type { UserSettings } from '../user/dto/user.dto';
import { RatesCache, ExchangeRates } from '../../types/currency.types';


@Injectable()
export class FirebaseService implements OnModuleInit {
  private firestore: Firestore;  // Объект для работы с Firestore
  private readonly logger = new Logger(FirebaseService.name);  // Логгер для отладки

  constructor(private configService: ConfigService) {}

  /**
   * onModuleInit - вызывается автоматически при старте приложения
   * Здесь инициализируем Firebase Admin SDK
   */
  async onModuleInit() {
    try {
      // Получаем конфиг из .env через ConfigService
      const projectId = this.configService.get<string>('firebase.projectId');
      const clientEmail = this.configService.get<string>('firebase.clientEmail');
      const privateKey = this.configService.get<string>('firebase.privateKey');

      // Инициализируем Firebase Admin SDK (модульный стиль)
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });

      // Получаем объект Firestore для работы с БД
      this.firestore = getFirestore();

      this.logger.log('Firebase initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase', error);
      throw error;
    }
  }

  // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С ПОЛЬЗОВАТЕЛЯМИ ====================

  //Создать нового пользователя в Firestore
  async createUser(userId: string): Promise<UserSettings> {
    const now = new Date().toISOString();  // Текущая дата в ISO8601

    const newUser: UserSettings = {
      user_id: userId,
      base_currency: 'USD',  // По умолчанию USD
      favorites: [], 
      created_at: now,
      updated_at: now,
    };

    // Сохраняем в коллекцию users с документом ID = userId
    await this.firestore.collection('users').doc(userId).set(newUser);

    this.logger.log(`Created new user: ${userId}`);
    return newUser;
  }

  //Получить данные пользователя по ID
  async getUser(userId: string): Promise<UserSettings | null> {
    const doc = await this.firestore.collection('users').doc(userId).get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as UserSettings;
  }

  //Обновить данные пользователя
  async updateUser(
    userId: string,
    data: UpdateUserDto,
  ): Promise<UserSettings> {
    const updateData: FirestoreUpdateData = {
      updated_at: new Date().toISOString(),
    };

    if (data.base_currency !== undefined) {
      updateData.base_currency = data.base_currency;
    }

    if (data.favorites !== undefined) {
      updateData.favorites = data.favorites;
    }

    // Обновляем документ в Firestore
    await this.firestore.collection('users').doc(userId).update(updateData);

    // Получаем обновленные данные
    const updatedUser = await this.getUser(userId);

    // Проверяем что пользователь существует
    if (!updatedUser) {
      throw new NotFoundException(`User ${userId} not found after update`);
    }

    this.logger.log(`Updated user: ${userId}`);
    return updatedUser;
  }

  // ==================== МЕТОДЫ ДЛЯ КЕШИРОВАНИЯ КУРСОВ ====================

  //Сохранить курсы валют в кеш
  async saveRatesToCache(
    base: string,
    targets: string[],
    rates: ExchangeRates,
  ): Promise<void> {
    // Генерируем ключ: USD_EUR_GBP_JPY (отсортированные)
    const cacheKey = this.generateCacheKey(base, targets);

    const now = Date.now();  // Текущий timestamp
    const ttlHours = this.configService.get<number>('cache.dbTtlHours') || 24;  // 24 часа по умолчанию
    const expiresAt = now + ttlHours * 60 * 60 * 1000;  // +24 часа в миллисекундах

    const cacheEntry: RatesCache = {
      base,
      rates,
      cached_at: now,
      expires_at: expiresAt,
    };

    // Сохраняем в коллекцию rates_cache
    await this.firestore.collection('rates_cache').doc(cacheKey).set(cacheEntry);

    this.logger.log(`Saved rates to cache: ${cacheKey}`);
  }

  //Получить курсы из кеша
  async getRatesFromCache(
    base: string,
    targets: string[],
  ): Promise<ExchangeRates | null> {
    const cacheKey = this.generateCacheKey(base, targets);

    const doc = await this.firestore.collection('rates_cache').doc(cacheKey).get();

    if (!doc.exists) {
      return null;  // Кеш не найден
    }

    const cacheEntry = doc.data() as RatesCache;
    const now = Date.now();

    // Проверяем истек ли кеш
    if (now > cacheEntry.expires_at) {
      this.logger.log(`Cache expired: ${cacheKey}`);
      // Можно удалить истекший кеш (опционально)
      await this.firestore.collection('rates_cache').doc(cacheKey).delete();
      return null;
    }

    this.logger.log(`Cache hit: ${cacheKey}`);
    return cacheEntry.rates;
  }

  /**
   * Генерация ключа для кеша
   * Формат: USD_EUR_GBP_JPY (базовая + отсортированные target)
   */
  private generateCacheKey(base: string, targets: string[]): string {
    // Сортируем targets
    // USD + [JPY, EUR, GBP] и USD + [EUR, GBP, JPY] должны дать один ключ
    const sortedTargets = [...targets].sort();
    return `${base}_${sortedTargets.join('_')}`;
  }

  //чистить истекшие записи кеша
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async cleanExpiredCache(): Promise<void> {
    const now = Date.now();

    // Получаем только истекшие документы через where фильтр
    const snapshot = await this.firestore
      .collection('rates_cache')
      .where('expires_at', '<', now)
      .get();

    const deleteTasks: Promise<FirebaseFirestore.WriteResult>[] = [];
    snapshot.forEach((doc) => {
      deleteTasks.push(doc.ref.delete());
    });

    await Promise.all(deleteTasks);
    this.logger.log(`Cleaned ${deleteTasks.length} expired cache entries`);
  }
}
