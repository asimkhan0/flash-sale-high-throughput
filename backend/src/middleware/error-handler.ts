/**
 * Error Handler Middleware
 * Global error handling for the Fastify application
 */

import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';

export function errorHandler(
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply
) {
    request.log.error(error);

    // Handle validation errors
    if (error.validation) {
        return reply.status(400).send({
            error: 'Validation Error',
            message: 'Invalid request parameters',
            details: error.validation,
        });
    }

    // Handle rate limiting
    if (error.statusCode === 429) {
        return reply.status(429).send({
            error: 'Too Many Requests',
            message: 'You are sending too many requests. Please slow down.',
        });
    }

    // Handle Redis connection errors
    if (error.message?.includes('Redis') || error.message?.includes('ECONNREFUSED')) {
        return reply.status(503).send({
            error: 'Service Unavailable',
            message: 'The service is temporarily unavailable. Please try again later.',
        });
    }

    // Default error response
    const statusCode = error.statusCode || 500;
    return reply.status(statusCode).send({
        error: statusCode >= 500 ? 'Internal Server Error' : 'Error',
        message: statusCode >= 500
            ? 'An unexpected error occurred'
            : error.message || 'An error occurred',
    });
}
