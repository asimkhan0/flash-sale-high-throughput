/**
 * ResultFeedback Component
 * Displays purchase result feedback to the user
 */

import type { PurchaseResponse } from '../services/api';
import './ResultFeedback.css';

interface ResultFeedbackProps {
    result: PurchaseResponse;
    onDismiss: () => void;
}

export function ResultFeedback({ result, onDismiss }: ResultFeedbackProps) {
    const isSuccess = result.success;

    const getIcon = () => {
        if (isSuccess) return '🎉';

        switch (result.reason) {
            case 'already_purchased':
                return '✅';
            case 'out_of_stock':
                return '😔';
            case 'sale_not_active':
                return '⏰';
            default:
                return '⚠️';
        }
    };

    const getTitle = () => {
        if (isSuccess) return 'Purchase Successful!';

        switch (result.reason) {
            case 'already_purchased':
                return 'Already Purchased';
            case 'out_of_stock':
                return 'Sold Out';
            case 'sale_not_active':
                return 'Sale Not Active';
            default:
                return 'Error';
        }
    };

    return (
        <div className={`result-feedback ${isSuccess ? 'success' : 'failure'}`}>
            <div className="result-icon">{getIcon()}</div>
            <h3 className="result-title">{getTitle()}</h3>
            <p className="result-message">{result.message}</p>
            {isSuccess && result.purchasedAt && (
                <p className="purchase-time">
                    Purchased at: {new Date(result.purchasedAt).toLocaleString()}
                </p>
            )}
            <button className="dismiss-button" onClick={onDismiss}>
                {isSuccess ? 'Great!' : 'Try Again'}
            </button>
        </div>
    );
}
