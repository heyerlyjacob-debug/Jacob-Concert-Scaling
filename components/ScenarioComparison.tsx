
import React from 'react';
import type { Scenario } from '../types';
import Card from './ui/Card';

interface ScenarioComparisonProps {
    scenarios: Scenario[];
    onRemove: (id: number) => void;
}

const ScenarioCard: React.FC<{ scenario: Scenario; onRemove: (id: number) => void }> = ({ scenario, onRemove }) => {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    };

    const isOver = scenario.summary.differenceAmount >= 0;

    return (
        <div className="bg-brand-gray-800 rounded-lg p-4 flex flex-col relative">
            <button 
                onClick={() => onRemove(scenario.id)}
                className="absolute top-2 right-2 text-brand-gray-500 hover:text-white"
                title="Remove Scenario"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <h4 className="text-lg font-bold text-brand-primary mb-3">{scenario.name}</h4>
            <div className="space-y-2 text-sm flex-grow">
                <p><span className="text-brand-gray-400">Actual Gross:</span> <span className="font-semibold text-white">{formatCurrency(scenario.summary.actualGross)}</span></p>
                <p><span className="text-brand-gray-400">Difference:</span> <span className={`font-semibold ${isOver ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(scenario.summary.differenceAmount)}</span></p>
                <p><span className="text-brand-gray-400">Avg. Price:</span> <span className="font-semibold text-white">{formatCurrency(scenario.summary.averageTicketPrice)}</span></p>
                <div className="pt-2 mt-2 border-t border-brand-gray-700">
                    {scenario.tiers.map(tier => (
                        <p key={tier.tierName}><span className="text-brand-gray-400 w-8 inline-block">{tier.tierName}:</span> <span className="font-semibold text-white">{formatCurrency(tier.price)}</span></p>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ScenarioComparison: React.FC<ScenarioComparisonProps> = ({ scenarios, onRemove }) => {
    if (scenarios.length === 0) {
        return null;
    }

    return (
        <div className="mt-12">
            <h2 className="text-2xl font-bold text-white mb-4">3. Saved Scenarios</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {scenarios.map(scenario => (
                    <ScenarioCard key={scenario.id} scenario={scenario} onRemove={onRemove} />
                ))}
            </div>
        </div>
    );
};

export default ScenarioComparison;
