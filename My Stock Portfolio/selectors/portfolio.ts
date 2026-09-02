type TransactionAsset = 'Stock' | 'ETF' | 'Crypto' | 'Cash' | 'Gold' | 'Forex' | 'Other';

type Tx = {
  portfolio_id: string;
  date: string;
  symbol: string;
  type: 'BUY'|'SELL'|'DEPOSIT'|'WITHDRAW'|'DIVIDEND'|'INTEREST';
  asset: TransactionAsset;
  amount: number;
  price: number;
  fee?: number;
};
type LatestPrices = Record<string, number>;
type Position = {
  symbol: string; shares: number; avgCost: number;
  marketPrice: number; marketValue: number;
  unrealizedPnL: number; unrealizedPnLPct: number; realizedPnL: number;
};
type PortfolioOverview = {
  marketValue: number; cashInflow: number; cashOutflow: number; cashBalance: number;
  invested: number; realizedPnL: number; unrealizedPnL: number; nav: number;
  positions: Position[];
};
export function buildPortfolioSelector(
  transactions: Tx[],
  latestPrices: LatestPrices,
  portfolioId?: string
): PortfolioOverview {
  const txs = portfolioId ? transactions.filter(t => t.portfolio_id === portfolioId) : transactions.slice();
  let cashInflow = 0, cashOutflow = 0, invested = 0, totalFees = 0;
  const positions = new Map<string, { shares: number; totalCost: number; avgCost: number; realizedPnL: number }>();
  for (const t of txs) {
    const fee = t.fee ?? 0; totalFees += fee;

    if (t.type === 'DIVIDEND' || t.type === 'INTEREST') {
        cashInflow += t.amount;
        if (t.symbol && t.symbol !== 'CASH') {
            if (!positions.has(t.symbol)) {
                positions.set(t.symbol, { shares: 0, totalCost: 0, avgCost: 0, realizedPnL: 0 });
            }
            const p = positions.get(t.symbol)!;
            p.realizedPnL += t.amount;
            if (fee > 0) {
                cashOutflow += fee;
                p.realizedPnL -= fee;
            }
        }
        continue;
    }

    const isCash = t.asset === 'Cash' || t.symbol === 'CASH';
    if (isCash) {
      if (t.type === 'DEPOSIT' || (t.type === 'BUY' && isCash)) { cashInflow += t.amount; invested += t.amount; }
      else if (t.type === 'WITHDRAW' || (t.type === 'SELL' && isCash)) { cashOutflow += t.amount; invested -= t.amount; }
      if (fee > 0) cashOutflow += fee;
      continue;
    }
    if (!positions.has(t.symbol)) positions.set(t.symbol, { shares: 0, totalCost: 0, avgCost: 0, realizedPnL: 0 });
    const p = positions.get(t.symbol)!;
    if (t.type === 'BUY') {
      const cost = t.amount * t.price + fee;
      cashOutflow += cost; p.totalCost += cost; p.shares += t.amount; p.avgCost = p.shares > 0 ? p.totalCost / p.shares : 0;
    } else if (t.type === 'SELL') {
      const proceeds = t.amount * t.price - fee; cashInflow += proceeds;
      const costPortion = t.amount * p.avgCost; p.realizedPnL += (proceeds - costPortion);
      p.shares -= t.amount; p.totalCost = Math.max(0, p.totalCost - costPortion);
      p.avgCost = p.shares > 0 ? p.totalCost / p.shares : 0;
    }
  }
  let marketValue = 0, unrealizedPnL = 0; const positionsList: Position[] = [];
  positions.forEach((p, symbol) => {
    if (p.shares <= 0) return; const px = latestPrices[symbol] ?? 0;
    const mv = p.shares * px; const upnl = mv - p.totalCost; marketValue += mv; unrealizedPnL += upnl;
    positionsList.push({
      symbol, shares: p.shares, avgCost: +p.avgCost.toFixed(6),
      marketPrice: px, marketValue: +mv.toFixed(2), unrealizedPnL: +upnl.toFixed(2),
      unrealizedPnLPct: p.totalCost > 0 ? +((upnl / p.totalCost) * 100).toFixed(2) : 0,
      realizedPnL: +p.realizedPnL.toFixed(2),
    });
  });
  const cashBalance = cashInflow - cashOutflow;
  const nav = marketValue + Math.max(0, cashBalance);
  const realizedPnL = Array.from(positions.values()).reduce((s, p) => s + p.realizedPnL, 0);
  return {
    marketValue: +marketValue.toFixed(2),
    cashInflow: +cashInflow.toFixed(2),
    cashOutflow: +cashOutflow.toFixed(2),
    cashBalance: +cashBalance.toFixed(2),
    invested: +invested.toFixed(2),
    realizedPnL: +realizedPnL.toFixed(2),
    unrealizedPnL: +unrealizedPnL.toFixed(2),
    nav: +nav.toFixed(2),
    positions: positionsList.sort((a,b)=>b.marketValue-a.marketValue),
  };
}