/**
 * Unit Tests for PurchaseService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Redis before importing the service
const mockRedis = {
    hget: vi.fn(),
    hsetnx: vi.fn(),
    hgetall: vi.fn(),
    hlen: vi.fn(),
    del: vi.fn(),
};

vi.mock('../../../src/utils/redis.js', () => ({
    getRedisClient: () => mockRedis,
}));

vi.mock('../../../src/config/index.js', () => ({
    REDIS_KEYS: {
        PURCHASES: 'flash-sale:purchases',
    },
}));

import { PurchaseService } from '../../../src/services/purchase.service.js';

describe('PurchaseService', () => {
    let service: PurchaseService;

    beforeEach(() => {
        service = new PurchaseService();
        vi.clearAllMocks();
    });

    describe('hasPurchased', () => {
        it('should return true if user has purchased', async () => {
            const timestamp = '2024-01-01T12:00:00.000Z';
            mockRedis.hget.mockResolvedValue(timestamp);

            const result = await service.hasPurchased('user1');

            expect(result.hasPurchased).toBe(true);
            expect(result.purchasedAt).toEqual(new Date(timestamp));
        });

        it('should return false if user has not purchased', async () => {
            mockRedis.hget.mockResolvedValue(null);

            const result = await service.hasPurchased('user1');

            expect(result.hasPurchased).toBe(false);
            expect(result.purchasedAt).toBeUndefined();
        });
    });

    describe('recordPurchase', () => {
        it('should successfully record new purchase', async () => {
            mockRedis.hsetnx.mockResolvedValue(1); // 1 = field was set

            const result = await service.recordPurchase('user1');

            expect(result.success).toBe(true);
            expect(result.purchasedAt).toBeInstanceOf(Date);
        });

        it('should fail if user already purchased', async () => {
            mockRedis.hsetnx.mockResolvedValue(0); // 0 = field already exists
            mockRedis.hget.mockResolvedValue('2024-01-01T12:00:00.000Z');

            const result = await service.recordPurchase('user1');

            expect(result.success).toBe(false);
        });
    });

    describe('getPurchaseCount', () => {
        it('should return total purchase count', async () => {
            mockRedis.hlen.mockResolvedValue(42);

            const count = await service.getPurchaseCount();

            expect(count).toBe(42);
        });
    });

    describe('clearPurchases', () => {
        it('should delete all purchases', async () => {
            mockRedis.del.mockResolvedValue(1);

            await service.clearPurchases();

            expect(mockRedis.del).toHaveBeenCalledWith('flash-sale:purchases');
        });
    });
});
