/**
 * PurchaseForm Component
 * Handles user input and purchase button interaction
 */

import { useState } from 'react';
import './PurchaseForm.css';

interface PurchaseFormProps {
    onPurchase: (userId: string) => Promise<void>;
    disabled: boolean;
    disabledReason?: string;
    loading: boolean;
}

export function PurchaseForm({ onPurchase, disabled, disabledReason, loading }: PurchaseFormProps) {
    const [userId, setUserId] = useState('');
    const [inputError, setInputError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedId = userId.trim();
        if (!trimmedId) {
            setInputError('Please enter your email or username');
            return;
        }

        setInputError('');
        await onPurchase(trimmedId);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUserId(e.target.value);
        if (inputError) setInputError('');
    };

    const isDisabled = disabled || loading || !userId.trim();

    return (
        <form className="purchase-form" onSubmit={handleSubmit}>
            <div className="input-group">
                <label htmlFor="userId" className="input-label">
                    Enter your email or username
                </label>
                <input
                    type="text"
                    id="userId"
                    value={userId}
                    onChange={handleInputChange}
                    placeholder="e.g., john@example.com"
                    className={`user-input ${inputError ? 'error' : ''}`}
                    disabled={loading}
                    autoComplete="email"
                />
                {inputError && <span className="input-error">{inputError}</span>}
            </div>

            <button
                type="submit"
                className={`buy-button ${loading ? 'loading' : ''}`}
                disabled={isDisabled}
            >
                {loading ? (
                    <>
                        <span className="spinner"></span>
                        Processing...
                    </>
                ) : disabled ? (
                    disabledReason || 'Unavailable'
                ) : (
                    <>
                        <span className="button-icon">🛒</span>
                        Buy Now
                    </>
                )}
            </button>

            {disabled && disabledReason && (
                <p className="disabled-message">{disabledReason}</p>
            )}
        </form>
    );
}
