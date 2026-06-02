export const round2 = (n: number): number => Number(n.toFixed(2));

export const cents = (dollars: number): number => Math.round(dollars * 100);

export const dollars = (cents: number): number => round2(cents / 100);
