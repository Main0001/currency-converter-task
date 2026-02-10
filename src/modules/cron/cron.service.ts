import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Firestore } from 'firebase-admin/firestore';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  /**
   * Clean expired cache entries from Firestore
   * @param {Firestore} firestore - Firestore instance
   * @returns {Promise<number>} Number of deleted entries
   */
  async cleanExpiredRatesCache(firestore: Firestore): Promise<number> {
    const now = Date.now();

    // Get only expired documents via where filter
    const snapshot = await firestore
      .collection('rates_cache')
      .where('expires_at', '<', now)
      .get();

    const deleteTasks: Promise<FirebaseFirestore.WriteResult>[] = [];
    snapshot.forEach((doc) => {
      deleteTasks.push(doc.ref.delete());
    });

    await Promise.all(deleteTasks);

    const deletedCount = deleteTasks.length;
    this.logger.log(`Cleaned ${deletedCount} expired cache entries`);

    return deletedCount;
  }
}
