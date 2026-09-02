import { Transaction } from '../types';

interface SeedTransaction {
    portfolioName: "Shay's Growth" | "Shay's Small Cap" | "Doctorbank Growth";
    date: string;
    symbol: string;
    asset: Transaction['asset'];
    quantity: number;
    avgCost: number;
    stockType: Transaction['stockType'];
}

// This data represents the original static holdings for the two portfolios.
// It's converted into a list of BUY transactions to seed the database.
// A default date is used as the original data didn't have transaction dates.
export const seedTransactions: SeedTransaction[] = [
    // Shay's Growth Portfolio
    { portfolioName: "Shay's Growth", date: "2025-01-01T12:00:00Z", symbol: 'APP', asset: 'Stock', quantity: 2195, avgCost: 7.97, stockType: 'Compound' },
    { portfolioName: "Shay's Growth", date: "2025-01-01T12:00:00Z", symbol: 'CLS', asset: 'Stock', quantity: 1813, avgCost: 12.01, stockType: 'Compound' },
    { portfolioName: "Shay's Growth", date: "2025-01-01T12:00:00Z", symbol: 'STRL', asset: 'Stock', quantity: 641, avgCost: 35.61, stockType: 'Compound' },
    { portfolioName: "Shay's Growth", date: "2025-01-01T12:00:00Z", symbol: 'POWL', asset: 'Stock', quantity: 387, avgCost: 46.12, stockType: 'Compound' },
    { portfolioName: "Shay's Growth", date: "2025-01-01T12:00:00Z", symbol: 'UBER', asset: 'Stock', quantity: 235, avgCost: 29.89, stockType: 'Compound' },
    { portfolioName: "Shay's Growth", date: "2025-01-01T12:00:00Z", symbol: 'RCL', asset: 'Stock', quantity: 167, avgCost: 59.87, stockType: 'Compound' },
    { portfolioName: "Shay's Growth", date: "2025-01-01T12:00:00Z", symbol: 'CRDO', asset: 'Stock', quantity: 1475, avgCost: 11.87, stockType: 'Compound' },
    { portfolioName: "Shay's Growth", date: "2025-01-01T12:00:00Z", symbol: 'EAT', asset: 'Stock', quantity: 302, avgCost: 28.53, stockType: 'Compound' },
    { portfolioName: "Shay's Growth", date: "2025-01-01T12:00:00Z", symbol: 'AGX', asset: 'Stock', quantity: 359, avgCost: 37.07, stockType: 'Compound' },
    { portfolioName: "Shay's Growth", date: "2025-01-01T12:00:00Z", symbol: 'MFC', asset: 'Stock', quantity: 721, avgCost: 18.91, stockType: 'Compound' },
    { portfolioName: "Shay's Growth", date: "2025-01-01T12:00:00Z", symbol: 'ATGE', asset: 'Stock', quantity: 297, avgCost: 34.03, stockType: 'Compound' },
    { portfolioName: "Shay's Growth", date: "2025-01-01T12:00:00Z", symbol: 'CAAP', asset: 'Stock', quantity: 1063, avgCost: 9.98, stockType: 'Compound' },
    { portfolioName: "Shay's Growth", date: "2025-01-01T12:00:00Z", symbol: 'TMUS', asset: 'Stock', quantity: 82, avgCost: 144.33, stockType: 'Compound' },
    { portfolioName: "Shay's Growth", date: "2025-01-01T12:00:00Z", symbol: 'GRBK', asset: 'Stock', quantity: 318, avgCost: 41.74, stockType: 'Compound' },
    { portfolioName: "Shay's Growth", date: "2025-01-01T12:00:00Z", symbol: 'TWLO', asset: 'Stock', quantity: 204, avgCost: 65.59, stockType: 'Compound' },
    { portfolioName: "Shay's Growth", date: "2025-01-01T12:00:00Z", symbol: 'BLBD', asset: 'Stock', quantity: 457, avgCost: 20.32, stockType: 'Compound' },
    { portfolioName: "Shay's Growth", date: "2025-01-01T12:00:00Z", symbol: 'SYF', asset: 'Stock', quantity: 299, avgCost: 30.82, stockType: 'Compound' },
    { portfolioName: "Shay's Growth", date: "2025-01-01T12:00:00Z", symbol: 'SKYW', asset: 'Stock', quantity: 153, avgCost: 44.59, stockType: 'Compound' },
    { portfolioName: "Shay's Growth", date: "2025-01-01T12:00:00Z", symbol: 'BRK.B', asset: 'Stock', quantity: 18, avgCost: 337.37, stockType: 'Compound' },
    { portfolioName: "Shay's Growth", date: "2025-01-01T12:00:00Z", symbol: 'CCL', asset: 'Stock', quantity: 435, avgCost: 11.23, stockType: 'Compound' },

    // Shay's Small Cap Portfolio
    { portfolioName: "Shay's Small Cap", date: "2025-01-01T12:00:00Z", symbol: 'CLS', asset: 'Stock', quantity: 236, avgCost: 55.42, stockType: 'Small Cap' },
    { portfolioName: "Shay's Small Cap", date: "2025-01-01T12:00:00Z", symbol: 'RCL', asset: 'Stock', quantity: 21, avgCost: 132.84, stockType: 'Small Cap' },
    { portfolioName: "Shay's Small Cap", date: "2025-01-01T12:00:00Z", symbol: 'EAT', asset: 'Stock', quantity: 88, avgCost: 32.53, stockType: 'Small Cap' },
    { portfolioName: "Shay's Small Cap", date: "2025-01-01T12:00:00Z", symbol: 'AGX', asset: 'Stock', quantity: 51, avgCost: 49.69, stockType: 'Small Cap' },
    { portfolioName: "Shay's Small Cap", date: "2025-01-01T12:00:00Z", symbol: 'ATGE', asset: 'Stock', quantity: 56, avgCost: 42.61, stockType: 'Small Cap' },
    { portfolioName: "Shay's Small Cap", date: "2025-01-01T12:00:00Z", symbol: 'TWLO', asset: 'Stock', quantity: 46, avgCost: 62.46, stockType: 'Small Cap' },
    { portfolioName: "Shay's Small Cap", date: "2025-01-01T12:00:00Z", symbol: 'BLBD', asset: 'Stock', quantity: 68, avgCost: 33.43, stockType: 'Small Cap' },
    { portfolioName: "Shay's Small Cap", date: "2025-01-01T12:00:00Z", symbol: 'SYF', asset: 'Stock', quantity: 57, avgCost: 38.07, stockType: 'Small Cap' },
    { portfolioName: "Shay's Small Cap", date: "2025-01-01T12:00:00Z", symbol: 'POWL', asset: 'Stock', quantity: 14, avgCost: 121.23, stockType: 'Small Cap' },
    { portfolioName: "Shay's Small Cap", date: "2025-01-01T12:00:00Z", symbol: 'SKYW', asset: 'Stock', quantity: 28, avgCost: 59.82, stockType: 'Small Cap' },
    { portfolioName: "Shay's Small Cap", date: "2025-01-01T12:00:00Z", symbol: 'BRK.B', asset: 'Stock', quantity: 5, avgCost: 395.95, stockType: 'Small Cap' },
    { portfolioName: "Shay's Small Cap", date: "2025-01-01T12:00:00Z", symbol: 'CCL', asset: 'Stock', quantity: 139, avgCost: 14.18, stockType: 'Small Cap' },
    
    // Doctorbank Growth
    { portfolioName: "Doctorbank Growth", date: "2025-02-01T12:00:00Z", symbol: 'STRL', asset: 'Stock', quantity: 100, avgCost: 38.50, stockType: 'Compound' },
    { portfolioName: "Doctorbank Growth", date: "2025-02-15T12:00:00Z", symbol: 'POWL', asset: 'Stock', quantity: 50, avgCost: 48.20, stockType: 'Compound' },
    { portfolioName: "Doctorbank Growth", date: "2025-03-10T12:00:00Z", symbol: 'BLBD', asset: 'Stock', quantity: 200, avgCost: 21.75, stockType: 'Compound' },
    { portfolioName: "Doctorbank Growth", date: "2025-04-05T12:00:00Z", symbol: 'AGX', asset: 'Stock', quantity: 150, avgCost: 39.00, stockType: 'Compound' }
];