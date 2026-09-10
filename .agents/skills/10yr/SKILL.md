---
name: 10yr
description: "10-Year & Max Lifetime Historical OHLCV Price Backfill for My Stock Portfolio"
---
# ⚡ Skill: `/10yr` (10-Year Historical Price Backfill)

## Objective
Fast, high-density backfill of 10-year (or Max Lifetime IPO) historical daily OHLCV candlestick data for any stock, ETF, crypto, or benchmark in My Stock Portfolio.

> 📖 **Check Index First:** Always check [INDEX.md](file:///c:/My%20Claw/MyProjects/.agents/skills/10yr/INDEX.md) (or [HISTORICAL_INDEX.md](file:///c:/My%20Claw/MyProjects/My%20Stock%20Portfolio/HISTORICAL_INDEX.md)) before backfilling to avoid duplicate runs. Currently **92 symbols (558,189 bars)** are already backfilled to Max Lifetime IPO!

---

## 🚀 How to Execute

### Mode 1: Automated Backfill via Node Scripts
When the user types `/10yr` or `/10yr [symbols...]`:

1. **If no symbols specified (Full Core & Watchlist Sync):**
   - Run TradingView Watchlist 87 symbols (Max Lifetime All-Time back to IPO / 1927):
     ```bash
     node server/scripts/backfill_watchlist_87.js
     ```
   - Run Project 2X 13 symbols:
     ```bash
     node server/scripts/backfill_10y.js
     ```
   - Run Portfolio & Benchmarks 12 symbols:
     ```bash
     node server/scripts/backfill_portfolio_and_refs.js
     ```

2. **If specific symbols specified (e.g. `/10yr TSLA AAPL`):**
   - Run direct backfill for those symbols starting from `1927-01-01` (or IPO) to today using `fetchYahooHistorical` with batch transaction insertion into SQLite table `historical_prices`.

3. **Deploy & Sync to Production VPS:**
   - SCP updated scripts to VPS and execute:
     ```powershell
     scp server/scripts/backfill_watchlist_87.js root@185.250.38.247:/root/stock-portfolio/server/scripts/
     ssh root@185.250.38.247 "node /root/stock-portfolio/server/scripts/backfill_watchlist_87.js"
     ```

---

## 📊 Historical Data Limitations (Yahoo Finance Benchmark)

| Timeframe Resolution | Maximum Historical Range | Use Case |
|---|---|---|
| **1 Day (`1d`)** | **All-Time (30–45 Years back to IPO)** | Tactical Chart, EMA 200, 10Y Backfill, TWR |
| **1 Hour (`1h`)** | **730 Days (~2 Years)** | Swing Trading, Weekly Trend |
| **5m / 15m / 30m** | **60 Days** | Day Trading, Intraday Breakouts |
| **1 Minute (`1m`)** | **8 Days Max** | Scalping, High-Frequency Flow |

---

## 🛡️ Iron Rules for Historical Sync

1. **Single Bulk Fetch:** Always use a single API request per symbol covering the entire date range. Never loop month-by-month.
2. **SQLite Transaction:** Always wrap multiple row inserts in `db.transaction()` to ensure single-disk sync (~5ms per 2,500 bars).
3. **Pacing:** Maintain at least 600ms pause between symbols to avoid Yahoo 429 rate limit.
4. **All 8 Columns:** Always store all 8 columns: `(symbol, date, price, open, high, low, close, volume)` with zero NULLs.
