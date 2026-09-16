import { fetchHtmlWithLargeHeaders } from './server/services/gfinSearcher.js';

async function main() {
  const url = 'https://news.google.com/rss/articles/CBMihwJBVV95cUxOa1RmaDJGTEhlc3FCMDhuWlF0Zkd1NE44d3Y3TjhzLWJHOU04UU4zNWVzMTBBbEwyZ3VsWmdMYS1QVGVVTGZfNEJqSnFmbHZUTkJsWGYxLUFkbWsxTHZkbXNuaGRHSFFXS3JIbmIzWFA2SHBXRnpHSmpVMnBRODdMSFBTSFpCQ2ZkRlp3R0lmdndHREgxLTdaUkVXMi1sY1N5VlBpR0s2aFFNdnBTVkloVXplcDg4Y0xpS3FsRUZvZWNtaFJ0ZE05MDNTbmIzWl9sZTRwb3I2enVfd3ZVWE9reHE5b2hrNlUtc3ZyRjJ4Y3gzX3p4R3J2YXpiNzNaYWNaWmF5WGRjdw?oc=5';
  const res = await fetchHtmlWithLargeHeaders(url);
  console.log('HTML Length:', res.html.length);
  
  // Look for c-wiz or data attributes or scripts
  const cWizMatch = res.html.match(/data-n-au="([^"]+)"/);
  console.log('cWiz data-n-au:', cWizMatch?.[1]);
  
  // Look for jsname or direct publisher url
  const pubUrlMatch = res.html.match(/\"(https?:\/\/[^\"]*(?:stocktwits|tradingview|bloomberg|reuters|cnbc)[^\"]*)\"/i);
  console.log('pubUrlMatch:', pubUrlMatch?.[1]);
  
  // Look for all URLs
  const allUrls = [...res.html.matchAll(/(https?:\/\/[a-zA-Z0-9.\-_/]+)/g)]
    .map(m => m[1])
    .filter(u => !u.includes('google') && !u.includes('gstatic') && !u.includes('schema.org') && !u.includes('w3.org'));
  console.log('Distinct non-google URLs found:', [...new Set(allUrls)].slice(0, 10));
}

main().catch(console.error);
