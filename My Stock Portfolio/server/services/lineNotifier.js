/**
 * LINE Messaging API Push Notification Service for Project 2X
 * 
 * Sends actionable buy/sell signals directly to the user's LINE account.
 * Requires:
 *   - LINE_CHANNEL_ACCESS_TOKEN (Long-lived Channel Access Token)
 *   - LINE_USER_ID (Recipient LINE User ID, e.g. U1234567890abcdef...)
 */

const LINE_PUSH_API = 'https://api.line.me/v2/bot/message/push';

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

/**
 * Format BUY NOW notification message for LINE
 */
export function formatBuyNowMessage(item) {
  const symbol = item.symbol;
  const scenario = item.scenario;
  const badge = item.badge || 'Buy Signal';
  const price = fmtPrice(item.currentPrice);
  const ema9 = fmtPrice(item.ema9);
  const banker = item.banker ?? 0;

  // Determine tranche recommendation based on scenario & regime
  let tranche = '100% Size';
  if (scenario === 6) {
    tranche = '75 - 100% Size';
  } else if (scenario === 8 && item.regime !== 'BULL') {
    tranche = '75% Size';
  }

  const lines = [
    `🔥 BUY NOW! — ${symbol}`,
    `━━━━━━━━━━━━━━━━━━`,
    `📊 Scenario ${scenario}: ${badge}`,
    `💰 ราคา: ${price}`,
    `⚡ EMA 9 Trigger: ${ema9} (Unlocked ✅)`,
    `🏦 Banker MCDX: ${banker}/20`,
    `🎯 ขนาดไม้: ${tranche}`,
    ``,
    `⏰ ตลาดกำลังเปิด — เคาะซื้อได้เลย!`
  ];

  return lines.join('\n');
}

/**
 * Format MAYDAY EXIT notification message for LINE
 */
export function formatMaydayExitMessage(item) {
  const symbol = item.symbol;
  const scenario = item.scenario;
  const badge = item.badge || 'Mayday Exit';
  const price = fmtPrice(item.currentPrice);
  const distEma200 = fmtPct(item.distEma200);
  const banker = item.banker ?? 0;
  const shares = item.owned_shares ? Number(item.owned_shares).toFixed(3) : '0';

  let bankerDesc = 'ไร้สถาบัน';
  if (banker > 0) bankerDesc = 'สถาบันบางตา';

  let positionDesc = `📦 ถือ: ${shares} หุ้น`;
  if (item.costBasis && item.costBasis > 0 && item.currentPrice) {
    const pnlUsd = (item.currentPrice - item.costBasis) * item.owned_shares;
    const pnlPct = ((item.currentPrice - item.costBasis) / item.costBasis) * 100;
    positionDesc += ` (${fmtPct(pnlPct)} / ${pnlUsd >= 0 ? '+' : ''}$${pnlUsd.toFixed(2)})`;
  }

  const lines = [
    `🚨 MAYDAY EXIT — ${symbol}`,
    `━━━━━━━━━━━━━━━━━━`,
    `⚠️ Scenario ${scenario}: ${badge}`,
    `📉 ราคา: ${price} (EMA 200: ${distEma200})`,
    `🏦 Banker: ${banker}/20 (${bankerDesc})`,
    positionDesc,
    ``,
    `❌ สละเรือ / Cut Loss ทันที!`
  ];

  return lines.join('\n');
}

/**
 * Send a push message to LINE
 * 
 * @param {string} text - Message text
 * @param {object} options
 * @param {string} [options.token] - LINE Channel Access Token (defaults to env)
 * @param {string} [options.to] - Recipient LINE User ID (defaults to env)
 * @param {boolean} [options.dryRun] - If true, only print without sending
 * @returns {Promise<{ success: boolean, skipped?: boolean, reason?: string, data?: any }>}
 */
export async function sendLineMessage(text, { token, to, dryRun = false } = {}) {
  const channelAccessToken = token || process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const targetUserId = to || process.env.LINE_USER_ID;

  if (dryRun) {
    console.log(`[LineNotifier:DRY-RUN] To: ${targetUserId || 'NOT_CONFIGURED'}\n${text}\n`);
    return { success: true, dryRun: true };
  }

  if (!channelAccessToken || !targetUserId) {
    console.warn('[LineNotifier] ⚠️ Skipped: LINE credentials not configured yet (waiting for User LINE bot token).');
    return {
      success: false,
      skipped: true,
      reason: 'LINE credentials missing in environment variables (LINE_CHANNEL_ACCESS_TOKEN or LINE_USER_ID)'
    };
  }

  try {
    const res = await fetch(LINE_PUSH_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${channelAccessToken}`
      },
      body: JSON.stringify({
        to: targetUserId,
        messages: [{
          type: 'text',
          text
        }]
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[LineNotifier] ❌ LINE Push Error (${res.status}):`, errText);
      return {
        success: false,
        status: res.status,
        reason: errText
      };
    }

    console.log(`[LineNotifier] ✅ Push message sent successfully to LINE (${targetUserId})`);
    return { success: true };
  } catch (error) {
    console.error('[LineNotifier] ❌ Network/Fetch error:', error.message);
    return {
      success: false,
      reason: error.message
    };
  }
}

/**
 * Send batch of formatted signal messages with rate-limiting pauses
 */
export async function sendBatchSignals(messages, { token, to, dryRun = false, delayMs = 300 } = {}) {
  const results = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const res = await sendLineMessage(msg, { token, to, dryRun });
    results.push(res);
    if (i < messages.length - 1 && !dryRun) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return results;
}
