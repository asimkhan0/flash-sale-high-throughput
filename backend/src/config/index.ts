/**
 * Flash Sale Configuration
 * All configurable parameters for the flash sale system
 */

export interface FlashSaleConfig {
    /** Sale start time (ISO 8601 format) */
    startTime: Date;
    /** Sale end time (ISO 8601 format) */
    endTime: Date;
    /** Total stock available for the flash sale */
    totalStock: number;
    /** Product name for the flash sale */
    productName: string;
    /** Product price */
    productPrice: number;
}

export interface ServerConfig {
    port: number;
    host: string;
    redisUrl: string;
    corsOrigin: string;
    rateLimit: {
        max: number;
        timeWindow: string;
    };
}

// Default configuration - can be overridden via environment variables
const getConfig = (): { sale: FlashSaleConfig; server: ServerConfig } => {
    // Default: Sale starts 1 minute from now and lasts for 1 hour
    const defaultStartTime = new Date(Date.now() + 60 * 1000);
    const defaultEndTime = new Date(defaultStartTime.getTime() + 60 * 60 * 1000);

    return {
        sale: {
            startTime: process.env.SALE_START_TIME
                ? new Date(process.env.SALE_START_TIME)
                : defaultStartTime,
            endTime: process.env.SALE_END_TIME
                ? new Date(process.env.SALE_END_TIME)
                : defaultEndTime,
            totalStock: parseInt(process.env.TOTAL_STOCK || '100', 10),
            productName: process.env.PRODUCT_NAME || 'Limited Edition Flash Sale Item',
            productPrice: parseFloat(process.env.PRODUCT_PRICE || '99.99'),
        },
        server: {
            port: parseInt(process.env.PORT || '3001', 10),
            host: process.env.HOST || '0.0.0.0',
            redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
            corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
            rateLimit: {
                max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
                timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
            },
        },
    };
};

export const config = getConfig();

// Redis keys used by the application
export const REDIS_KEYS = {
    STOCK: 'flash-sale:stock',
    PURCHASES: 'flash-sale:purchases',
    PURCHASE_PREFIX: 'flash-sale:purchase:',
} as const;
