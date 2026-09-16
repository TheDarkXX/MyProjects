import { fetchFullStoryForHeadline } from './server/services/gfinSearcher.js';

async function runTest() {
  console.log("🚀 Starting gfin test with 7-source aggregation & 8000-char window...");
  
  const ticker = 'AVGO';
  const headline = "AVGO โตระเบิด 86% แต่กูรูเตือน 'ระเบิดเวลาความเสี่ยง' ซ่อนอยู่ในชิป AI!";
  const beehiivUrl = "https://wethaiinvest.beehiiv.com/p/avgo-warning"; // Dummy URL
  
  try {
    const result = await fetchFullStoryForHeadline({ ticker, headline, beehiivUrl });
    console.log("\n✅ --- FINAL RESULT --- ✅");
    if (result) {
      console.log(`- Relevant Sources Found: ${result.sourceCount}`);
      console.log(`- Selected Primary Source: ${result.sourceName}`);
      console.log(`- Extracted Word Count: ${result.wordCount}`);
      console.log(`- Content Length (Characters): ${result.fullText.length}`);
      console.log(`- Text Snippet (First 500 chars):\n${result.fullText.slice(0, 500)}...\n`);
      
      if (result.sourceCount > 1) {
        console.log(`🔥 Multi-Source Consensus ACTIVATED! (Sources: ${result.sourceCount})`);
        console.log(`🔥 Full Text Length is ${result.fullText.length} chars (Target up to 8000)`);
      }
    } else {
      console.log("❌ No relevant story found.");
    }
  } catch (err) {
    console.error("❌ Test failed:", err);
  }
}

runTest();
