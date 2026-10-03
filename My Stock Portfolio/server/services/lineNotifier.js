/**
 * LINE Messaging API Notification Service for Project 2X
 * 
 * Sends actionable buy/sell signals and weekly executive briefs directly to LINE.
 * Supports both:
 *   1. LINE Flex Message (Native Vector UI Widget — clean, crisp, dark mode, high contrast)
 *   2. HD Image Card (Full-screen lightbox viewer with pinch-to-zoom)
 *   3. Text Message (Compact copy-paste fallback)
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
 * Format BUY NOW notification message for LINE (Text fallback)
 */
export function formatBuyNowMessage(item) {
  const symbol = item.symbol;
  const scenario = item.scenario;
  const badge = item.badge || 'Buy Signal';
  const price = fmtPrice(item.currentPrice);
  const ema9 = fmtPrice(item.ema9);
  const banker = item.banker ?? 0;
  const shares = Number(item.owned_shares || 0);
  const targetShares = item.target_shares ? Number(item.target_shares) : null;
  const progressPct = item.progress_percent !== undefined && item.progress_percent !== null 
    ? Number(item.progress_percent) 
    : (targetShares && targetShares > 0 ? (shares / targetShares) * 100 : null);

  let tranche = '100% Size';
  if (scenario === 6) {
    tranche = '75 - 100% Size';
  } else if (scenario === 8 && item.regime !== 'BULL') {
    tranche = '75% Size';
  }

  // 1. Recheck holding status and provide tailored advice
  let holdingStatus = '';
  let actionGuide = '⏰ ตลาดกำลังเปิด — เคาะซื้อได้เลย!';

  if (shares <= 0.001) {
    holdingStatus = `📦 สถานะพอร์ต: ยังไม่มีหุ้นในพอร์ต (0 หุ้น)`;
    actionGuide = `🎯 คำแนะนำ: สับไกเปิดสถานะไม้แรก (${tranche})`;
  } else if (progressPct !== null && progressPct >= 100) {
    holdingStatus = `📦 สถานะพอร์ต: มีครบโควตา 100% แล้ว (${shares.toFixed(3)} หุ้น)`;
    actionGuide = `⚠️ คำแนะนำ: โควตาเต็มแล้ว! นั่งทับมือ ห้ามซื้อเพิ่มเด็ดขาด รันเทรนด์ตาม Dynasty`;
  } else if (progressPct !== null) {
    holdingStatus = `📦 สถานะพอร์ต: มีอยู่แล้ว ${shares.toFixed(3)} หุ้น (${progressPct.toFixed(1)}% ของเป้า)`;
    actionGuide = `🎯 คำแนะนำ: จังหวะสะสมไม้เพิ่มตามโควตา (${tranche})`;
  } else {
    holdingStatus = `📦 สถานะพอร์ต: มีอยู่แล้ว ${shares.toFixed(3)} หุ้น`;
    actionGuide = `🎯 คำแนะนำ: เคาะซื้อสะสมเพิ่ม (${tranche})`;
  }

  const lines = [
    `🔥 BUY NOW! — ${symbol}`,
    `━━━━━━━━━━━━━━━━━━`,
    `📊 Scenario ${scenario}: ${badge}`,
    `💰 ราคา: ${price}`,
    `⚡ EMA 9 Trigger: ${ema9} (Unlocked ✅)`,
    `🏦 Banker MCDX: ${banker}/20`,
    holdingStatus,
    ``,
    actionGuide
  ];

  return lines.join('\n');
}

/**
 * Format MAYDAY EXIT notification message for LINE (Text fallback)
 */
export function formatMaydayExitMessage(item) {
  const symbol = item.symbol;
  const scenario = item.scenario;
  const badge = item.badge || 'Mayday Exit';
  const price = fmtPrice(item.currentPrice);
  const distEma200 = fmtPct(item.distEma200);
  const banker = item.banker ?? 0;
  const shares = Number(item.owned_shares || 0);
  const category = item.category || 'Core';

  let bankerDesc = 'ไร้สถาบัน';
  if (banker > 0) bankerDesc = 'สถาบันบางตา';

  // 1. Recheck holding status: If NOT owned, NEVER tell to cut loss!
  if (shares <= 0.001) {
    return [
      `🔪 FALLING KNIFE ALERT — ${symbol} (${category})`,
      `━━━━━━━━━━━━━━━━━━`,
      `⚠️ สัญญาณอันตราย: หลุดเส้น EMA 200 ลึก (${distEma200})`,
      `💰 ราคา: ${price}`,
      `🏦 Banker MCDX: ${banker}/20 (${bankerDesc})`,
      `📦 สถานะพอร์ต: ยังไม่มีหุ้นตัวนี้ในพอร์ต`,
      ``,
      `📋 วินัยปกป้องเงินต้น:`,
      `❌ ห้ามรับมีดเด็ดขาด! ถือเงินสด 100% รอสะเด็ดน้ำรอตั้งลำใหม่`
    ].join('\n');
  }

  // 2. If Owned: Differentiate advice between Core vs Moonshot
  let positionDesc = `📦 ถือ: ${shares.toFixed(3)} หุ้น`;
  if (item.costBasis && item.costBasis > 0 && item.currentPrice) {
    const pnlUsd = (item.currentPrice - item.costBasis) * shares;
    const pnlPct = ((item.currentPrice - item.costBasis) / item.costBasis) * 100;
    positionDesc += ` (${fmtPct(pnlPct)} / ${pnlUsd >= 0 ? '+' : ''}$${pnlUsd.toFixed(2)})`;
  }

  let actionAdvice = '';
  if (category === 'Moonshot' || category === 'Momo') {
    actionAdvice = '🛡️ [Moonshot]: หลุด EMA 200 ไร้สถาบัน — Cut Loss 100% สละเรือรักษากระสุนทันที!';
  } else {
    actionAdvice = '🛡️ [Core ทัพหลวง]: พิจารณา Trim 50% หรือ Freeze ห้ามถัวเฉลี่ยเด็ดขาดจนกว่าสะเด็ดน้ำ!';
  }

  const lines = [
    `🚨 MAYDAY ALERT — ${symbol} (${category})`,
    `━━━━━━━━━━━━━━━━━━`,
    `⚠️ เสาที่ 5: Institutional Breakdown (${badge})`,
    `📉 ราคา: ${price} (หลุด EMA 200: ${distEma200})`,
    `🏦 Banker MCDX: ${banker}/20 (${bankerDesc})`,
    positionDesc,
    ``,
    `📋 วินัยปกป้องเงินต้น:`,
    actionAdvice
  ];

  return lines.join('\n');
}

/**
 * 👑 Format WEEKLY EXECUTIVE BRIEF as a LINE Flex Message Bubble
 * (Clean, crisp, readable, dark-mode widget that the user loves!)
 */
export function formatWeeklyBriefFlex(data) {
  const portfolioName = data.portfolioName || 'Doctorbank Growth';
  const weekNumber = data.weekNumber || 39;
  const now = new Date();
  const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const bkkDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const bkkDay = bkkDate.getDate();
  const bkkMonth = TH_MONTHS[bkkDate.getMonth()];
  const bkkYear = bkkDate.getFullYear();
  const bkkHours = String(bkkDate.getHours()).padStart(2, '0');
  const bkkMins = String(bkkDate.getMinutes()).padStart(2, '0');
  const dateTimeStr = data.dateTime || `${bkkDay} ${bkkMonth} ${bkkYear} ${bkkHours}:${bkkMins}`;

  const totalValThb = Number(data.totalValThb || 0);
  const totalValUsd = Number(data.totalValUsd || 0);
  const pnlThb = Number(data.allTimePnlThb || 0);
  const pnlPct = Number(data.allTimePnlPct || 0);

  const ret1W = data.returns?.myPort?.['1W'] || '+1.5%';
  const ret1M = data.returns?.myPort?.['1M'] || '+11.8%';
  const retYtd = data.returns?.myPort?.YTD || '+66.8%';
  const pnl1WThb = data.returns?.myPort?.['1W_THB'] || '';
  const pnl1MThb = data.returns?.myPort?.['1M_THB'] || '';
  const pnlYtdThb = data.returns?.myPort?.['YTD_THB'] || '';

  const mvp = data.mvp || { symbol: 'NVDA', pct7d: '+8.4%', impact: '+$650' };
  const drag = data.drag || { symbol: 'MELI', pct7d: '-6.2%', impact: '-$55' };

  const progPct = Number(data.progressPercent || 13.5);
  const remainingThb = Math.max(0, Number(data.remainingThb || 0));
  const remainingFormatted = remainingThb > 1000000 
    ? `${(remainingThb / 1000000).toFixed(2)}M`
    : `${(remainingThb / 1000).toFixed(0)}K`;

  return {
    type: 'bubble',
    size: 'giga',
    styles: {
      header: { backgroundColor: '#0B0E14' },
      body: { backgroundColor: '#0F131D' },
      footer: { backgroundColor: '#0B0E14' }
    },
    header: {
      type: 'box',
      layout: 'vertical',
      paddingBottom: 'none',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '👑 WEEKLY EXECUTIVE BRIEF',
              weight: 'bold',
              color: '#F59E0B',
              size: 'xs',
              flex: 0
            },
            {
              type: 'text',
              text: `W${weekNumber} • ${dateTimeStr}`,
              color: '#94A3B8',
              size: 'xs',
              align: 'end',
              flex: 1
            }
          ]
        },
        {
          type: 'text',
          text: portfolioName,
          weight: 'bold',
          size: 'xl',
          color: '#FFFFFF',
          margin: 'sm'
        }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        // 1. Total Portfolio Value Box
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#171D2D',
          cornerRadius: 'md',
          paddingAll: 'md',
          contents: [
            {
              type: 'text',
              text: 'TOTAL PORTFOLIO VALUE',
              size: 'xs',
              color: '#94A3B8',
              weight: 'bold'
            },
            {
              type: 'text',
              text: `฿${totalValThb.toLocaleString()}`,
              size: '3xl',
              color: '#FFFFFF',
              weight: 'bold',
              margin: 'xs'
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'sm',
              contents: [
                {
                  type: 'text',
                  text: `$${totalValUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                  size: 'sm',
                  color: '#94A3B8',
                  gravity: 'bottom',
                  flex: 0
                },
                {
                  type: 'text',
                  text: `${pnlThb >= 0 ? '🟢' : '🔴'} ${pnlThb >= 0 ? '+' : ''}฿${Math.abs(pnlThb).toLocaleString()} (${pnlPct >= 0 ? '+' : ''}${pnlPct}%)`,
                  size: 'lg',
                  color: pnlPct >= 0 ? '#10B981' : '#EF4444',
                  weight: 'bold',
                  align: 'end',
                  gravity: 'bottom',
                  flex: 1
                }
              ]
            }
          ]
        },
        // 2. Returns 3-Box Strip (1W, 1M, YTD)
        {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              backgroundColor: '#131826',
              cornerRadius: 'sm',
              paddingAll: 'xs',
              paddingTop: 'sm',
              paddingBottom: 'sm',
              flex: 1,
              contents: [
                { type: 'text', text: '1W', size: 'xs', color: '#94A3B8', align: 'center', weight: 'bold' },
                {
                  type: 'text',
                  align: 'center',
                  margin: 'xs',
                  wrap: true,
                  contents: [
                    {
                      type: 'span',
                      text: ret1W,
                      size: 'md',
                      weight: 'bold',
                      color: ret1W.startsWith('-') ? '#EF4444' : '#10B981'
                    },
                    ...(pnl1WThb ? [
                      {
                        type: 'span',
                        text: ` (${pnl1WThb})`,
                        size: 'md',
                        weight: 'bold',
                        color: pnl1WThb.startsWith('-') ? '#EF4444' : '#34D399'
                      }
                    ] : [])
                  ]
                }
              ]
            },
            {
              type: 'box',
              layout: 'vertical',
              backgroundColor: '#131826',
              cornerRadius: 'sm',
              paddingAll: 'xs',
              paddingTop: 'sm',
              paddingBottom: 'sm',
              flex: 1,
              contents: [
                { type: 'text', text: '1M', size: 'xs', color: '#94A3B8', align: 'center', weight: 'bold' },
                {
                  type: 'text',
                  align: 'center',
                  margin: 'xs',
                  wrap: true,
                  contents: [
                    {
                      type: 'span',
                      text: ret1M,
                      size: 'md',
                      weight: 'bold',
                      color: ret1M.startsWith('-') ? '#EF4444' : '#10B981'
                    },
                    ...(pnl1MThb ? [
                      {
                        type: 'span',
                        text: ` (${pnl1MThb})`,
                        size: 'md',
                        weight: 'bold',
                        color: pnl1MThb.startsWith('-') ? '#EF4444' : '#34D399'
                      }
                    ] : [])
                  ]
                }
              ]
            },
            {
              type: 'box',
              layout: 'vertical',
              backgroundColor: '#131826',
              cornerRadius: 'sm',
              paddingAll: 'xs',
              paddingTop: 'sm',
              paddingBottom: 'sm',
              flex: 1,
              contents: [
                { type: 'text', text: 'YTD', size: 'xs', color: '#94A3B8', align: 'center', weight: 'bold' },
                {
                  type: 'text',
                  align: 'center',
                  margin: 'xs',
                  wrap: true,
                  contents: [
                    {
                      type: 'span',
                      text: retYtd,
                      size: 'md',
                      weight: 'bold',
                      color: retYtd.startsWith('-') ? '#EF4444' : '#10B981'
                    },
                    ...(pnlYtdThb ? [
                      {
                        type: 'span',
                        text: ` (${pnlYtdThb})`,
                        size: 'md',
                        weight: 'bold',
                        color: pnlYtdThb.startsWith('-') ? '#EF4444' : '#34D399'
                      }
                    ] : [])
                  ]
                }
              ]
            }
          ]
        },
        // 3. Major Shift Card
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#171D2D',
          cornerRadius: 'md',
          paddingAll: 'md',
          spacing: 'sm',
          contents: [
            { type: 'text', text: '⚡ MAJOR SHIFT', size: 'xs', color: '#CBD5E1', weight: 'bold' },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: `🏆 MVP: ${mvp.symbol}`, size: 'sm', color: '#FFFFFF', weight: 'bold' },
                { type: 'text', text: `${mvp.pct7d} (${mvp.impact || ''})`, size: 'sm', color: '#10B981', align: 'end', weight: 'bold' }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: `⚠️ Drag: ${drag.symbol}`, size: 'sm', color: '#CBD5E1' },
                { type: 'text', text: `${drag.pct7d} (${drag.impact || ''})`, size: 'sm', color: '#EF4444', align: 'end', weight: 'bold' }
              ]
            }
          ]
        },
        // 4. Progress bar to 10M
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: `🎯 เป้า 10 ล้าน (${progPct}%)`, size: 'xs', color: '#CBD5E1', weight: 'bold' },
                { type: 'text', text: `ขาดอีก ฿${remainingFormatted}`, size: 'xs', color: '#F1F5F9', align: 'end', weight: 'bold' }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              backgroundColor: '#1E293B',
              height: '8px',
              cornerRadius: 'md',
              margin: 'sm',
              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  width: `${Math.max(1, Math.min(100, progPct))}%`,
                  backgroundColor: '#8B5CF6',
                  cornerRadius: 'md',
                  contents: [{ type: 'filler' }]
                }
              ]
            }
          ]
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: '💡 20-Year Dynasty: Never Sell Winners!',
          size: 'xs',
          color: '#94A3B8',
          align: 'center'
        }
      ]
    }
  };
}

/**
 * Send a Flex Message to LINE
 */
export async function sendLineFlex(flexBubble, altText = 'Project 2X Notification', { text = null, token, to, dryRun = false } = {}) {
  const channelAccessToken = token || process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const targetUserId = to || process.env.LINE_USER_ID;

  if (dryRun) {
    console.log(`[LineNotifier:DRY-RUN FLEX] To: ${targetUserId || 'NOT_CONFIGURED'}\nAltText: ${altText}\n`);
    return { success: true, dryRun: true };
  }

  if (!channelAccessToken || !targetUserId) {
    console.warn('[LineNotifier] ⚠️ Skipped: LINE credentials not configured.');
    return { success: false, skipped: true };
  }

  const messages = [
    {
      type: 'flex',
      altText,
      contents: flexBubble
    }
  ];

  if (text) {
    messages.push({
      type: 'text',
      text
    });
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
        messages
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[LineNotifier] ❌ LINE Flex Push Error (${res.status}):`, errText);
      return { success: false, status: res.status, reason: errText };
    }

    console.log(`[LineNotifier] ✅ Flex Card push sent successfully to LINE (${targetUserId})`);
    return { success: true };
  } catch (error) {
    console.error('[LineNotifier] ❌ Network error:', error.message);
    return { success: false, reason: error.message };
  }
}

/**
 * Send a push text message to LINE
 */
export async function sendLineMessage(text, { token, to, dryRun = false } = {}) {
  const channelAccessToken = token || process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const targetUserId = to || process.env.LINE_USER_ID;

  if (dryRun) {
    console.log(`[LineNotifier:DRY-RUN] To: ${targetUserId || 'NOT_CONFIGURED'}\n${text}\n`);
    return { success: true, dryRun: true };
  }

  if (!channelAccessToken || !targetUserId) {
    console.warn('[LineNotifier] ⚠️ Skipped: LINE credentials not configured.');
    return { success: false, skipped: true };
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
        messages: [{ type: 'text', text }]
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[LineNotifier] ❌ LINE Push Error (${res.status}):`, errText);
      return { success: false, status: res.status, reason: errText };
    }

    console.log(`[LineNotifier] ✅ Push message sent successfully to LINE (${targetUserId})`);
    return { success: true };
  } catch (error) {
    console.error('[LineNotifier] ❌ Network error:', error.message);
    return { success: false, reason: error.message };
  }
}

/**
 * Send an HD Image message (with optional follow-up text summary) to LINE
 */
export async function sendLineImage(imageUrl, previewUrl = imageUrl, { text = null, token, to, dryRun = false } = {}) {
  const channelAccessToken = token || process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const targetUserId = to || process.env.LINE_USER_ID;

  if (dryRun) {
    console.log(`[LineNotifier:DRY-RUN IMAGE] To: ${targetUserId || 'NOT_CONFIGURED'}\nImage: ${imageUrl}\nText: ${text || 'none'}\n`);
    return { success: true, dryRun: true };
  }

  if (!channelAccessToken || !targetUserId) {
    console.warn('[LineNotifier] ⚠️ Skipped: LINE credentials not configured.');
    return { success: false, skipped: true };
  }

  const messages = [
    {
      type: 'image',
      originalContentUrl: imageUrl,
      previewImageUrl: previewUrl
    }
  ];

  if (text) {
    messages.push({
      type: 'text',
      text
    });
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
        messages
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[LineNotifier] ❌ LINE Image Push Error (${res.status}):`, errText);
      return { success: false, status: res.status, reason: errText };
    }

    console.log(`[LineNotifier] ✅ Image card push sent successfully to LINE (${targetUserId})`);
    return { success: true };
  } catch (error) {
    console.error('[LineNotifier] ❌ Network error:', error.message);
    return { success: false, reason: error.message };
  }
}
