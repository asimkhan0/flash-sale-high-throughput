/**
 * Unit Tests for InventoryService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Redis before importing the service
const mockRedis = {
    eval: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    connect: vi.fn(),
};

vi.mock('../../../src/utils/redis.js', () => ({
    getRedisClient: () => mockRedis,
}));

vi.mock('../../../src/config/index.js', () => ({
    config: {
        sale: {
            totalStock: 100,
        },
    },
    REDIS_KEYS: {
        STOCK: 'flash-sale:stock',
        PURCHASES: 'flash-sale:purchases',
        PURCHASE_PREFIX: 'flash-sale:purchase:',
    },
}));

import { InventoryService } from '../../../src/services/inventory.service.js';

describe('InventoryService', () => {
    let service: InventoryService;

    beforeEach(() => {
        service = new InventoryService();
        vi.clearAllMocks();
    });

    describe('getStock', () => {
        it('should return current stock level', async () => {
            mockRedis.get.mockResolvedValue('50');

            const stock = await service.getStock();

            expect(stock).toBe(50);
            expect(mockRedis.get).toHaveBeenCalledWith('flash-sale:stock');
        });

        it('should return 0 when stock key does not exist', async () => {
            mockRedis.get.mockResolvedValue(null);

            const stock = await service.getStock();

            expect(stock).toBe(0);
        });
    });

    describe('decrementStock', () => {
        it('should return success true when stock is available', async () => {
            // Lua script returns [1, 49] for success
            mockRedis.eval.mockResolvedValue([1, 49]);

            const result = await service.decrementStock();

            expect(result.success).toBe(true);
            expect(result.remainingStock).toBe(49);
        });

        it('should return success false when stock is exhausted', async () => {
            // Lua script returns [0, 0] for failure
            mockRedis.eval.mockResolvedValue([0, 0]);

            const result = await service.decrementStock();

            expect(result.success).toBe(false);
            expect(result.remainingStock).toBe(0);
        });
    });

    describe('resetStock', () => {
        it('should reset stock to initial value', async () => {
            mockRedis.set.mockResolvedValue('OK');

            await service.resetStock();

            expect(mockRedis.set).toHaveBeenCalledWith('flash-sale:stock', '100');
        });
    });

    describe('setStock', () => {
        it('should set specific stock value', async () => {
            mockRedis.set.mockResolvedValue('OK');

            await service.setStock(25);

            expect(mockRedis.set).toHaveBeenCalledWith('flash-sale:stock', '25');
        });
    });
});
