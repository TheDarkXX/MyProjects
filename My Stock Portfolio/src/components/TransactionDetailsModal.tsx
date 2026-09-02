import React from 'react';
import { formatToUserTimezone } from '../lib/logging';

// Using a generic object type as the parent's `ApiTransaction` is not exported.
// The structure is based on what's available in `TransactionPage.tsx`.
interface ApiTransaction {
    id: string;
    date: string;
    symbol: string;
    type: 'BUY' | 'SELL';
    asset: string;
    amount: number;
    price: number;
    fee: number | null;
    stock_type: string | null;
    portfolio_name: string;
}

interface TransactionDetailsModalProps {
  transaction: ApiTransaction | null;
  onClose: () => void;
}

const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const DetailRow: React.FC<{ label: string; value: React.ReactNode; className?: string }> = ({ label, value, className }) => (
    <div className={`flex justify-between items-center py-3 border-b border-gray-700 ${className || ''}`}>
        <dt className="text-sm text-gray-400">{label}</dt>
        <dd className="text-sm font-medium text-white text-right font-mono">{value}</dd>
    </div>
);

const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({ transaction, onClose }) => {
  if (!transaction) {
    return null;
  }

  const totalValue = transaction.amount * transaction.price;
  const totalWithFee = totalValue + (transaction.fee || 0);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-details-title"
    >
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
      `}</style>
      <div
        className="bg-[#111827] border border-gray-700 rounded-lg shadow-2xl w-full max-w-lg m-4 p-6 text-white animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center pb-4 border-b border-gray-700">
          <h2 id="transaction-details-title" className="text-xl font-bold">Transaction Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-full"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-6">
          <dl>
            <DetailRow label="Symbol" value={<span className="font-bold text-blue-400">{transaction.symbol}</span>} />
            <DetailRow label="Portfolio" value={transaction.portfolio_name} />
            <DetailRow label="Date & Time" value={formatToUserTimezone(transaction.date, { second: '2-digit' })} />
            <DetailRow label="Type" value={
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${transaction.type === 'BUY' ? 'bg-green-600/30 text-green-300' : 'bg-red-600/30 text-red-300'}`}>
                    {transaction.type}
                </span>}
            />
            <DetailRow label="Asset Class" value={transaction.asset} />
            <DetailRow label="Stock Type" value={transaction.stock_type || 'N/A'} />
            <DetailRow label="Amount / Quantity" value={transaction.amount.toLocaleString()} />
            <DetailRow label="Price per Unit" value={formatCurrency(transaction.price)} />
            <DetailRow label="Transaction Value" value={formatCurrency(totalValue)} />
            <DetailRow label="Fee" value={formatCurrency(transaction.fee)} />
            <DetailRow label="Total Cost / Proceeds" value={<strong className="text-lg">{formatCurrency(totalWithFee)}</strong>} className="border-none pt-4" />
          </dl>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailsModal;