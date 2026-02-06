/**
 * Inventory Service
 * Manages stock levels with atomic Redis operations to prevent overselling
 */

import { getRedisClient } from '../utils/redis.js';
import { REDIS_KEYS, config } from '../config/index.js';
import { INIT_STOCK_SCRIPT, DECREMENT_STOCK_SCRIPT } from '../utils/lua-scripts.js';
import type { InventoryResult } from '../types/index.js';

export class InventoryService {
    private initialized = false;

    /**
     * Initialize stock in Redis if not already set
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        const redis = getRedisClient();
        await redis.eval(
            INIT_STOCK_SCRIPT,
            1,
            REDIS_KEYS.STOCK,
            config.sale.totalStock.toString()
        );
        this.initialized = true;
        console.log(`Inventory initialized with ${config.sale.totalStock} items`);
    }

    /**
     * Get current stock level
     */
    async getStock(): Promise<number> {
        const redis = getRedisClient();
        const stock = await redis.get(REDIS_KEYS.STOCK);
        return stock ? parseInt(stock, 10) : 0;
    }

    /**
     * Attempt to decrement stock atomically
     * Returns success status and remaining stock
     */
    async decrementStock(): Promise<InventoryResult> {
        const redis = getRedisClient();
        const result = await redis.eval(
            DECREMENT_STOCK_SCRIPT,
            1,
            REDIS_KEYS.STOCK
        ) as [number, number];

        return {
            success: result[0] === 1,
            remainingStock: result[1],
        };
    }

    /**
     * Reset stock to initial value (for testing)
     */
    async resetStock(): Promise<void> {
        const redis = getRedisClient();
        await redis.set(REDIS_KEYS.STOCK, config.sale.totalStock.toString());
        this.initialized = true;
    }

    /**
     * Set specific stock value (for testing)
     */
    async setStock(value: number): Promise<void> {
        const redis = getRedisClient();
        await redis.set(REDIS_KEYS.STOCK, value.toString());
    }
}

// Singleton instance
export const inventoryService = new InventoryService();
