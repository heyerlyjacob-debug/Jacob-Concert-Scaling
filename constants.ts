
export const SEAT_COUNTS: Record<string, number> = {
    P1: 119,
    P2: 465,
    P3: 400,
    P4: 430,
    P5: 76,
};

export const TOTAL_SEATS = Object.values(SEAT_COUNTS).reduce((a, b) => a + b, 0);
