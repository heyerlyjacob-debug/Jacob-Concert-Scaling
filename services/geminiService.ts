
import { GoogleGenAI, Type } from "@google/genai";
import type { PricingResult, Tier } from '../types';
import { SEAT_COUNTS, TOTAL_SEATS } from '../constants';

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

export const calculateTicketPrices = async (targetGross: number, premiumShare: number): Promise<PricingResult> => {
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
                            },
                        },
                    },
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
