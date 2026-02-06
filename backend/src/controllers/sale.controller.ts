/**
 * Sale Controller
 * Handles HTTP request/response for flash sale endpoints
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { flashSaleService } from '../services/flash-sale.service.js';
import type { PurchaseRequest } from '../types/index.js';

export const saleController = {
    /**
     * GET /api/sale/status
     * Returns current sale status, remaining stock, and timing information
     */
    async getStatus(request: FastifyRequest, reply: FastifyReply) {
        try {
            const status = await flashSaleService.getFullStatus();
            return reply.status(200).send(status);
        } catch (error) {
            request.log.error(error, 'Failed to get sale status');
            return reply.status(500).send({
                error: 'Internal server error',
                message: 'Failed to retrieve sale status'
            });
        }
    },

    /**
     * POST /api/sale/purchase
     * Attempt to purchase an item for a user
     */
    async purchase(
        request: FastifyRequest<{ Body: PurchaseRequest }>,
        reply: FastifyReply
    ) {
        try {
            const { userId } = request.body;

            if (!userId) {
                return reply.status(400).send({
                    success: false,
                    reason: 'invalid_user_id',
                    message: 'User ID is required',
                });
            }

            const result = await flashSaleService.attemptPurchase(userId);

            // Use appropriate status codes
            if (result.success) {
                return reply.status(200).send(result);
            }

            switch (result.reason) {
                case 'invalid_user_id':
                    return reply.status(400).send(result);
                case 'sale_not_active':
                    return reply.status(403).send(result);
                case 'already_purchased':
                case 'out_of_stock':
                    return reply.status(409).send(result);
                default:
                    return reply.status(400).send(result);
            }
        } catch (error) {
            request.log.error(error, 'Failed to process purchase');
            return reply.status(500).send({
                success: false,
                reason: 'server_error',
                message: 'Failed to process purchase. Please try again.',
            });
        }
    },

    /**
     * GET /api/sale/purchase/:userId
     * Check if a specific user has made a purchase
     */
    async getUserPurchaseStatus(
        request: FastifyRequest<{ Params: { userId: string } }>,
        reply: FastifyReply
    ) {
        try {
            const { userId } = request.params;

            if (!userId) {
                return reply.status(400).send({
                    error: 'User ID is required',
                });
            }

            const result = await flashSaleService.getUserPurchaseStatus(userId);
            return reply.status(200).send(result);
        } catch (error) {
            request.log.error(error, 'Failed to get user purchase status');
            return reply.status(500).send({
                error: 'Internal server error',
                message: 'Failed to retrieve purchase status',
            });
        }
    },

    /**
     * POST /api/sale/reset (Admin only - for testing)
     * Reset the flash sale to initial state
     */
    async reset(request: FastifyRequest, reply: FastifyReply) {
        try {
            await flashSaleService.reset();
            return reply.status(200).send({
                success: true,
                message: 'Flash sale has been reset',
            });
        } catch (error) {
            request.log.error(error, 'Failed to reset flash sale');
            return reply.status(500).send({
                error: 'Internal server error',
                message: 'Failed to reset flash sale',
            });
        }
    },
};
