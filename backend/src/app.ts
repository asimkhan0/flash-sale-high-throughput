/**
 * Flash Sale Backend Application
 * Main entry point for the Fastify server
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config/index.js';
import { saleRoutes } from './routes/sale.routes.js';
import { errorHandler } from './middleware/error-handler.js';
import { flashSaleService } from './services/flash-sale.service.js';
import { getRedisClient, closeRedisConnection } from './utils/redis.js';

// Create Fastify instance
const fastify = Fastify({
    logger: {
        level: process.env.LOG_LEVEL || 'info',
        transport: process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
    },
});

// Build the application
async function buildApp() {
    // Register CORS
    await fastify.register(cors, {
        origin: config.server.corsOrigin,
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: true,
    });

    // Register rate limiting
    await fastify.register(rateLimit, {
        max: config.server.rateLimit.max,
        timeWindow: config.server.rateLimit.timeWindow,
        errorResponseBuilder: () => ({
            error: 'Too Many Requests',
            message: 'You are sending too many requests. Please slow down.',
        }),
    });

    // Register Swagger for API documentation
    await fastify.register(swagger, {
        openapi: {
            openapi: '3.0.0',
            info: {
                title: 'Flash Sale API',
                description: 'High-throughput flash sale backend API with Redis-based atomic operations',
                version: '1.0.0',
            },
            servers: [
                {
                    url: `http://${config.server.host}:${config.server.port}`,
                    description: 'Development server',
                },
            ],
            tags: [
                { name: 'sale', description: 'Flash sale operations' },
                { name: 'admin', description: 'Admin operations' },
            ],
        },
    });

    // Register Swagger UI
    await fastify.register(swaggerUi, {
        routePrefix: '/docs',
        uiConfig: {
            docExpansion: 'list',
            deepLinking: true,
        },
    });

    // Set error handler
    fastify.setErrorHandler(errorHandler);

    // Health check endpoint
    fastify.get('/health', async () => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
    }));

    // Register sale routes
    await fastify.register(saleRoutes, { prefix: '/api/sale' });

    return fastify;
}

// Start the server
async function start() {
    try {
        // Build the app
        await buildApp();

        // Connect to Redis
        const redis = getRedisClient();
        await redis.connect();

        // Initialize the flash sale
        await flashSaleService.initialize();

        // Start listening
        await fastify.listen({
            port: config.server.port,
            host: config.server.host,
        });

        console.log(`
╔════════════════════════════════════════════════════════════╗
║                    FLASH SALE SERVER                       ║
╠════════════════════════════════════════════════════════════╣
║  Server:     http://${config.server.host}:${config.server.port}                        ║
║  Sale Start: ${config.sale.startTime.toISOString()}            ║
║  Sale End:   ${config.sale.endTime.toISOString()}            ║
║  Stock:      ${config.sale.totalStock} items                                   ║
╚════════════════════════════════════════════════════════════╝
    `);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

// Graceful shutdown
async function shutdown() {
    console.log('\nShutting down gracefully...');
    await fastify.close();
    await closeRedisConnection();
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Export for testing
export { buildApp, fastify, start };

// Start the server when run directly
const isDirectRun = process.argv[1]?.includes('app');
if (isDirectRun) {
    start();
}
