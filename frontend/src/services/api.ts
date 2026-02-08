/**
 * API Service
 * Handles all communication with the flash sale backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface SaleStatus {
    status: 'upcoming' | 'active' | 'ended';
    startsAt: string;
    endsAt: string;
    remainingStock: number;
    totalStock: number;
    productName: string;
    productPrice: number;
    serverTime: string;
}

export interface PurchaseSuccessResponse {
    success: true;
    message: string;
    purchasedAt: string;
}

export interface PurchaseFailureResponse {
    success: false;
    reason: 'already_purchased' | 'out_of_stock' | 'sale_not_active' | 'invalid_user_id';
    message: string;
}

export type PurchaseResponse = PurchaseSuccessResponse | PurchaseFailureResponse;

export interface UserPurchaseStatus {
    hasPurchased: boolean;
    purchasedAt?: string;
}

class ApiService {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    async getSaleStatus(): Promise<SaleStatus> {
        const response = await fetch(`${this.baseUrl}/api/sale/status`);
        if (!response.ok) {
            throw new Error('Failed to fetch sale status');
        }
        return response.json();
    }

    async attemptPurchase(userId: string): Promise<PurchaseResponse> {
        const response = await fetch(`${this.baseUrl}/api/sale/purchase`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId }),
        });
        return response.json();
    }

    async getUserPurchaseStatus(userId: string): Promise<UserPurchaseStatus> {
        const response = await fetch(`${this.baseUrl}/api/sale/purchase/${encodeURIComponent(userId)}`);
        if (!response.ok) {
            throw new Error('Failed to fetch user purchase status');
        }
        return response.json();
    }

    async resetSale(): Promise<void> {
        const response = await fetch(`${this.baseUrl}/api/sale/reset`, {
            method: 'POST',
        });
        if (!response.ok) {
            throw new Error('Failed to reset sale');
        }
    }
}

export const api = new ApiService();
