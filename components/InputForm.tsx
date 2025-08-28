
import React from 'react';
import Card from './ui/Card';

interface InputFormProps {
    targetGross: number;
    setTargetGross: (value: number) => void;
    premiumShare: number;
    setPremiumShare: (value: number) => void;
    onCalculate: () => void;
    isLoading: boolean;
}

const InputForm: React.FC<InputFormProps> = ({ targetGross, setTargetGross, premiumShare, setPremiumShare, onCalculate, isLoading }) => {
    
    const handleGrossChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        setTargetGross(Number(value));
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    return (
        <Card>
            <h2 className="text-2xl font-bold text-white mb-6">1. Set Your Targets</h2>
            <div className="space-y-6">
                <div>
                    <label htmlFor="target-gross" className="block text-sm font-medium text-brand-gray-300 mb-2">Target Gross Potential</label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-gray-400">$</span>
                        <input
                            type="text"
                            id="target-gross"
                            value={targetGross.toLocaleString()}
                            onChange={handleGrossChange}
                            className="w-full bg-brand-gray-700 border border-brand-gray-600 rounded-md py-2 pl-7 pr-4 text-white focus:ring-brand-primary focus:border-brand-primary"
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="premium-share" className="block text-sm font-medium text-brand-gray-300 mb-2">Premium Revenue Share ({premiumShare}%)</label>
                    <p className="text-xs text-brand-gray-400 mb-3">Percentage of revenue from P1 & P2 tiers.</p>
                    <input
                        type="range"
                        id="premium-share"
                        min="20"
                        max="80"
                        step="1"
                        value={premiumShare}
                        onChange={(e) => setPremiumShare(Number(e.target.value))}
                        className="w-full h-2 bg-brand-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                    />
                </div>
            </div>
            <button
                onClick={onCalculate}
                disabled={isLoading}
                className="mt-8 w-full bg-brand-primary hover:bg-brand-secondary disabled:bg-brand-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition-all duration-200 flex items-center justify-center"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Calculating...
                    </>
                ) : (
                    'Calculate Prices'
                )}
            </button>
        </Card>
    );
};

export default InputForm;
