/**
 * Flash Sale Stress Test
 * Run with: k6 run flash-sale.k6.js
 * 
 * This test simulates a flash sale scenario with many concurrent users
 * attempting to purchase a limited stock item.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const successfulPurchases = new Counter('successful_purchases');
const failedPurchases = new Counter('failed_purchases');
const alreadyPurchased = new Counter('already_purchased');
const outOfStock = new Counter('out_of_stock');
const purchaseLatency = new Trend('purchase_latency');
const successRate = new Rate('success_rate');

// Test configuration
export const options = {
    scenarios: {
        flash_sale: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '10s', target: 100 },  // Ramp up to 100 users
                { duration: '30s', target: 500 },  // Ramp up to 500 users
                { duration: '20s', target: 1000 }, // Peak at 1000 users
                { duration: '10s', target: 0 },    // Ramp down
            ],
            gracefulRampDown: '5s',
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<500'],  // 95% of requests should be under 500ms
        http_req_failed: ['rate<0.01'],     // Less than 1% HTTP errors
    },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

/**
 * Setup function - runs once before the test
 */
export function setup() {
    // Reset the flash sale before starting
    const resetRes = http.post(`${BASE_URL}/api/sale/reset`);

    if (resetRes.status !== 200) {
        console.warn('Failed to reset sale, test may have inconsistent results');
    }

    // Get initial status
    const statusRes = http.get(`${BASE_URL}/api/sale/status`);
    const status = JSON.parse(statusRes.body);

    console.log(`\n=== Flash Sale Stress Test ===`);
    console.log(`Initial Stock: ${status.totalStock}`);
    console.log(`Sale Status: ${status.status}`);
    console.log(`==============================\n`);

    return { totalStock: status.totalStock };
}

/**
 * Main test function - runs by each virtual user
 */
export default function (data) {
    // Generate unique user ID for this VU iteration
    const userId = `stress-user-${__VU}-${__ITER}-${Date.now()}`;

    // Attempt purchase
    const startTime = Date.now();
    const purchaseRes = http.post(
        `${BASE_URL}/api/sale/purchase`,
        JSON.stringify({ userId }),
        {
            headers: { 'Content-Type': 'application/json' },
            tags: { name: 'purchase' },
        }
    );
    const duration = Date.now() - startTime;
    purchaseLatency.add(duration);

    const success = check(purchaseRes, {
        'status is 2xx or 4xx': (r) => r.status >= 200 && r.status < 500,
        'has response body': (r) => r.body && r.body.length > 0,
    });

    if (purchaseRes.status === 200) {
        const body = JSON.parse(purchaseRes.body);
        if (body.success) {
            successfulPurchases.add(1);
            successRate.add(true);
        }
    } else if (purchaseRes.status === 409) {
        const body = JSON.parse(purchaseRes.body);
        if (body.reason === 'already_purchased') {
            alreadyPurchased.add(1);
        } else if (body.reason === 'out_of_stock') {
            outOfStock.add(1);
        }
        failedPurchases.add(1);
        successRate.add(false);
    } else if (purchaseRes.status === 403) {
        // Sale not active
        failedPurchases.add(1);
        successRate.add(false);
    } else {
        failedPurchases.add(1);
        successRate.add(false);
    }

    // Small random delay to simulate realistic user behavior
    sleep(Math.random() * 0.5);
}

/**
 * Teardown function - runs once after the test
 */
export function teardown(data) {
    // Get final status
    const statusRes = http.get(`${BASE_URL}/api/sale/status`);
    const status = JSON.parse(statusRes.body);

    console.log(`\n=== Stress Test Results ===`);
    console.log(`Initial Stock: ${data.totalStock}`);
    console.log(`Remaining Stock: ${status.remainingStock}`);
    console.log(`Items Sold: ${data.totalStock - status.remainingStock}`);
    console.log(`===========================\n`);

    // Verify no overselling occurred
    const itemsSold = data.totalStock - status.remainingStock;
    if (itemsSold > data.totalStock) {
        console.error(`CRITICAL: OVERSELLING DETECTED! Sold ${itemsSold} items but only had ${data.totalStock}`);
    } else if (status.remainingStock < 0) {
        console.error(`CRITICAL: Negative stock detected: ${status.remainingStock}`);
    } else {
        console.log('✓ No overselling detected - concurrency controls working correctly');
    }
}
