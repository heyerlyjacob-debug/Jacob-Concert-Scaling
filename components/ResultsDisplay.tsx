
import React, { useState, useEffect } from 'react';
import type { PricingResult } from '../types';
import Card from './ui/Card';
import Spinner from './ui/Spinner';

interface ResultsDisplayProps {
    pricingResult: PricingResult | null;
    isLoading: boolean;
    error: string | null;
    onSaveScenario: () => void;
}

const SummaryMetric: React.FC<{ label: string; value: string; className?: string }> = ({ label, value, className }) => (
    <div className="flex flex-col">
        <span className="text-sm text-brand-gray-400">{label}</span>
        <span className={`text-xl font-bold text-white ${className}`}>{value}</span>
    </div>
);

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ pricingResult, isLoading, error, onSaveScenario }) => {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (copied) {
            const timer = setTimeout(() => setCopied(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [copied]);

    const copyToClipboard = () => {
        if (!pricingResult) return;
        const { tiers, summary } = pricingResult;
        let text = `Pricing Scenario\n`;
        text += `Target Gross: ${formatCurrency(summary.targetGross)}\n`;
        text += `Actual Gross: ${formatCurrency(summary.actualGross)}\n`;
        text += `Difference: ${formatCurrency(summary.differenceAmount)} (${summary.differencePercent.toFixed(2)}%)\n\n`;
        text += `Tier\tSeats\tPrice\tSubtotal\n`;
        tiers.forEach(tier => {
            text += `${tier.tierName}\t${tier.seatCount}\t${formatCurrency(tier.price)}\t${formatCurrency(tier.subtotal)}\n`;
        });
        navigator.clipboard.writeText(text);
        setCopied(true);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    };

    if (isLoading) {
        return <Card><div className="flex flex-col items-center justify-center min-h-[300px]"><Spinner /><p className="mt-4 text-brand-gray-300">AI is calculating prices...</p></div></Card>;
    }

    if (error) {
        return <Card><div className="text-center min-h-[300px] flex flex-col justify-center items-center"><p className="text-red-400 font-semibold">Error</p><p className="mt-2 text-brand-gray-300">{error}</p></div></Card>;
    }
    
    if (!pricingResult) {
        return <Card><div className="text-center min-h-[300px] flex flex-col justify-center items-center"><p className="text-brand-gray-400">Your results will appear here.</p></div></Card>;
    }

    const { tiers, summary } = pricingResult;
    const isOver = summary.differenceAmount >= 0;

    return (
        <Card>
            <h2 className="text-2xl font-bold text-white mb-4">2. AI-Generated Results</h2>
            
            <div className="bg-brand-gray-800 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <SummaryMetric label="Target Gross" value={formatCurrency(summary.targetGross)} />
                    <SummaryMetric label="Actual Gross" value={formatCurrency(summary.actualGross)} />
                    <SummaryMetric label="Avg. Ticket Price" value={formatCurrency(summary.averageTicketPrice)} />
                    <SummaryMetric label="Price Spread" value={formatCurrency(summary.priceSpread)} />
                </div>
                 <div className="mt-4 pt-4 border-t border-brand-gray-700 text-center">
                    <p className="text-sm text-brand-gray-400">Difference from Target</p>
                    <p className={`text-2xl font-bold ${isOver ? 'text-green-400' : 'text-red-400'}`}>
                        {isOver ? '+' : ''}{formatCurrency(summary.differenceAmount)} 
                        <span className="text-lg ml-2">({isOver ? '+' : ''}{summary.differencePercent.toFixed(2)}%)</span>
                    </p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-brand-gray-700">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide">Tier</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-right">Seat Count</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-right">Price</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-right">Subtotal Gross</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-gray-700">
                        {tiers.map((tier, index) => (
                            <tr key={tier.tierName} className={index === 0 || index === 1 ? 'bg-brand-primary/10' : ''}>
                                <td className="p-3 font-bold text-brand-primary">{tier.tierName}</td>
                                <td className="p-3 text-right text-brand-gray-300">{tier.seatCount}</td>
                                <td className="p-3 text-right font-semibold text-white">{formatCurrency(tier.price)}</td>
                                <td className="p-3 text-right text-brand-gray-300">{formatCurrency(tier.subtotal)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-4">
                <button
                    onClick={onSaveScenario}
                    className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-md transition-colors"
                >
                    Save Scenario
                </button>
                <button
                    onClick={copyToClipboard}
                    className="flex-1 bg-brand-gray-600 hover:bg-brand-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors"
                >
                    {copied ? 'Copied to Clipboard!' : 'Copy as Text'}
                </button>
            </div>
        </Card>
    );
};

export default ResultsDisplay;
