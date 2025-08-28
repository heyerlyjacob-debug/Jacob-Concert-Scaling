
import React, { useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// =================================================================
// BUNDLED MODULE: constants.ts
// =================================================================

const SEAT_COUNTS: Record<string, number> = {
    P1: 119,
    P2: 465,
    P3: 400,
    P4: 430,
    P5: 76,
};

const TOTAL_SEATS = Object.values(SEAT_COUNTS).reduce((a, b) => a + b, 0);

// =================================================================
// BUNDLED MODULE: types.ts
// =================================================================

interface Tier {
    tierName: string;
    seatCount: number;
    price: number;
    subtotal: number;
}

interface PricingResult {
    tiers: Tier[];
    summary: {
        targetGross: number;
        actualGross: number;
        differenceAmount: number;
        differencePercent: number;
        averageTicketPrice: number;
        priceSpread: number;
    };
}

interface Scenario extends PricingResult {
    id: number;
    name: string;
}

// =================================================================
// BUNDLED MODULE: services/geminiService.ts
// =================================================================

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

function createPrompt(targetGross: number, premiumShare: number): string {
    return `
You are an expert concert promoter specializing in ticket pricing optimization. Your task is to calculate ticket prices for a concert venue with 5 pricing tiers to meet specific financial goals.

**Venue Seating:**
- P1: ${SEAT_COUNTS.P1} seats
- P2: ${SEAT_COUNTS.P2} seats
- P3: ${SEAT_COUNTS.P3} seats
- P4: ${SEAT_COUNTS.P4} seats
- P5: ${SEAT_COUNTS.P5} seats
- Total Sellable Seats: ${TOTAL_SEATS}

**Financial Targets:**
- Target Gross Potential: $${targetGross.toLocaleString()}
- Premium Revenue Share: ${premiumShare}% (This is the percentage of the Target Gross Potential that should come from the sum of P1 and P2 revenue).

**Pricing Rules (MUST be followed strictly):**
1.  **Price Format:** All ticket prices must end in .95.
2.  **Price Increments:** Prices must be in increments of $5 (e.g., $24.95, $29.95, $34.95).
3.  **Minimum Price:** The lowest ticket price (P5) must be at least $19.95.
4.  **P1-P2 Spread:** The price for P1 must be exactly $20.00 higher than the price for P2.
5.  **Price Hierarchy:** Prices must be in descending order: P1 > P2 > P3 > P4 > P5. There should be a reasonable price drop between each tier.
6.  **Gross Revenue Goal:** The final calculated total gross revenue (sum of seats * price for all tiers) must be as close as possible to the Target Gross Potential of $${targetGross.toLocaleString()}.
7.  **Premium Share Goal:** The combined revenue from P1 and P2 tiers ((P1 seats * P1 price) + (P2 seats * P2 price)) must be as close as possible to ${premiumShare}% of the final calculated total gross revenue.

**Output Format:**
Provide your response as a JSON object containing a single key "tiers" which is an array of objects. Each object in the array should represent a pricing tier and have the following properties:
- "tier": The tier name (string, e.g., "P1").
- "price": The calculated ticket price (number).

Do not output anything other than the JSON object.
`;
}

const calculateTicketPrices = async (targetGross: number, premiumShare: number): Promise<PricingResult> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: createPrompt(targetGross, premiumShare),
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        tiers: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    tier: { type: Type.STRING },
                                    price: { type: Type.NUMBER },
                                },
                                required: ["tier", "price"]
                            },
                        },
                    },
                    required: ["tiers"]
                },
            },
        });

        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        
        if (!parsed.tiers || !Array.isArray(parsed.tiers) || parsed.tiers.length !== 5) {
            throw new Error("AI response is not in the expected format.");
        }

        const tierData: { tier: string; price: number }[] = parsed.tiers;
        const tierOrder = ["P1", "P2", "P3", "P4", "P5"];
        
        const tiers: Tier[] = tierOrder.map(tierName => {
            const data = tierData.find(t => t.tier === tierName);
            if (!data) throw new Error(`Missing data for tier ${tierName}`);
            const seatCount = SEAT_COUNTS[tierName];
            return {
                tierName,
                seatCount,
                price: data.price,
                subtotal: seatCount * data.price,
            };
        });

        const actualGross = tiers.reduce((acc, tier) => acc + tier.subtotal, 0);
        const differenceAmount = actualGross - targetGross;
        const differencePercent = (differenceAmount / targetGross) * 100;
        const averageTicketPrice = actualGross / TOTAL_SEATS;
        const priceSpread = tiers[0].price - tiers[tiers.length - 1].price;

        return {
            tiers,
            summary: {
                targetGross,
                actualGross,
                differenceAmount,
                differencePercent,
                averageTicketPrice,
                priceSpread,
            },
        };

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to calculate prices. The AI model may be temporarily unavailable or the request was invalid.");
    }
};

// =================================================================
// BUNDLED MODULE: components/ui/Spinner.tsx
// =================================================================

const Spinner: React.FC = () => {
    return (
        <svg className="animate-spin h-10 w-10 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    );
};

// =================================================================
// BUNDLED MODULE: components/ui/Card.tsx
// =================================================================

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

const Card: React.FC<CardProps> = ({ children, className }) => {
    return (
        <div className={`bg-brand-gray-800/70 backdrop-blur-sm border border-brand-gray-700 rounded-lg shadow-lg p-6 ${className}`}>
            {children}
        </div>
    );
};

// =================================================================
// BUNDLED MODULE: components/InputForm.tsx
// =================================================================

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

// =================================================================
// BUNDLED MODULE: components/ResultsDisplay.tsx
// =================================================================

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

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    };
    
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

// =================================================================
// BUNDLED MODULE: components/ScenarioComparison.tsx
// =================================================================

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
                aria-label={`Remove ${scenario.name}`}
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

// =================================================================
// BUNDLED MODULE: App.tsx
// =================================================================

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

// =================================================================
// APP INITIALIZATION
// =================================================================

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
