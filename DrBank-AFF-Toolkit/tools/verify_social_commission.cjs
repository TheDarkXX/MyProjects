const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const utilsPath = path.resolve(__dirname, '../src/common/utils.js');
const utilsCode = fs.readFileSync(utilsPath, 'utf8');

const sandbox = {
  window: {},
  document: {},
  chrome: {},
  URL
};
vm.runInNewContext(utilsCode, sandbox);
const ns = sandbox.window.DrBankAFF;

assert(ns, 'DrBankAFF namespace must exist');

// 1. Test Case 1: itemId = 24645325790 (Seagull Egg Boiler, Offer Base Price 584.00 THB)
const mockOffer24645325790String = {
  error: 0,
  data: {
    item_id: 24645325790,
    shop_id: 1485671971,
    batch_item_for_item_card_full: {
      itemid: 24645325790,
      shopid: 1485671971,
      name: 'Seagull เครื่องต้มไข่ รุ่น อีซี่ ไลฟ์ (4 ฟอง)',
      price: 58400000,
      price_max: 58400000,
      sold: 7000,
      historical_sold: 40000,
      stock: 140,
      is_official_shop: true
    },
    commission_rate_detail: {
      total_commission_rate: '10%',
      seller_commission_detail: {
        default_exist_commission_rate: '8%',
        live_streaming_default_exist_commission_rate: '10.4%'
      },
      shopee_commission_detail: {
        default_exist_commission_rate: '2%',
        live_streaming_default_exist_commission_rate: '0%'
      }
    }
  }
};

const parsed1 = ns.extractSocialMediaCommission(mockOffer24645325790String);
assert.strictEqual(parsed1.itemId, '24645325790');
assert.strictEqual(parsed1.offerPrice, 584);
assert.strictEqual(parsed1.extraRate, 8);
assert.strictEqual(parsed1.baseRate, 2);
assert.strictEqual(parsed1.totalRate, 10);
assert.strictEqual(parsed1.liveExtraRate, 10.4);

const comm1 = ns.calculateCommission({
  price: parsed1.offerPrice,
  baseRate: parsed1.baseRate,
  extraRate: parsed1.extraRate,
  capTHB: 250,
  whtRate: 3.0,
  realDailyAdCostTHB: 107
});
assert.strictEqual(+comm1.extraComm.toFixed(2), 46.72);
assert.strictEqual(+comm1.baseComm.toFixed(2), 11.68);
assert.strictEqual(+comm1.grossComm.toFixed(2), 58.4);
assert.strictEqual(+comm1.netComm.toFixed(2), 56.65);

// Also verify integer 1e5 format (8000 = 8%, 10400 = 10.4%, 2000 = 2%)
const mockOffer24645325790Int = {
  data: {
    batch_item_for_item_card_full: { itemid: 24645325790, shopid: 1485671971, price: 58400000 },
    commission_rate_detail: {
      total_commission_rate: 10000,
      seller_commission_detail: {
        default_exist_commission_rate: 8000,
        live_streaming_default_exist_commission_rate: 10400
      },
      shopee_commission_detail: {
        default_exist_commission_rate: 2000,
        live_streaming_default_exist_commission_rate: 0
      }
    }
  }
};
const parsed1Int = ns.extractSocialMediaCommission(mockOffer24645325790Int);
assert.strictEqual(parsed1Int.extraRate, 8);
assert.strictEqual(parsed1Int.baseRate, 2);
assert.strictEqual(parsed1Int.totalRate, 10);

// Verify /product/list fallback does NOT produce 12.4% (72.42) or 18%
const listMixedLive = {
  item_id: '24645325790',
  seller_commission_rate: '10.4%',
  default_commission_rate: '10%'
};
const listFallback1 = ns.extractListCommissionFallback(listMixedLive, true, 'Seagull เครื่องต้มไข่');
assert.strictEqual(listFallback1.extraRate, 8);
assert.strictEqual(listFallback1.baseRate, 2);
assert.strictEqual(listFallback1.totalRate, 10);

const listStandard = {
  item_id: '24645325790',
  seller_commission_rate: '8%',
  default_commission_rate: '10%'
};
const listFallback2 = ns.extractListCommissionFallback(listStandard, true, 'Seagull เครื่องต้มไข่');
assert.strictEqual(listFallback2.extraRate, 8);
assert.strictEqual(listFallback2.baseRate, 2);
assert.strictEqual(listFallback2.totalRate, 10);

// 2. Test Case 2: itemId = 40215480650 (Seagull Soy Milk Maker, Offer Base 1,363 vs Net Selling 1,322)
const mockOffer40215480650 = {
  data: {
    batch_item_for_item_card_full: {
      itemid: 40215480650,
      shopid: 1485671971,
      name: 'Seagull เครื่องทำน้ำเต้าหู้ 1.2 ลิตร (ครีม)',
      price: 136300000,
      sold: 1000,
      historical_sold: 30000,
      is_official_shop: true
    },
    commission_rate_detail: {
      total_commission_rate: '10%',
      seller_commission_detail: {
        default_exist_commission_rate: '8%',
        live_streaming_default_exist_commission_rate: '10.4%'
      },
      shopee_commission_detail: {
        default_exist_commission_rate: '2%',
        live_streaming_default_exist_commission_rate: '0%'
      }
    }
  }
};
const parsed2 = ns.extractSocialMediaCommission(mockOffer40215480650);
const comm2Offer = ns.calculateCommission({
  price: parsed2.offerPrice,
  baseRate: parsed2.baseRate,
  extraRate: parsed2.extraRate,
  capTHB: 250,
  whtRate: 3.0,
  realDailyAdCostTHB: 107
});
assert.strictEqual(parsed2.offerPrice, 1363);
assert.strictEqual(+comm2Offer.extraComm.toFixed(2), 109.04);
assert.strictEqual(+comm2Offer.baseComm.toFixed(2), 27.26);
assert.strictEqual(+comm2Offer.grossComm.toFixed(2), 136.3);
assert.strictEqual(+comm2Offer.netComm.toFixed(2), 132.21);

const comm2AfterVoucher = ns.calculateCommission({
  price: 1322,
  baseRate: parsed2.baseRate,
  extraRate: parsed2.extraRate,
  capTHB: 250,
  whtRate: 3.0,
  realDailyAdCostTHB: 107
});
assert.strictEqual(+comm2AfterVoucher.grossComm.toFixed(2), 132.2);
assert.strictEqual(+comm2AfterVoucher.netComm.toFixed(2), 128.23);

// 3. Test URL ID parsing & Base Cap 250 THB
const u1 = ns.parseShopeeIds('https://shopee.co.th/Seagull-i.1485671971.24645325790?sp_atk=123');
assert.strictEqual(u1.shopId, '1485671971');
assert.strictEqual(u1.itemId, '24645325790');

const u2 = ns.parseShopeeIds('https://shopee.co.th/product/1485671971/40215480650');
assert.strictEqual(u2.shopId, '1485671971');
assert.strictEqual(u2.itemId, '40215480650');

const capped = ns.calculateCommission({ price: 20000, baseRate: 2, extraRate: 5, capTHB: 250, whtRate: 3 });
assert.strictEqual(capped.isCapped, true);
assert.strictEqual(capped.baseComm, 250);
assert.strictEqual(capped.extraComm, 1000);

console.log('✅ ALL SOCIAL MEDIA COMMISSION & PARSER ASSERTIONS PASSED:');
console.log(`   - 24645325790 (฿584.00): Social Media = ${parsed1.extraRate}% + ${parsed1.baseRate}% = ฿${comm1.grossComm.toFixed(2)} (Net ฿${comm1.netComm.toFixed(2)}) | Live/Video = ${parsed1.liveExtraRate}% (isolated)`);
console.log(`   - 40215480650 (฿1,363.00 AFF): Social Media = ${parsed2.extraRate}% + ${parsed2.baseRate}% = ฿${comm2Offer.grossComm.toFixed(2)} (Net ฿${comm2Offer.netComm.toFixed(2)})`);
console.log(`   - 40215480650 (฿1,322.00 After Voucher): ฿${comm2AfterVoucher.grossComm.toFixed(2)} (Net ฿${comm2AfterVoucher.netComm.toFixed(2)})`);
