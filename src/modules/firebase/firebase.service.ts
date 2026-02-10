import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { UpdateUserDto, FirestoreUpdateData } from '../user/dto/user.dto';
import type { UserSettings } from '../user/dto/user.dto';
import { RatesCache, ExchangeRates } from '../../types/currency.types';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private firestore: Firestore; // Firestore database object
  private readonly logger = new Logger(FirebaseService.name); // Logger for debugging

  constructor(private configService: ConfigService) {}

  /**
   * onModuleInit - called automatically when application starts
   * Initializes Firebase Admin SDK
   */
  async onModuleInit() {
    try {
      // Get config from .env via ConfigService
      const projectId = this.configService.get<string>('firebase.projectId');
      const clientEmail = this.configService.get<string>(
        'firebase.clientEmail',
      );
      const privateKey = this.configService.get<string>('firebase.privateKey');

      // Initialize Firebase Admin SDK (modular style)
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });

      // Get Firestore object for database operations
      this.firestore = getFirestore();

      this.logger.log('Firebase initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase', error);
      throw error;
    }
  }

  // ==================== USER MANAGEMENT METHODS ====================

  /**
   * Create new user in Firestore
   * @param {string} userId - User ID
   * @returns {Promise<UserSettings>} Created user data
   */
  async createUser(userId: string): Promise<UserSettings> {
    const now = new Date().toISOString(); // Current date in ISO8601

    const newUser: UserSettings = {
      user_id: userId,
      base_currency: 'USD', // Default USD
      favorites: [],
      created_at: now,
      updated_at: now,
    };

    // Save to users collection with document ID = userId
    await this.firestore.collection('users').doc(userId).set(newUser);

    this.logger.log(`Created new user: ${userId}`);
    return newUser;
  }

  /**
   * Get user data by ID
   * @param {string} userId - User ID
   * @returns {Promise<UserSettings | null>} User data or null if not found
   */
  async getUser(userId: string): Promise<UserSettings | null> {
    const doc = await this.firestore.collection('users').doc(userId).get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as UserSettings;
  }

  /**
   * Update user data
   * @param {string} userId - User ID
   * @param {UpdateUserDto} data - Data to update
   * @returns {Promise<UserSettings>} Updated user data
   */
  async updateUser(userId: string, data: UpdateUserDto): Promise<UserSettings> {
    const updateData: FirestoreUpdateData = {
      updated_at: new Date().toISOString(),
    };

    if (data.base_currency !== undefined) {
      updateData.base_currency = data.base_currency;
    }

    if (data.favorites !== undefined) {
      updateData.favorites = data.favorites;
    }

    // Update document in Firestore
    await this.firestore.collection('users').doc(userId).update(updateData);

    // Get updated data
    const updatedUser = await this.getUser(userId);

    // Check that user exists
    if (!updatedUser) {
      throw new NotFoundException(`User ${userId} not found after update`);
    }

    this.logger.log(`Updated user: ${userId}`);
    return updatedUser;
  }

  // ==================== EXCHANGE RATES CACHING METHODS ====================

  /**
   * Save exchange rates to cache
   * @param {string} base - Base currency
   * @param {string[]} targets - Target currencies
   * @param {ExchangeRates} rates - Exchange rates data
   * @returns {Promise<void>}
   */
  async saveRatesToCache(
    base: string,
    targets: string[],
    rates: ExchangeRates,
  ): Promise<void> {
    // Generate key: USD_EUR_GBP_JPY (sorted)
    const cacheKey = this.generateCacheKey(base, targets);

    const now = Date.now(); // Current timestamp
    const ttlMs =
      this.configService.get<number>('cache.dbCacheTtlMs') || 86400000;
    const expiresAt = now + ttlMs;

    const cacheEntry: RatesCache = {
      base,
      rates,
      cached_at: now,
      expires_at: expiresAt,
    };

    // Save to rates_cache collection
    await this.firestore
      .collection('rates_cache')
      .doc(cacheKey)
      .set(cacheEntry);

    this.logger.log(`Saved rates to cache: ${cacheKey}`);
  }

  /**
   * Get exchange rates from cache
   * @param {string} base - Base currency
   * @param {string[]} targets - Target currencies
   * @returns {Promise<ExchangeRates | null>} Cached rates or null if not found/expired
   */
  async getRatesFromCache(
    base: string,
    targets: string[],
  ): Promise<ExchangeRates | null> {
    const cacheKey = this.generateCacheKey(base, targets);

    const doc = await this.firestore
      .collection('rates_cache')
      .doc(cacheKey)
      .get();

    if (!doc.exists) {
      return null; // Cache not found
    }

    const cacheEntry = doc.data() as RatesCache;
    const now = Date.now();

    // Check if cache expired
    if (now > cacheEntry.expires_at) {
      this.logger.log(`Cache expired: ${cacheKey}`);
      // Delete expired cache (optional)
      await this.firestore.collection('rates_cache').doc(cacheKey).delete();
      return null;
    }

    this.logger.log(`Cache hit: ${cacheKey}`);
    return cacheEntry.rates;
  }

  /**
   * Generate cache key
   * Format: USD_EUR_GBP_JPY (base + sorted targets)
   * USD + [JPY, EUR, GBP] and USD + [EUR, GBP, JPY] should produce the same key
   * @param {string} base - Base currency
   * @param {string[]} targets - Target currencies
   * @returns {string} Generated cache key
   * @private
   */
  private generateCacheKey(base: string, targets: string[]): string {
    // Sort targets
    const sortedTargets = [...targets].sort();
    return `${base}_${sortedTargets.join('_')}`;
  }

  /**
   * Clean expired cache entries
   * Runs daily at 1 AM
   * @returns {Promise<void>}
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async cleanExpiredCache(): Promise<void> {
    const now = Date.now();

    // Get only expired documents via where filter
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
