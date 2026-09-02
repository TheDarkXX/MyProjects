import { AlphaPickItem } from '../types';

// This file now exports the base portfolio definitions for seeding the database.
// The actual holding data (PortfolioItem[]) is dynamically calculated from transactions.
export const basePortfolioSeeds = [
    {
        name: "Doctorbank Growth",
        icon: '🏥',
        color_hex: '#DC2626',
        initial_cash: 32000.00,
        base_currency: 'USD',
        status: 'active',
    },
    {
        name: "Shay's Growth",
        icon: '💹',
        color_hex: '#3B82F6',
        initial_cash: 153142.48,
        base_currency: 'USD',
        status: 'active',
    },
    {
        name: "Shay's Small Cap",
        icon: '📈',
        color_hex: '#22C55E',
        initial_cash: 0, // Original data had negative cash, starting clean.
        base_currency: 'USD',
        status: 'active',
    },
];


export const alphaPickData: AlphaPickItem[] = [
  { company: 'AppLovin Corporation', symbol: 'APP', pickedDate: '11/15/2024', returnPercent: 1430.61, sector: 'Information Technology', rating: 'Hold', holdingPercent: 13.68 },
  { company: 'Celestica Inc.', symbol: 'CLS', pickedDate: '10/16/2024', returnPercent: 826.48, sector: 'Information Technology', rating: 'Strong Buy', holdingPercent: 9.72 },
  { company: 'Sterling Infrastructure, Inc.', symbol: 'STRL', pickedDate: '8/1/2024', returnPercent: 477.05, sector: 'Industrials', rating: 'Strong Buy', holdingPercent: 6.72 },
  { company: 'Powell Industries, Inc.', symbol: 'POWL', pickedDate: '5/15/2024', returnPercent: 444.03, sector: 'Industrials', rating: 'Hold', holdingPercent: 5.94 },
  { company: 'Celestica Inc.', symbol: 'CLS', pickedDate: '11/15/2025', returnPercent: 211.57, sector: 'Information Technology', rating: 'Strong Buy', holdingPercent: 3.22 },
  { company: 'Uber Technologies, Inc.', symbol: 'UBER', pickedDate: '6/1/2024', returnPercent: 162.69, sector: 'Industrials', rating: 'Strong Buy', holdingPercent: 3.18 },
  { company: 'Royal Caribbean Cruises Ltd.', symbol: 'RCL', pickedDate: '3/15/2025', returnPercent: 155.22, sector: 'Consumer Discretionary', rating: 'Hold', holdingPercent: 3.12 },
  { company: 'Credo Technology Group Holding Ltd', symbol: 'CRDO', pickedDate: '2/3/2025', returnPercent: 145.95, sector: 'Information Technology', rating: 'Hold', holdingPercent: 2.97 },
  { company: 'Brinker International, Inc.', symbol: 'EAT', pickedDate: '4/1/2025', returnPercent: 166.05, sector: 'Consumer Discretionary', rating: 'Buy', holdingPercent: 2.73 },
  { company: 'Argan, Inc.', symbol: 'AGX', pickedDate: '10/15/2025', returnPercent: 119.60, sector: 'Industrials', rating: 'Hold', holdingPercent: 2.52 },
  { company: 'Manulife Financial Corporation', symbol: 'MFC', pickedDate: '11/1/2024', returnPercent: 79.43, sector: 'Financials', rating: 'Hold', holdingPercent: 2.46 },
  { company: 'Adtalem Global Education Inc.', symbol: 'ATGE', pickedDate: '7/15/2025', returnPercent: 82.80, sector: 'Consumer Discretionary', rating: 'Strong Buy', holdingPercent: 2.41 },
  { company: 'Corporación América Airports S.A.', symbol: 'CAAP', pickedDate: '5/1/2024', returnPercent: 59.15, sector: 'Industrials', rating: 'Hold', holdingPercent: 2.37 },
  { company: 'T-Mobile US, Inc.', symbol: 'TMUS', pickedDate: '9/15/2024', returnPercent: 65.43, sector: 'Communication Services', rating: 'Strong Buy', holdingPercent: 2.37 },
  { company: 'Green Brick Partners, Inc.', symbol: 'GRBK', pickedDate: '7/17/2024', returnPercent: 24.49, sector: 'Consumer Discretionary', rating: 'Hold', holdingPercent: 2.29 },
  { company: 'Twilio Inc.', symbol: 'TWLO', pickedDate: '2/1/2025', returnPercent: 48.38, sector: 'Information Technology', rating: 'Hold', holdingPercent: 2.28 },
  { company: 'Blue Bird Corporation', symbol: 'BLBD', pickedDate: '5/15/2025', returnPercent: 13.02, sector: 'Industrials', rating: 'Buy', holdingPercent: 2.09 },
  { company: 'Synchrony Financial', symbol: 'SYF', pickedDate: '9/3/2025', returnPercent: 55.04, sector: 'Financials', rating: 'Strong Buy', holdingPercent: 1.91 },
  { company: 'Powell Industries, Inc.', symbol: 'POWL', pickedDate: '10/1/2025', returnPercent: 32.07, sector: 'Industrials', rating: 'Hold', holdingPercent: 1.84 },
  { company: 'SkyWest, Inc.', symbol: 'SKYW', pickedDate: '6/3/2025', returnPercent: 30.29, sector: 'Industrials', rating: 'Strong Buy', holdingPercent: 1.81 },
  { company: 'Berkshire Hathaway Inc.', symbol: 'BRK.B', pickedDate: '7/1/2025', returnPercent: 20.77, sector: 'Financials', rating: 'Hold', holdingPercent: 1.72 },
  { company: 'Carnival Corporation & plc', symbol: 'CCL', pickedDate: '11/1/2025', returnPercent: 39.11, sector: 'Consumer Discretionary', rating: 'Hold', holdingPercent: 1.71 },
];