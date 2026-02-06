/**
 * Integration Tests for Flash Sale API
 * These tests require a running Redis instance
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { saleRoutes } from '../../src/routes/sale.routes.js';
import { flashSaleService } from '../../src/services/flash-sale.service.js';
import { getRedisClient, closeRedisConnection } from '../../src/utils/redis.js';
import { config } from '../../src/config/index.js';

describe('Flash Sale API Integration Tests', () => {
    let app: FastifyInstance;
    const originalConfig = { ...config.sale };

    beforeAll(async () => {
        // Create test app
        app = Fastify({ logger: false });
        await app.register(cors);
        await app.register(saleRoutes, { prefix: '/api/sale' });

        // Connect to Redis
        const redis = getRedisClient();
        await redis.connect();

        // Set sale to be active
        config.sale.startTime = new Date(Date.now() - 60000);
        config.sale.endTime = new Date(Date.now() + 3600000);
        config.sale.totalStock = 10;

        await flashSaleService.reset();
    });

    afterAll(async () => {
        Object.assign(config.sale, originalConfig);
        await app.close();
        await closeRedisConnection();
    });

    beforeEach(async () => {
        await flashSaleService.reset();
    });

    describe('GET /api/sale/status', () => {
        it('should return sale status', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/sale/status',
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body).toHaveProperty('status');
            expect(body).toHaveProperty('remainingStock');
            expect(body).toHaveProperty('totalStock');
            expect(['upcoming', 'active', 'ended']).toContain(body.status);
        });
    });

    describe('POST /api/sale/purchase', () => {
        it('should allow a user to purchase', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/sale/purchase',
                payload: { userId: 'test-user-1' },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
        });

        it('should prevent duplicate purchases by same user', async () => {
            // First purchase
            await app.inject({
                method: 'POST',
                url: '/api/sale/purchase',
                payload: { userId: 'test-user-dup' },
            });

            // Second purchase attempt
            const response = await app.inject({
                method: 'POST',
                url: '/api/sale/purchase',
                payload: { userId: 'test-user-dup' },
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(false);
            expect(body.reason).toBe('already_purchased');
        });

        it('should reject invalid user ID', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/sale/purchase',
                payload: { userId: '' },
            });

            expect(response.statusCode).toBe(400);
        });

        it('should handle concurrent purchases correctly', async () => {
            // Reset with limited stock
            config.sale.totalStock = 5;
            await flashSaleService.reset();

            // Simulate 20 concurrent purchase attempts
            const promises = Array.from({ length: 20 }, (_, i) =>
                app.inject({
                    method: 'POST',
                    url: '/api/sale/purchase',
                    payload: { userId: `concurrent-user-${i}` },
                })
            );

            const responses = await Promise.all(promises);
            const bodies = responses.map(r => JSON.parse(r.body));

            const successful = bodies.filter(b => b.success).length;
            const soldOut = bodies.filter(b => !b.success && b.reason === 'out_of_stock').length;

            // Exactly 5 should succeed (stock was 5)
            expect(successful).toBe(5);
            // Rest should be sold out
            expect(soldOut).toBe(15);
        });
    });

    describe('GET /api/sale/purchase/:userId', () => {
        it('should return purchase status for user who purchased', async () => {
            await app.inject({
                method: 'POST',
                url: '/api/sale/purchase',
                payload: { userId: 'check-user' },
            });

            const response = await app.inject({
                method: 'GET',
                url: '/api/sale/purchase/check-user',
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.hasPurchased).toBe(true);
            expect(body.purchasedAt).toBeDefined();
        });

        it('should return not purchased for user who has not purchased', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/sale/purchase/nonexistent-user',
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.hasPurchased).toBe(false);
        });
    });
});
