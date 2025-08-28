
import React, { useState, useCallback } from 'react';
import { calculateTicketPrices } from './services/geminiService';
import type { PricingResult, Scenario } from './types';
import InputForm from './components/InputForm';
import ResultsDisplay from './components/ResultsDisplay';
import ScenarioComparison from './components/ScenarioComparison';

const App: React.FC = () => {
    const [targetGross, setTargetGross] = useState<number>(250000);
    const [premiumShare, setPremiumShare] = useState<number>(40);
    const [pricingResult, setPricingResult] = useState<PricingResult | null>(null);
    const [savedScenarios, setSavedScenarios] = useState<Scenario[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleCalculate = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setPricingResult(null);

        try {
            const result = await calculateTicketPrices(targetGross, premiumShare);
            setPricingResult(result);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [targetGross, premiumShare]);

    const handleSaveScenario = useCallback(() => {
        if (pricingResult) {
            const newScenario: Scenario = {
                id: Date.now(),
                name: `Scenario #${savedScenarios.length + 1}`,
                ...pricingResult,
            };
            setSavedScenarios(prev => [...prev, newScenario]);
        }
    }, [pricingResult, savedScenarios.length]);

    const handleRemoveScenario = (id: number) => {
        setSavedScenarios(prev => prev.filter(scenario => scenario.id !== id));
    };

    return (
        <div className="min-h-screen bg-brand-gray-900 text-white font-sans">
            <header className="bg-brand-gray-800/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <h1 className="text-3xl font-bold text-center text-brand-primary">Concert Pricing Scaler</h1>
                    <p className="text-center text-brand-gray-400 mt-1">AI-Powered Ticket Price Optimization</p>
                </div>
            </header>
            
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                       <InputForm
                           targetGross={targetGross}
                           setTargetGross={setTargetGross}
                           premiumShare={premiumShare}
                           setPremiumShare={setPremiumShare}
                           onCalculate={handleCalculate}
                           isLoading={isLoading}
                       />
                    </div>
                    <div className="lg:col-span-2">
                        <ResultsDisplay
                            pricingResult={pricingResult}
                            isLoading={isLoading}
                            error={error}
                            onSaveScenario={handleSaveScenario}
                        />
                    </div>
                </div>

                <ScenarioComparison scenarios={savedScenarios} onRemove={handleRemoveScenario} />
            </main>

            <footer className="text-center py-6 text-brand-gray-500 text-sm">
                <p>Built with React, Tailwind CSS, and the Gemini API.</p>
            </footer>
        </div>
    );
};

export default App;
