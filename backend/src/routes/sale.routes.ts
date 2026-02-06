/**
 * Sale Routes
 * Defines all flash sale related API routes
 */

import type { FastifyInstance } from 'fastify';
import { saleController } from '../controllers/sale.controller.js';
import type { PurchaseRequest } from '../types/index.js';

// JSON Schema for request validation
const purchaseSchema = {
    body: {
        type: 'object',
        required: ['userId'],
        properties: {
            userId: { type: 'string', minLength: 1, maxLength: 255 },
        },
    },
};

const userIdParamSchema = {
    params: {
        type: 'object',
        required: ['userId'],
        properties: {
            userId: { type: 'string', minLength: 1, maxLength: 255 },
        },
    },
};

export async function saleRoutes(fastify: FastifyInstance) {
    // Get sale status
    fastify.get('/status', {
        schema: {
            description: 'Get current flash sale status',
            tags: ['sale'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', enum: ['upcoming', 'active', 'ended'] },
                        startsAt: { type: 'string', format: 'date-time' },
                        endsAt: { type: 'string', format: 'date-time' },
                        remainingStock: { type: 'integer' },
                        totalStock: { type: 'integer' },
                        productName: { type: 'string' },
                        productPrice: { type: 'number' },
                        serverTime: { type: 'string', format: 'date-time' },
                    },
                },
            },
        },
    }, saleController.getStatus);

    // Attempt purchase
    fastify.post<{ Body: PurchaseRequest }>('/purchase', {
        schema: {
            description: 'Attempt to purchase an item',
            tags: ['sale'],
            ...purchaseSchema,
        },
    }, saleController.purchase);

    // Check user purchase status
    fastify.get<{ Params: { userId: string } }>('/purchase/:userId', {
        schema: {
            description: 'Check if a user has made a purchase',
            tags: ['sale'],
            ...userIdParamSchema,
        },
    }, saleController.getUserPurchaseStatus);

    // Reset sale (for testing only)
    fastify.post('/reset', {
        schema: {
            description: 'Reset the flash sale (testing only)',
            tags: ['admin'],
        },
    }, saleController.reset);
}
