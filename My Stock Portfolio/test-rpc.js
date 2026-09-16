import https from 'node:https';

// Google News URL Decoder using batchexecute RPC (2024-2026 format)
export async function decodeGoogleNewsUrl(sourceUrl) {
  try {
    const match = sourceUrl.match(/articles\/(CBMi[a-zA-Z0-9_-]+|CAIi[a-zA-Z0-9_-]+)/);
    if (!match) return sourceUrl;
    
    const articleId = match[1];
    
    // Step 1: Fetch the initial page to get signature tokens (sn, f.sid, bl)
    const initRes = await fetch(`https://news.google.com/rss/articles/${articleId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });
    const html = await initRes.text();
    
    // Extract signature parameters
    const signatureMatch = html.match(/data-n-a-sg="([^"]+)"/);
    const timestampMatch = html.match(/data-n-a-ts="([^"]+)"/);
    
    const signature = signatureMatch ? signatureMatch[1] : '';
    const timestamp = timestampMatch ? timestampMatch[1] : '';
    
    // Build batchexecute payload for Fbv4je RPC
    // ["Fbv4je","[\"garturlreq\",[[\"en-US\",\"US\",[\"ARTICLES\",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1],null,null,null,null,null,null,null,null,null,0,0],\"articleId\",timestamp,\"signature\"]]"]
    const reqPayload = JSON.stringify([
      "Fbv4je",
      JSON.stringify(["garturlreq", [["en-US", "US", ["ARTICLES", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 1], null, null, null, null, null, null, null, null, null, 0, 0], articleId, timestamp ? Number(timestamp) : null, signature || null]])
    ]);
    
    const body = `f.req=${encodeURIComponent(JSON.stringify([[JSON.parse(reqPayload)]]))}`;
    
    const rpcRes = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      body
    });
    
    const rpcText = await rpcRes.text();
    const finalUrlMatch = rpcText.match(/\"(https?:\/\/[^\s\"\\\[\]]+)\"/g);
    if (finalUrlMatch) {
      for (const u of finalUrlMatch) {
        const clean = u.replace(/\"/g, '');
        if (!clean.includes('google.com') && !clean.includes('gstatic.com') && clean.startsWith('http')) {
          return clean;
        }
      }
    }
    return sourceUrl;
  } catch (err) {
    console.warn('[decodeGoogleNewsUrl] Error:', err.message);
    return sourceUrl;
  }
}

async function test() {
  const url = 'https://news.google.com/rss/articles/CBMihwJBVV95cUxOa1RmaDJGTEhlc3FCMDhuWlF0Zkd1NE44d3Y3TjhzLWJHOU04UU4zNWVzMTBBbEwyZ3VsWmdMYS1QVGVVTGZfNEJqSnFmbHZUTkJsWGYxLUFkbWsxTHZkbXNuaGRHSFFXS3JIbmIzWFA2SHBXRnpHSmpVMnBRODdMSFBTSFpCQ2ZkRlp3R0lmdndHREgxLTdaUkVXMi1sY1N5VlBpR0s2aFFNdnBTVkloVXplcDg4Y0xpS3FsRUZvZWNtaFJ0ZE05MDNTbmIzWl9sZTRwb3I2enVfd3ZVWE9reHE5b2hrNlUtc3ZyRjJ4Y3gzX3p4R3J2YXpiNzNaYWNaWmF5WGRjdw?oc=5';
  const decoded = await decodeGoogleNewsUrl(url);
  console.log('Original:', url.slice(0, 60));
  console.log('Decoded Target URL:', decoded);
}

test();
