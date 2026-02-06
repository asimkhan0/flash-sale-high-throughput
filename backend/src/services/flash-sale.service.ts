/**
 * Flash Sale Service
 * Orchestrates the purchase flow: validates sale window → checks prior purchase → attempts stock decrement
 */

import { getRedisClient } from '../utils/redis.js';
import { REDIS_KEYS, config } from '../config/index.js';
import { ATOMIC_PURCHASE_SCRIPT } from '../utils/lua-scripts.js';
import { inventoryService } from './inventory.service.js';
import { purchaseService } from './purchase.service.js';
import type {
    SaleStatus,
    SaleStatusResponse,
    PurchaseResponse,
    UserPurchaseStatusResponse
} from '../types/index.js';

export class FlashSaleService {
    /**
     * Get current sale status
     */
    getSaleStatus(): SaleStatus {
        const now = new Date();
        const { startTime, endTime } = config.sale;

        if (now < startTime) {
            return 'upcoming';
        } else if (now >= startTime && now <= endTime) {
            return 'active';
        } else {
            return 'ended';
        }
    }

    /**
     * Check if sale is currently active
     */
    isSaleActive(): boolean {
        return this.getSaleStatus() === 'active';
    }

    /**
     * Get full sale status response
     */
    async getFullStatus(): Promise<SaleStatusResponse> {
        const stock = await inventoryService.getStock();
        const status = this.getSaleStatus();

        return {
            status,
            startsAt: config.sale.startTime.toISOString(),
            endsAt: config.sale.endTime.toISOString(),
            remainingStock: stock,
            totalStock: config.sale.totalStock,
            productName: config.sale.productName,
            productPrice: config.sale.productPrice,
            serverTime: new Date().toISOString(),
        };
    }

    /**
     * Attempt a purchase for a user
     * This is the main orchestration method that uses the atomic Lua script
     */
    async attemptPurchase(userId: string): Promise<PurchaseResponse> {
        // Validate user ID
        if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
            return {
                success: false,
                reason: 'invalid_user_id',
                message: 'Please provide a valid user identifier.',
            };
        }

        const normalizedUserId = userId.trim().toLowerCase();

        // Check if sale is active
        const status = this.getSaleStatus();
        if (status !== 'active') {
            const message = status === 'upcoming'
                ? 'The sale has not started yet. Please wait for the sale to begin.'
                : 'The sale has ended. Thank you for your interest.';

            return {
                success: false,
                reason: 'sale_not_active',
                message,
            };
        }

        // Use atomic Lua script for the entire purchase operation
        const redis = getRedisClient();
        const now = new Date();
        const result = await redis.eval(
            ATOMIC_PURCHASE_SCRIPT,
            2,
            REDIS_KEYS.STOCK,
            REDIS_KEYS.PURCHASES,
            normalizedUserId,
            now.toISOString()
        ) as [number, number | string];

        const statusCode = result[0];

        switch (statusCode) {
            case 0: // Already purchased
                return {
                    success: false,
                    reason: 'already_purchased',
                    message: 'You have already purchased this item. Each user can only buy one item.',
                };

            case 1: // Success
                console.log(`Purchase successful: ${normalizedUserId} - Remaining stock: ${result[1]}`);
                return {
                    success: true,
                    message: 'Congratulations! Your purchase was successful.',
                    purchasedAt: now.toISOString(),
                };

            case 2: // Out of stock
                return {
                    success: false,
                    reason: 'out_of_stock',
                    message: 'Sorry, the item is sold out. Better luck next time!',
                };

            default:
                throw new Error(`Unexpected purchase status code: ${statusCode}`);
        }
    }

    /**
     * Check if a user has made a purchase
     */
    async getUserPurchaseStatus(userId: string): Promise<UserPurchaseStatusResponse> {
        if (!userId || typeof userId !== 'string') {
            return { hasPurchased: false };
        }

        const normalizedUserId = userId.trim().toLowerCase();
        const result = await purchaseService.hasPurchased(normalizedUserId);

        return {
            hasPurchased: result.hasPurchased,
            purchasedAt: result.purchasedAt?.toISOString(),
        };
    }

    /**
     * Initialize the flash sale (set up initial stock)
     */
    async initialize(): Promise<void> {
        await inventoryService.initialize();
    }

    /**
     * Reset the flash sale (for testing)
     */
    async reset(): Promise<void> {
        await inventoryService.resetStock();
        await purchaseService.clearPurchases();
        console.log('Flash sale reset complete');
    }
}

// Singleton instance
export const flashSaleService = new FlashSaleService();
