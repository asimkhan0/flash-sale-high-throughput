/**
 * Redis Client Singleton
 * Provides a connection to Redis with automatic reconnection
 */

import Redis from 'ioredis';
import { config } from '../config/index.js';

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
    if (!redisClient) {
        redisClient = new Redis(config.server.redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
                if (times > 3) {
                    console.error('Redis connection failed after 3 retries');
                    return null; // Stop retrying
                }
                return Math.min(times * 200, 2000);
            },
            lazyConnect: true,
        });

        redisClient.on('error', (err) => {
            console.error('Redis connection error:', err.message);
        });

        redisClient.on('connect', () => {
            console.log('Connected to Redis');
        });

        redisClient.on('ready', () => {
            console.log('Redis client ready');
        });
    }

    return redisClient;
};

export const closeRedisConnection = async (): Promise<void> => {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
    }
};

// For testing: allows injecting a mock Redis client
export const setRedisClient = (client: Redis): void => {
    redisClient = client;
};

export const resetRedisClient = (): void => {
    redisClient = null;
};
