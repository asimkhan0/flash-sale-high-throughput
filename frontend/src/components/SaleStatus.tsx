/**
 * SaleStatus Component
 * Displays the current status of the flash sale with countdown timer
 */

import { useMemo } from 'react';
import type { SaleStatus as SaleStatusType } from '../services/api';
import './SaleStatus.css';

interface SaleStatusProps {
    status: SaleStatusType;
}

function formatTimeRemaining(targetDate: Date): string {
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();

    if (diff <= 0) return '00:00:00';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(price);
}

export function SaleStatus({ status }: SaleStatusProps) {
    const statusInfo = useMemo(() => {
        switch (status.status) {
            case 'upcoming':
                return {
                    label: 'Coming Soon',
                    color: 'status-upcoming',
                    timeLabel: 'Starts in',
                    targetDate: new Date(status.startsAt),
                };
            case 'active':
                return {
                    label: 'LIVE NOW',
                    color: 'status-active',
                    timeLabel: 'Ends in',
                    targetDate: new Date(status.endsAt),
                };
            case 'ended':
                return {
                    label: 'Sale Ended',
                    color: 'status-ended',
                    timeLabel: '',
                    targetDate: null,
                };
        }
    }, [status.status, status.startsAt, status.endsAt]);

    const stockPercentage = (status.remainingStock / status.totalStock) * 100;
    const isLowStock = stockPercentage > 0 && stockPercentage <= 20;

    return (
        <div className="sale-status">
            <div className={`status-badge ${statusInfo.color}`}>
                {status.status === 'active' && <span className="pulse-dot"></span>}
                {statusInfo.label}
            </div>

            <div className="product-info">
                <h2 className="product-name">{status.productName}</h2>
                <div className="product-price">{formatPrice(status.productPrice)}</div>
            </div>

            {statusInfo.targetDate && (
                <div className="countdown-section">
                    <span className="countdown-label">{statusInfo.timeLabel}</span>
                    <div className="countdown-timer">
                        {formatTimeRemaining(statusInfo.targetDate)}
                    </div>
                </div>
            )}

            <div className="stock-section">
                <div className="stock-info">
                    <span className={`stock-count ${isLowStock ? 'low-stock' : ''}`}>
                        {status.remainingStock}
                    </span>
                    <span className="stock-label">of {status.totalStock} remaining</span>
                </div>
                <div className="stock-bar-container">
                    <div
                        className={`stock-bar ${isLowStock ? 'low-stock' : ''}`}
                        style={{ width: `${stockPercentage}%` }}
                    ></div>
                </div>
                {status.remainingStock === 0 && (
                    <div className="sold-out-badge">SOLD OUT</div>
                )}
            </div>
        </div>
    );
}
