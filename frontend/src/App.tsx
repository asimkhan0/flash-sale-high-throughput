/**
 * Flash Sale App
 * Main application component
 */

import { useState, useCallback, useMemo } from 'react';
import { useSaleStatus } from './hooks/useSaleStatus';
import { api } from './services/api';
import type { PurchaseResponse } from './services/api';
import { SaleStatus } from './components/SaleStatus';
import { PurchaseForm } from './components/PurchaseForm';
import { ResultFeedback } from './components/ResultFeedback';
import './App.css';

function App() {
  const { status, loading: statusLoading, error } = useSaleStatus({ pollInterval: 1000 });
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<PurchaseResponse | null>(null);

  const handlePurchase = useCallback(async (userId: string) => {
    setPurchasing(true);
    try {
      const result = await api.attemptPurchase(userId);
      setPurchaseResult(result);
    } catch (err) {
      setPurchaseResult({
        success: false,
        reason: 'sale_not_active',
        message: 'An error occurred. Please try again.',
      });
    } finally {
      setPurchasing(false);
    }
  }, []);

  const handleDismissResult = useCallback(() => {
    setPurchaseResult(null);
  }, []);

  const { isDisabled, disabledReason } = useMemo(() => {
    if (!status) return { isDisabled: true, disabledReason: 'Loading...' };

    switch (status.status) {
      case 'upcoming':
        return { isDisabled: true, disabledReason: 'Sale has not started yet' };
      case 'ended':
        return { isDisabled: true, disabledReason: 'Sale has ended' };
      case 'active':
        if (status.remainingStock === 0) {
          return { isDisabled: true, disabledReason: 'Sold out' };
        }
        return { isDisabled: false, disabledReason: undefined };
      default:
        return { isDisabled: true, disabledReason: 'Unknown status' };
    }
  }, [status]);

  if (statusLoading && !status) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading flash sale...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error-container">
          <h2>⚠️ Connection Error</h2>
          <p>{error}</p>
          <p className="error-hint">
            Make sure the backend server is running on port 3001
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">⚡ Flash Sale</h1>
        <p className="app-subtitle">Limited time offer - Don't miss out!</p>
      </header>

      <main className="app-main">
        {purchaseResult ? (
          <ResultFeedback
            result={purchaseResult}
            onDismiss={handleDismissResult}
          />
        ) : (
          <>
            {status && <SaleStatus status={status} />}
            <PurchaseForm
              onPurchase={handlePurchase}
              disabled={isDisabled}
              disabledReason={disabledReason}
              loading={purchasing}
            />
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>One item per customer • All sales final</p>
      </footer>
    </div>
  );
}

export default App;
