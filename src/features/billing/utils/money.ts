// Shared INR formatting for the billing screens.
export const inr = (n: number, opts?: { decimals?: boolean }): string => {
    const min = opts?.decimals ? 2 : 0;
    return `₹ ${(Number.isFinite(n) ? n : 0).toLocaleString('en-IN', { minimumFractionDigits: min, maximumFractionDigits: opts?.decimals ? 2 : 0 })}`;
};
