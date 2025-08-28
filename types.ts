
export interface Tier {
    tierName: string;
    seatCount: number;
    price: number;
    subtotal: number;
}

export interface PricingResult {
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

export interface Scenario extends PricingResult {
    id: number;
    name: string;
}
