/**
 * useSaleStatus Hook
 * Polls the sale status at regular intervals for real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { SaleStatus } from '../services/api';

interface UseSaleStatusOptions {
    pollInterval?: number;
    enabled?: boolean;
}

interface UseSaleStatusResult {
    status: SaleStatus | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useSaleStatus(options: UseSaleStatusOptions = {}): UseSaleStatusResult {
    const { pollInterval = 1000, enabled = true } = options;

    const [status, setStatus] = useState<SaleStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const data = await api.getSaleStatus();
            setStatus(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch sale status');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;

        // Initial fetch
        fetchStatus();

        // Set up polling
        const intervalId = setInterval(fetchStatus, pollInterval);

        return () => clearInterval(intervalId);
    }, [enabled, pollInterval, fetchStatus]);

    return { status, loading, error, refetch: fetchStatus };
}
