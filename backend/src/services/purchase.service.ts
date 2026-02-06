/**
 * Purchase Service
 * Manages purchase records with atomic operations to enforce one-item-per-user
 */

import { getRedisClient } from '../utils/redis.js';
import { REDIS_KEYS } from '../config/index.js';
import type { PurchaseCheckResult } from '../types/index.js';

export class PurchaseService {
    /**
     * Check if a user has already made a purchase
     */
    async hasPurchased(userId: string): Promise<PurchaseCheckResult> {
        const redis = getRedisClient();
        const purchaseTime = await redis.hget(REDIS_KEYS.PURCHASES, userId);

        if (purchaseTime) {
            return {
                hasPurchased: true,
                purchasedAt: new Date(purchaseTime),
            };
        }

        return { hasPurchased: false };
    }

    /**
     * Record a purchase for a user
     * Uses HSETNX for atomic "set if not exists" operation
     * Returns true if the purchase was recorded (user hadn't purchased before)
     */
    async recordPurchase(userId: string): Promise<{ success: boolean; purchasedAt: Date }> {
        const redis = getRedisClient();
        const now = new Date();
        const timestamp = now.toISOString();

        // HSETNX returns 1 if field was set, 0 if it already existed
        const result = await redis.hsetnx(REDIS_KEYS.PURCHASES, userId, timestamp);

        if (result === 1) {
            return { success: true, purchasedAt: now };
        }

        // User already purchased, get their purchase time
        const existingTime = await redis.hget(REDIS_KEYS.PURCHASES, userId);
        return {
            success: false,
            purchasedAt: existingTime ? new Date(existingTime) : now,
        };
    }

    /**
     * Get all purchases (for admin/debugging)
     */
    async getAllPurchases(): Promise<Map<string, Date>> {
        const redis = getRedisClient();
        const purchases = await redis.hgetall(REDIS_KEYS.PURCHASES);

        const result = new Map<string, Date>();
        for (const [userId, timestamp] of Object.entries(purchases)) {
            result.set(userId, new Date(timestamp));
        }
        return result;
    }

    /**
     * Get total number of purchases
     */
    async getPurchaseCount(): Promise<number> {
        const redis = getRedisClient();
        return await redis.hlen(REDIS_KEYS.PURCHASES);
    }

    /**
     * Clear all purchases (for testing)
     */
    async clearPurchases(): Promise<void> {
        const redis = getRedisClient();
        await redis.del(REDIS_KEYS.PURCHASES);
    }
}

// Singleton instance
export const purchaseService = new PurchaseService();
