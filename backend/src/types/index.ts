/**
 * Type definitions for the Flash Sale System
 */

export type SaleStatus = 'upcoming' | 'active' | 'ended';

export interface SaleStatusResponse {
    status: SaleStatus;
    startsAt: string;
    endsAt: string;
    remainingStock: number;
    totalStock: number;
    productName: string;
    productPrice: number;
    serverTime: string;
}

export type PurchaseFailureReason =
    | 'already_purchased'
    | 'out_of_stock'
    | 'sale_not_active'
    | 'invalid_user_id';

export interface PurchaseRequest {
    userId: string;
}

export interface PurchaseSuccessResponse {
    success: true;
    message: string;
    purchasedAt: string;
}

export interface PurchaseFailureResponse {
    success: false;
    reason: PurchaseFailureReason;
    message: string;
}

export type PurchaseResponse = PurchaseSuccessResponse | PurchaseFailureResponse;

export interface UserPurchaseStatusResponse {
    hasPurchased: boolean;
    purchasedAt?: string;
}

export interface PurchaseRecord {
    userId: string;
    purchasedAt: Date;
}

// Service layer types
export interface InventoryResult {
    success: boolean;
    remainingStock: number;
}

export interface PurchaseCheckResult {
    hasPurchased: boolean;
    purchasedAt?: Date;
}
