/**
 * Unit Tests for FlashSaleService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FlashSaleService } from '../../../src/services/flash-sale.service.js';
import { config } from '../../../src/config/index.js';

// Mock Redis
vi.mock('../../../src/utils/redis.js', () => ({
    getRedisClient: () => ({
        eval: vi.fn(),
        get: vi.fn(),
        connect: vi.fn(),
    }),
}));

// Mock the inventory and purchase services
vi.mock('../../../src/services/inventory.service.js', () => ({
    inventoryService: {
        initialize: vi.fn(),
        getStock: vi.fn().mockResolvedValue(100),
        resetStock: vi.fn(),
    },
}));

vi.mock('../../../src/services/purchase.service.js', () => ({
    purchaseService: {
        hasPurchased: vi.fn().mockResolvedValue({ hasPurchased: false }),
        clearPurchases: vi.fn(),
    },
}));

describe('FlashSaleService', () => {
    let service: FlashSaleService;
    const originalConfig = { ...config.sale };

    beforeEach(() => {
        service = new FlashSaleService();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        // Restore original config
        Object.assign(config.sale, originalConfig);
    });

    describe('getSaleStatus', () => {
        it('should return "upcoming" before sale starts', () => {
            const futureStart = new Date(Date.now() + 60000);
            const futureEnd = new Date(Date.now() + 120000);
            config.sale.startTime = futureStart;
            config.sale.endTime = futureEnd;

            expect(service.getSaleStatus()).toBe('upcoming');
        });

        it('should return "active" during sale period', () => {
            const pastStart = new Date(Date.now() - 60000);
            const futureEnd = new Date(Date.now() + 60000);
            config.sale.startTime = pastStart;
            config.sale.endTime = futureEnd;

            expect(service.getSaleStatus()).toBe('active');
        });

        it('should return "ended" after sale ends', () => {
            const pastStart = new Date(Date.now() - 120000);
            const pastEnd = new Date(Date.now() - 60000);
            config.sale.startTime = pastStart;
            config.sale.endTime = pastEnd;

            expect(service.getSaleStatus()).toBe('ended');
        });
    });

    describe('isSaleActive', () => {
        it('should return true only when sale is active', () => {
            config.sale.startTime = new Date(Date.now() - 60000);
            config.sale.endTime = new Date(Date.now() + 60000);

            expect(service.isSaleActive()).toBe(true);
        });

        it('should return false when sale is upcoming', () => {
            config.sale.startTime = new Date(Date.now() + 60000);
            config.sale.endTime = new Date(Date.now() + 120000);

            expect(service.isSaleActive()).toBe(false);
        });
    });

    describe('attemptPurchase', () => {
        it('should reject invalid user IDs', async () => {
            const result = await service.attemptPurchase('');
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.reason).toBe('invalid_user_id');
            }
        });

        it('should reject purchase when sale is not active', async () => {
            config.sale.startTime = new Date(Date.now() + 60000);
            config.sale.endTime = new Date(Date.now() + 120000);

            const result = await service.attemptPurchase('test@example.com');
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.reason).toBe('sale_not_active');
            }
        });
    });
});
