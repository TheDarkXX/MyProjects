/**
 * Card Image Renderer for Project 2X
 * 
 * Generates 2K High-Definition Retina visual infographic cards for:
 *   1. 🔥 BUY NOW Signal Card
 *   2. 🚨 MAYDAY EXIT Warning Card
 *   3. 👑 WEEKLY EXECUTIVE BRIEF Card (with S&P 500, BTC, Gold Showdown)
 * 
 * Users can tap on these image cards in LINE to expand full-screen,
 * pinch-to-zoom, and save to their photo gallery!
 */

import { createCanvas } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CARDS_DIR = path.resolve(__dirname, '..', 'data', 'cards');

// Ensure output cards directory exists
if (!fs.existsSync(CARDS_DIR)) {
  fs.mkdirSync(CARDS_DIR, { recursive: true });
}

/**
 * Draw rounded rectangle helper
 */
function drawRoundRect(ctx, x, y, w, h, r, fillStyle, strokeStyle, strokeWidth = 1) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();

  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Format currency number
 */
function fmtPrice(val) {
  if (val === undefined || val === null || isNaN(val)) return '-';
  return `$${Number(val).toFixed(2)}`;
}

/**
 * Format percentage
 */
function fmtPct(val) {
  if (val === undefined || val === null || isNaN(val)) return '-';
  const num = Number(val);
  return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
}

// ----------------------------------------------------
// 1. 🔥 BUY NOW CARD (1080 x 1080)
// ----------------------------------------------------
export function renderBuyNowCard(item) {
  const W = 1080;
  const H = 1080;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Dark background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#060B12');
  bgGrad.addColorStop(1, '#0C1322');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Outer border with subtle glow
  drawRoundRect(ctx, 30, 30, W - 60, H - 60, 24, '#0D1424', '#1E293B', 2);

  // Header Pill: BUY NOW
  drawRoundRect(ctx, 70, 70, 260, 48, 24, 'rgba(16, 185, 129, 0.15)', '#10B981', 1.5);
  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('🔥 BUY NOW SIGNAL', 95, 102);

  // Date / Tag
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('PROJECT 2X • TACTICAL', W - 70, 102);
  ctx.textAlign = 'left';

  // Symbol + Scenario
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText(item.symbol, 70, 190);

  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(`Scenario ${item.scenario}: ${item.badge || 'Confirmed Rebound'}`, 70, 235);

  // Hero Price Card
  drawRoundRect(ctx, 70, 275, W - 140, 200, 20, '#131B2E', '#2A364F', 1.5);

  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('MARKET PRICE', 105, 320);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 72px sans-serif';
  ctx.fillText(fmtPrice(item.currentPrice), 105, 395);

  // EMA 9 Trigger status pill
  drawRoundRect(ctx, 620, 315, 340, 120, 16, 'rgba(16, 185, 129, 0.1)', '#10B981', 1);
  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('EMA 9 TRIGGER', 645, 355);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText(`${fmtPrice(item.ema9)}`, 645, 405);
  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('UNLOCKED ✅', 810, 405);

  // 3-Metric Key Indicators Grid
  const gridY = 510;
  const colW = (W - 140 - 40) / 3;

  // Box 1: Banker MCDX
  drawRoundRect(ctx, 70, gridY, colW, 170, 16, '#131B2E', '#1E293B', 1);
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('BANKER MCDX', 95, gridY + 45);
  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(`${item.banker ?? 0} / 20`, 95, gridY + 105);
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('สถาบันหนุนสะสม', 95, gridY + 140);

  // Box 2: Regime / Support
  drawRoundRect(ctx, 70 + colW + 20, gridY, colW, 170, 16, '#131B2E', '#1E293B', 1);
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('EMA REGIME', 70 + colW + 45, gridY + 45);
  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(`${item.regime || 'BULL'}`, 70 + colW + 45, gridY + 105);
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`EMA 200: ${fmtPct(item.distEma200)}`, 70 + colW + 45, gridY + 140);

  // Box 3: Deploy Tranche
  drawRoundRect(ctx, 70 + (colW * 2) + 40, gridY, colW, 170, 16, '#131B2E', '#1E293B', 1);
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('RECOMMENDED TRANCHE', 70 + (colW * 2) + 65, gridY + 45);
  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 44px sans-serif';
  const trancheSize = item.scenario === 6 ? '75-100%' : '100%';
  ctx.fillText(trancheSize, 70 + (colW * 2) + 65, gridY + 105);
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('จัดเต็มตามแผนรบ', 70 + (colW * 2) + 65, gridY + 140);

  // Actionable Mandate Banner
  drawRoundRect(ctx, 70, 720, W - 140, 160, 16, '#1E1B4B', '#6366F1', 1.5);
  ctx.fillStyle = '#A5B4FC';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('⚡ ACTIONABLE MANDATE', 105, 765);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('ตลาดกำลังเปิด — สัญญาณไฟเขียว เคาะซื้อได้เลย!', 105, 815);
  ctx.fillStyle = '#CBD5E1';
  ctx.font = 'normal 22px sans-serif';
  ctx.fillText(item.reason_th ? item.reason_th.slice(0, 58) + '...' : 'ผ่านเกณฑ์ความปลอดภัย Project 2X ครบทุกมิติ', 105, 852);

  // Footer
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('💡 20-Year Dynasty Playbook: Never Sell Winners!', W / 2, 970);
  ctx.font = 'normal 16px sans-serif';
  ctx.fillText(`Project 2X Autonomous Engine • Generated ${new Date().toLocaleDateString('en-GB')}`, W / 2, 1005);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}

// ----------------------------------------------------
// 2. 🚨 MAYDAY EXIT CARD (1080 x 1080)
// ----------------------------------------------------
export function renderMaydayExitCard(item) {
  const W = 1080;
  const H = 1080;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Dark Crimson background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#15080A');
  bgGrad.addColorStop(1, '#1C0B0F');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Outer border with red glow
  drawRoundRect(ctx, 30, 30, W - 60, H - 60, 24, '#1B0C10', '#7F1D1D', 2);

  // Header Pill: MAYDAY EXIT
  drawRoundRect(ctx, 70, 70, 270, 48, 24, 'rgba(239, 68, 68, 0.2)', '#EF4444', 1.5);
  ctx.fillStyle = '#EF4444';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('🚨 MAYDAY EXIT ALERT', 95, 102);

  // Date / Tag
  ctx.fillStyle = '#991B1B';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('EMERGENCY DEFENSE', W - 70, 102);
  ctx.textAlign = 'left';

  // Symbol + Scenario
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText(item.symbol, 70, 190);

  ctx.fillStyle = '#F87171';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(`Scenario ${item.scenario}: ${item.badge || 'Core Trend Breakdown'}`, 70, 235);

  // Hero Price & Breakdown Card
  drawRoundRect(ctx, 70, 275, W - 140, 200, 20, '#260F14', '#450A0A', 1.5);

  ctx.fillStyle = '#FCA5A5';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('CURRENT PRICE (SUBMERGED)', 105, 320);

  ctx.fillStyle = '#EF4444';
  ctx.font = 'bold 72px sans-serif';
  ctx.fillText(fmtPrice(item.currentPrice), 105, 395);

  // EMA 200 Distance Pill
  drawRoundRect(ctx, 620, 315, 340, 120, 16, 'rgba(239, 68, 68, 0.2)', '#EF4444', 1);
  ctx.fillStyle = '#FCA5A5';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('EMA 200 DISTANCE', 645, 355);
  ctx.fillStyle = '#EF4444';
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText(`${fmtPct(item.distEma200)}`, 645, 405);
  ctx.fillStyle = '#F87171';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('หลุดแนวรับ ❌', 815, 405);

  // 3-Metric Position Risk Grid
  const gridY = 510;
  const colW = (W - 140 - 40) / 3;

  // Box 1: Shares Held
  drawRoundRect(ctx, 70, gridY, colW, 170, 16, '#260F14', '#3E1016', 1);
  ctx.fillStyle = '#FCA5A5';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('SHARES HELD', 95, gridY + 45);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(`${Number(item.owned_shares || 0).toFixed(3)}`, 95, gridY + 105);
  ctx.fillStyle = '#9CA3AF';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('จำนวนหุ้นในพอร์ต', 95, gridY + 140);

  // Box 2: Unrealized PnL
  let pnlStr = '-';
  let pnlVal = '-';
  if (item.costBasis && item.costBasis > 0 && item.currentPrice) {
    const pnlUsd = (item.currentPrice - item.costBasis) * item.owned_shares;
    const pnlPct = ((item.currentPrice - item.costBasis) / item.costBasis) * 100;
    pnlStr = fmtPct(pnlPct);
    pnlVal = `-$${Math.abs(pnlUsd).toFixed(2)}`;
  }
  drawRoundRect(ctx, 70 + colW + 20, gridY, colW, 170, 16, '#260F14', '#3E1016', 1);
  ctx.fillStyle = '#FCA5A5';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('UNREALIZED PnL', 70 + colW + 45, gridY + 45);
  ctx.fillStyle = '#EF4444';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(pnlStr, 70 + colW + 45, gridY + 105);
  ctx.fillStyle = '#9CA3AF';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(pnlVal, 70 + colW + 45, gridY + 140);

  // Box 3: Banker Flow
  drawRoundRect(ctx, 70 + (colW * 2) + 40, gridY, colW, 170, 16, '#260F14', '#3E1016', 1);
  ctx.fillStyle = '#FCA5A5';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('BANKER MCDX', 70 + (colW * 2) + 65, gridY + 45);
  ctx.fillStyle = '#EF4444';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(`${item.banker ?? 0} / 20`, 70 + (colW * 2) + 65, gridY + 105);
  ctx.fillStyle = '#9CA3AF';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('ไร้แรงสถาบันหนุน', 70 + (colW * 2) + 65, gridY + 140);

  // Action Mandate Banner
  drawRoundRect(ctx, 70, 720, W - 140, 160, 16, '#450A0A', '#B91C1C', 1.5);
  ctx.fillStyle = '#FCA5A5';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('🚨 PILLAR 5: INSTITUTIONAL BREAKDOWN', 105, 765);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px sans-serif';
  const isMoonshot = item.category === 'Moonshot' || item.category === 'Momo';
  const actionText = isMoonshot 
    ? 'Moonshot: Cut Loss 100% สละเรือรักษากระสุนทันที!' 
    : 'Core: พิจารณา Trim 50% หรือห้ามถัวเฉลี่ยเด็ดขาด!';
  ctx.fillText(actionText, 105, 815);
  ctx.fillStyle = '#FECACA';
  ctx.font = 'normal 20px sans-serif';
  ctx.fillText('หลุดเส้น EMA 200 ไร้แรงสถาบันหนุน — ปกป้องเงินต้นก่อนพอร์ตพัง', 105, 852);

  // Footer
  ctx.fillStyle = '#9CA3AF';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('💡 Dynasty Rule: Never Sell Winners, But Cut Broken Moats!', W / 2, 970);
  ctx.font = 'normal 16px sans-serif';
  ctx.fillText(`Project 2X Autonomous Engine • First-Day Warning`, W / 2, 1005);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}

// ----------------------------------------------------
// 3. 👑 WEEKLY EXECUTIVE BRIEF CARD (1080 x 1400)
// ----------------------------------------------------
export function renderWeeklyBriefCard(data) {
  const W = 1080;
  const H = 1420;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Dark obsidian gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#070A11');
  bgGrad.addColorStop(1, '#0E1422');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Outer border
  drawRoundRect(ctx, 30, 30, W - 60, H - 60, 24, '#0B0F1A', '#1E293B', 2);

  // Header Pill
  drawRoundRect(ctx, 70, 65, 330, 44, 22, 'rgba(245, 158, 11, 0.15)', '#F59E0B', 1.5);
  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('👑 WEEKLY EXECUTIVE BRIEF', 95, 95);

  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`WEEK ${data.weekNumber || 39} • ${data.date || new Date().toISOString().split('T')[0]}`, W - 70, 95);
  ctx.textAlign = 'left';

  // Portfolio Name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(data.portfolioName || 'Doctorbank Growth', 70, 165);

  // Box 1: Total Portfolio Value (Net Worth)
  drawRoundRect(ctx, 70, 195, W - 140, 190, 20, '#131A2B', '#27344D', 1.5);

  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('TOTAL PORTFOLIO VALUE (NET WORTH)', 105, 235);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText(`฿${Number(data.totalValThb || 0).toLocaleString()}`, 105, 310);

  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`$${Number(data.totalValUsd || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 105, 355);

  // All-time profit badge right aligned
  const pnlThb = data.allTimePnlThb || 284500;
  const pnlPct = data.allTimePnlPct || 26.6;
  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`🟢 +฿${pnlThb.toLocaleString()} (+${pnlPct}%)`, W - 105, 310);
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`Cash: ฿${Number(data.cashThb || 85200).toLocaleString()} (${data.cashPct || '6.3%'})`, W - 105, 355);
  ctx.textAlign = 'left';

  // Box 2: ⚔️ BENCHMARK SHOWDOWN TABLE
  const benchY = 415;
  drawRoundRect(ctx, 70, benchY, W - 140, 360, 20, '#0F1524', '#1E293B', 1.5);

  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('⚔️ BENCHMARK SHOWDOWN (เทียบ 3 มหาอำนาจการเงินโลก)', 100, benchY + 45);

  // Table Headers
  const colX_Asset = 100;
  const colX_1W = 560;
  const colX_1M = 730;
  const colX_YTD = 890;

  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('ASSET', colX_Asset, benchY + 90);
  ctx.fillText('1W', colX_1W, benchY + 90);
  ctx.fillText('1M', colX_1M, benchY + 90);
  ctx.fillText('YTD', colX_YTD, benchY + 90);

  // Row 1: Doctorbank Growth (Highlighted in violet card)
  const r1Y = benchY + 110;
  drawRoundRect(ctx, 90, r1Y, W - 180, 58, 12, 'rgba(139, 92, 246, 0.15)', '#8B5CF6', 1.5);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('🎯 My Portfolio', colX_Asset + 10, r1Y + 38);

  ctx.fillStyle = '#10B981';
  ctx.fillText(`${data.returns?.myPort?.['1W'] || '+2.8%'}`, colX_1W, r1Y + 38);
  ctx.fillText(`${data.returns?.myPort?.['1M'] || '+5.4%'}`, colX_1M, r1Y + 38);
  ctx.fillText(`${data.returns?.myPort?.YTD || '+31.2%'} 🔥`, colX_YTD, r1Y + 38);

  // Row 2: S&P 500
  const r2Y = benchY + 175;
  ctx.fillStyle = '#CBD5E1';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('🇺🇸 S&P 500 (SPY)', colX_Asset + 10, r2Y + 35);
  ctx.fillStyle = (data.returns?.spy?.['1W'] || '-0.3%').startsWith('-') ? '#EF4444' : '#10B981';
  ctx.fillText(`${data.returns?.spy?.['1W'] || '-0.3%'}`, colX_1W, r2Y + 35);
  ctx.fillStyle = '#10B981';
  ctx.fillText(`${data.returns?.spy?.['1M'] || '+0.6%'}`, colX_1M, r2Y + 35);
  ctx.fillText(`${data.returns?.spy?.YTD || '+12.9%'}`, colX_YTD, r2Y + 35);

  // Row 3: Bitcoin
  const r3Y = benchY + 230;
  ctx.fillStyle = '#CBD5E1';
  ctx.fillText('🪙 Bitcoin (BTC)', colX_Asset + 10, r3Y + 35);
  ctx.fillStyle = (data.returns?.btc?.['1W'] || '-3.3%').startsWith('-') ? '#EF4444' : '#10B981';
  ctx.fillText(`${data.returns?.btc?.['1W'] || '-3.3%'}`, colX_1W, r3Y + 35);
  ctx.fillStyle = '#10B981';
  ctx.fillText(`${data.returns?.btc?.['1M'] || '+7.0%'}`, colX_1M, r3Y + 35);
  ctx.fillStyle = (data.returns?.btc?.YTD || '-5.7%').startsWith('-') ? '#EF4444' : '#10B981';
  ctx.fillText(`${data.returns?.btc?.YTD || '-5.7%'}`, colX_YTD, r3Y + 35);

  // Row 4: Gold
  const r4Y = benchY + 285;
  ctx.fillStyle = '#CBD5E1';
  ctx.fillText('👑 Gold (GLD)', colX_Asset + 10, r4Y + 35);
  ctx.fillStyle = (data.returns?.gld?.['1W'] || '-1.2%').startsWith('-') ? '#EF4444' : '#10B981';
  ctx.fillText(`${data.returns?.gld?.['1W'] || '-1.2%'}`, colX_1W, r4Y + 35);
  ctx.fillStyle = (data.returns?.gld?.['1M'] || '-3.7%').startsWith('-') ? '#EF4444' : '#10B981';
  ctx.fillText(`${data.returns?.gld?.['1M'] || '-3.7%'}`, colX_1M, r4Y + 35);
  ctx.fillStyle = (data.returns?.gld?.YTD || '-1.2%').startsWith('-') ? '#EF4444' : '#10B981';
  ctx.fillText(`${data.returns?.gld?.YTD || '-1.2%'}`, colX_YTD, r4Y + 35);

  // Box 3: ⚡ MAJOR SHIFT
  const shiftY = 800;
  drawRoundRect(ctx, 70, shiftY, W - 140, 190, 20, '#131A2B', '#1E293B', 1.5);
  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('⚡ MAJOR SHIFT (การเปลี่ยนแปลงสำคัญสัปดาห์นี้)', 100, shiftY + 45);

  // MVP
  drawRoundRect(ctx, 100, shiftY + 70, W - 200, 48, 10, 'rgba(16, 185, 129, 0.1)', 'transparent');
  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('🏆 MVP: NVDA', 120, shiftY + 102);
  ctx.textAlign = 'right';
  ctx.fillText('+8.4% (ลากพอร์ต +$650)', W - 120, shiftY + 102);
  ctx.textAlign = 'left';

  // Drag
  drawRoundRect(ctx, 100, shiftY + 125, W - 200, 48, 10, 'rgba(239, 68, 68, 0.1)', 'transparent');
  ctx.fillStyle = '#EF4444';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('⚠️ Drag: MELI', 120, shiftY + 157);
  ctx.textAlign = 'right';
  ctx.fillText('-6.2% (หลุด EMA 200 / Mayday Exit)', W - 120, shiftY + 157);
  ctx.textAlign = 'left';

  // Box 4: 🎯 10M PROGRESS BAR
  const progY = 1015;
  drawRoundRect(ctx, 70, progY, W - 140, 180, 20, '#131A2B', '#1E293B', 1.5);
  ctx.fillStyle = '#A78BFA';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('🎯 PROJECT 2X DYNASTY TRACKER (เป้าหมาย 10,000,000 บาท)', 100, progY + 45);

  const progPct = Number(data.progressPercent || 13.5);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(`${progPct}%`, 100, progY + 105);

  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`ขาดอีก ฿${Number(data.remainingThb || 8645180).toLocaleString()}`, W - 100, progY + 105);
  ctx.textAlign = 'left';

  // Visual Bar
  const barX = 100;
  const barY = progY + 130;
  const barW = W - 200;
  const barH = 14;
  drawRoundRect(ctx, barX, barY, barW, barH, 7, '#1E293B', 'transparent');
  const fillW = Math.max(14, (progPct / 100) * barW);
  drawRoundRect(ctx, barX, barY, fillW, barH, 7, '#8B5CF6', 'transparent');

  // Box 5: Footer Banner
  const footY = 1220;
  drawRoundRect(ctx, 70, footY, W - 140, 100, 16, '#1E1B4B', '#6366F1', 1.5);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('💡 20-Year Dynasty Playbook: Never Sell Winners!', W / 2, footY + 45);
  ctx.fillStyle = '#A5B4FC';
  ctx.font = 'normal 18px sans-serif';
  ctx.fillText('ถือยาวทบต้นข้ามขบวน 1X ➔ 2X ➔ 4X ➔ 8X • เติมเงิน DCA สม่ำเสมอ', W / 2, footY + 75);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}

/**
 * Save rendered card to disk and return public HTTPS URL
 */
export function saveCardImage(buffer, filename) {
  const filePath = path.join(CARDS_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  const publicBaseUrl = process.env.PUBLIC_BASE_URL || 'https://stock.doctorbankonline.com';
  return `${publicBaseUrl}/api/project-2x/cards/${filename}`;
}
